"use client";

import type { AppendMessage, AssistantRuntime } from "@assistant-ui/react";
import { useExternalStoreRuntime } from "@assistant-ui/react";
import type { MessageStreamEvent } from "eve/client";
import { isTurnFailureEvent } from "eve/client";
import type { EveMessage } from "eve/react";
import type { ReactNode } from "react";
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAssistantContext } from "../contexts/AssistantContext";
import type { ChatStatus, StoredSession } from "../lib/chat-session";
import {
  CARRIED_RESULTS_MAX,
  CARRIED_RESULTS_MAX_CHARS,
  CHAT_HEADER,
  type MessageContext,
  PAGE_CONTEXT_HEADER,
  parsePageContextMarker,
} from "../lib/contract";
import { convertEveMessage, restoreEveMessage } from "../lib/convert";
import type { SentAnswers } from "../lib/question-transcript";
import { withQuestionReplies } from "../lib/question-transcript";
import { readPageRecord } from "../lib/reads";
import { describeAssistantError, isUnresumableSession } from "../lib/session-client";
import { endChat } from "../lib/transport";
import { redactPageContext, redactResult, Vault } from "../lib/vault";
import { useAssistantStatus } from "./useAssistantStatus";
import type { PendingInputRequest } from "./useBrowserToolLoop";
import { TURN_SETTLE_MS, useBrowserToolLoop } from "./useBrowserToolLoop";
import { useChatSession } from "./useChatSession";

export type AssistantStatus = ChatStatus;

// sessionStorage is scoped to the tab rather than the sign-in,
// so the key names the deployment and the signed-in user as well as the conversation.
const storageKey = (
  host: string,
  currentUserId: string | undefined,
  conversationId: string,
) =>
  `nb-assistant.session.${encodeURIComponent(host)}.${encodeURIComponent(
    currentUserId ?? "anonymous",
  )}.${encodeURIComponent(conversationId)}`;

interface StoredChat {
  chatId: string;
  session?: StoredSession;
}

type CarriedResult = MessageContext["carriedResults"][number];

function carriedWithin(results: readonly CarriedResult[]): CarriedResult[] {
  const kept: CarriedResult[] = [];
  let chars = 0;
  for (const result of [...results].reverse()) {
    if (kept.length >= CARRIED_RESULTS_MAX) break;
    if (chars + result.content.length > CARRIED_RESULTS_MAX_CHARS) continue;
    kept.unshift(result);
    chars += result.content.length;
  }
  return kept;
}

// The shape must match the agent's CHAT_ID_PATTERN.
function newChatId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCodePoint(...bytes)).replaceAll("+", "-").replaceAll("/", "_");
}

function loadChat(key: string): StoredChat {
  if (globalThis.window === undefined) return { chatId: newChatId() };
  try {
    const raw = globalThis.sessionStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as Partial<StoredChat>) : null;
    if (typeof parsed?.chatId === "string") {
      return {
        chatId: parsed.chatId,
        ...(typeof parsed.session?.sessionId === "string" ? { session: parsed.session } : {}),
      };
    }
  } catch {
    // Unreadable: start a new chat.
  }
  return { chatId: newChatId() };
}

function persistChat(key: string, chat: StoredChat | undefined): void {
  if (globalThis.window === undefined) return;
  try {
    if (chat?.session) {
      globalThis.sessionStorage.setItem(key, JSON.stringify(chat));
    } else {
      globalThis.sessionStorage.removeItem(key);
    }
  } catch {
    // Storage is full or blocked, so resume just won't survive a reload.
  }
}

function encodeHeaderValue(value: string): string | undefined {
  try {
    return encodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export interface UseAssistantResult {
  runtime: AssistantRuntime;
  status: AssistantStatus;
  statusLine: string | null;
  /**
   * Every later message queues behind it,
   * so a host that renders nothing here shows a chat that silently stopped replying.
   */
  pendingInput: PendingInputRequest | null;
  pendingInputs: PendingInputRequest[];
  respondToInput: (answer: string | { text: string }) => Promise<void>;
  turnActive: boolean;
  error: string | null;
  newChat: () => void;
  prewarm: () => void;
  sessionId: string | undefined;
}

function useAssistantEngine(): UseAssistantResult {
  const ctx = useAssistantContext();
  const { host, conversationId, currentUserId } = ctx;

  // Repinned only by the principal effect below, not on every render:
  // the next `onSessionChange` would otherwise persist the old user's session under the new user's key.
  const sessionKey = storageKey(host, currentUserId, conversationId);
  const sessionKeyRef = useRef(sessionKey);

  const [initialChat] = useState(() => loadChat(sessionKey));
  const initialSession = initialChat.session;
  const chatIdRef = useRef(initialChat.chatId);

  const sessionIdRef = useRef<string | undefined>(initialSession?.sessionId);
  const statusRef = useRef<AssistantStatus>("ready");
  const resumingStoredRef = useRef(initialSession !== undefined);

  // Held in memory only, never stored.
  // Replaced, not cleared, when a chat ends: the old chat's tokens mean nothing in the next.
  const [vault, setVault] = useState(() => new Vault());
  const vaultRef = useRef(vault);
  vaultRef.current = vault;
  const [vaultRevision, setVaultRevision] = useState(vault.revision);
  const carriedRef = useRef<CarriedResult[]>([]);

  // A read mints a token per value, so the redraw is batched until the read finishes.
  useEffect(() => {
    let scheduled = false;
    return vault.subscribe(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        setVaultRevision(vault.revision);
      });
    });
  }, [vault]);

  const loop = useBrowserToolLoop({
    getSessionId: () => sessionIdRef.current,
    getStatus: () => statusRef.current,
    getVault: () => vaultRef.current,
    respond: (responses, results) =>
      agentRef.current.respond(responses, { clientContext: results }),
    onRead: (result) => {
      carriedRef.current = carriedWithin([...carriedRef.current.filter((r) => r.content !== result.content), result]);
    },
  });

  const loopRef = useRef(loop);
  loopRef.current = loop;

  // The chat turns only `session.failed` into `agent.error`,
  // so `step.failed` and `turn.failed` would otherwise end the turn with no text and no error.
  const [turnFailure, setTurnFailure] = useState<Error | null>(null);
  const noteTurnFailure = useCallback((ev: MessageStreamEvent) => {
    if (ev.type === "turn.started") {
      setTurnFailure(null);
      return;
    }
    if (!isTurnFailureEvent(ev) || ev.type === "session.failed") return;
    const failure = new Error(ev.data.message);
    failure.name = ev.data.code;
    setTurnFailure(failure);
  }, []);

  const chatHeaders = useCallback(
    async () => ({ ...(await ctx.headers()), [CHAT_HEADER]: chatIdRef.current }),
    [ctx],
  );
  const agent = useChatSession({
    host,
    headers: chatHeaders,
    initialSession,
    onEvent: (ev) => {
      resumingStoredRef.current = false;
      loopRef.current.handleEvent(ev);
      noteTurnFailure(ev);
    },
    onSessionChange: (session) => {
      sessionIdRef.current = session?.sessionId;
      persistChat(sessionKeyRef.current, session && { chatId: chatIdRef.current, session });
    },
  });

  const pageHeaders = useCallback((): Record<string, string> => {
    const marker = ctx.pageContext();
    const pageContext = marker && redactPageContext(vaultRef.current, marker);
    // A lone surrogate makes encodeURIComponent throw; the page context is dropped, not the message.
    const encoded = pageContext ? encodeHeaderValue(pageContext) : undefined;
    return encoded === undefined ? {} : { [PAGE_CONTEXT_HEADER]: encoded };
  }, [ctx]);
  statusRef.current = agent.status;
  sessionIdRef.current = agent.session?.sessionId ?? sessionIdRef.current;

  const flushReplayed = loop.flushReplayed;
  useEffect(() => {
    if (agent.status !== "resuming") flushReplayed();
  }, [agent.status, flushReplayed]);

  // A fallback: `AssistantProvider` already remounts the engine on a user change.
  const principalRef = useRef(currentUserId);
  useEffect(() => {
    const changed = principalRef.current !== currentUserId;
    principalRef.current = currentUserId;
    if (!changed) {
      sessionKeyRef.current = sessionKey;
      return;
    }
    sessionIdRef.current = undefined;
    chatIdRef.current = newChatId();
    resumingStoredRef.current = false;
    vaultRef.current = new Vault();
    setVault(vaultRef.current);
    carriedRef.current = [];
    setTurnFailure(null);
    setSentAnswers(new Map());
    setStoppedAt(null);
    loopRef.current.reset();
    // Reset before repinning the key: eve reports the cleared session synchronously,
    // so the removal lands on the outgoing user's key.
    agentRef.current.reset();
    sessionKeyRef.current = sessionKey;
  }, [currentUserId, sessionKey]);

  // The transcript as it stood when Stop was pressed: eve cancels asynchronously,
  // so the live one would keep streaming until the cancel is confirmed.
  const [stoppedAt, setStoppedAt] = useState<EveMessage[] | null>(null);
  const agentRunning =
    agent.status === "submitted" || agent.status === "streaming" || loop.busy;
  if (stoppedAt !== null && !agentRunning) setStoppedAt(null);
  const isRunning = agentRunning && stoppedAt === null;

  const [turnActive, setTurnActive] = useState(false);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (stoppedAt !== null) {
      if (settleRef.current !== null) clearTimeout(settleRef.current);
      settleRef.current = null;
      setTurnActive(false);
      return;
    }
    if (isRunning) {
      if (settleRef.current !== null) {
        clearTimeout(settleRef.current);
        settleRef.current = null;
      }
      setTurnActive(true);
      return;
    }
    if (settleRef.current !== null) return;
    settleRef.current = setTimeout(() => {
      settleRef.current = null;
      setTurnActive(false);
    }, TURN_SETTLE_MS);
  }, [isRunning, stoppedAt]);
  useEffect(
    () => () => {
      if (settleRef.current !== null) clearTimeout(settleRef.current);
    },
    [],
  );

  const liveMessages = useMemo(
    () => agent.messages.map((message) => restoreEveMessage(vault, message)),
    // The revision stands for the vault's contents, which the reference alone does not track.
    [agent.messages, vault, vaultRevision],
  );
  const liveStatusLine = useAssistantStatus({
    messages: liveMessages,
    status: agent.status,
    toolLoopBusy: loop.busy,
    questionShown: loop.pendingInputs.some((request) => request.kind === "question"),
  });
  const statusLine = stoppedAt === null ? liveStatusLine : null;

  const agentRef = useRef(agent);
  agentRef.current = agent;

  // A browser result the agent refused or never received leaves the turn parked
  // on a request nothing will answer, so the turn is cancelled.
  const deliveryError = loop.deliveryError;
  useEffect(() => {
    if (!deliveryError) return;
    agentRef.current.cancel().catch(() => {});
  }, [deliveryError]);

  const messageContext = useCallback(async (vault: Vault): Promise<MessageContext | undefined> => {
    const marker = ctx.pageContext();
    const page = marker ? parsePageContextMarker(marker) : null;
    const fetch = ctx.fetchManagement;
    const record = page?.ref && fetch ? await readPageRecord(page.kind, page.ref, fetch).catch(() => null) : null;
    const results = [...carriedRef.current];
    if (record) {
      results.push({ toolName: "netbird_api", ok: true, content: redactResult(vault, "netbird_api", record.content) });
    }
    const carriedResults = carriedWithin(results);
    return carriedResults.length > 0 ? { carriedResults } : undefined;
  }, [ctx]);

  const onNew = useCallback(async (message: AppendMessage) => {
    const text = message.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("\n\n")
      .trim();
    if (!text) return;
    const vault = vaultRef.current;
    // The page record is read before scrubbing, so its names are known when the text is tokenised.
    const clientContext = await messageContext(vault);
    const scrubbed = vault.scrub(text);
    setStoppedAt(null);
    await agentRef.current.send(scrubbed, { clientContext, headers: pageHeaders() });
  }, [messageContext, pageHeaders]);

  const onCancel = useCallback(async () => {
    setStoppedAt(agentRef.current.messages);
    // A browser tool still executing would keep `loop.busy` set after Stop.
    loopRef.current.reset();
    try {
      await agentRef.current.cancel();
    } catch (err) {
      setStoppedAt(null);
      throw err;
    }
  }, []);

  const [sentAnswers, setSentAnswers] = useState<SentAnswers>(() => new Map());
  const shownMessages = stoppedAt ?? agent.messages;
  const transcript = useMemo(
    () => withQuestionReplies(shownMessages, sentAnswers).map((message) => restoreEveMessage(vault, message)),
    [shownMessages, sentAnswers, vault, vaultRevision],
  );

  const runtime = useExternalStoreRuntime<EveMessage>({
    messages: transcript,
    convertMessage: convertEveMessage,
    isRunning,
    isDisabled: agent.status === "resuming", // append-only session, so no onEdit or onReload
    onNew,
    onCancel,
  });

  const startChat = useCallback((endRun: boolean) => {
    const ending = sessionIdRef.current;
    if (ending && endRun) {
      const chatId = chatIdRef.current;
      void endChat({ host: ctx.host, headers: async () => ({ ...(await ctx.headers()), [CHAT_HEADER]: chatId }) }, ending);
    }
    persistChat(sessionKeyRef.current, undefined);
    sessionIdRef.current = undefined;
    chatIdRef.current = newChatId();
    resumingStoredRef.current = false;
    vaultRef.current = new Vault();
    setVault(vaultRef.current);
    carriedRef.current = [];
    setTurnFailure(null);
    setSentAnswers(new Map());
    setStoppedAt(null);
    loopRef.current.reset();
    agentRef.current.reset();
  }, [ctx]);
  const newChat = useCallback(() => startChat(true), [startChat]);

  // A stored chat the agent will not resume starts a new chat instead of showing an error.
  // Only a failed resume recovers this way: in a live conversation the same code is shown, not wiped.
  // The recovery is remembered by error identity, so it does not loop.
  const recoveredFromRef = useRef<unknown>(null);
  const heldSessionId = sessionIdRef.current;
  const agentError = agent.error;
  const unresumable =
    agentError !== undefined &&
    (recoveredFromRef.current === agentError ||
      (isUnresumableSession(agentError) && heldSessionId !== undefined && resumingStoredRef.current));

  useEffect(() => {
    if (!unresumable || recoveredFromRef.current === agentError) return;
    recoveredFromRef.current = agentError;
    startChat(false);
  }, [unresumable, agentError, startChat]);

  const failure = agentError ?? (loop.deliveryError || undefined) ?? turnFailure;
  const error = !failure || (failure === agentError && unresumable) ? null : describeAssistantError(failure);

  const pendingInput = loop.pendingInput;
  const clearPendingInput = loop.clearPendingInput;
  const restorePendingInput = loop.restorePendingInput;
  const respondToInput = useCallback(
    async (answer: string | { text: string }) => {
      if (!pendingInput) return;
      // Cleared optimistically, since eve rejects a second answer to a resolved request.
      clearPendingInput(pendingInput.requestId);
      const { requestId } = pendingInput;
      // eve's response schema is strict and rejects `{ optionId: undefined }` as an extra key.
      const response = typeof answer === "string"
        ? { optionId: answer }
        : { text: vaultRef.current.scrub(answer.text) };
      setSentAnswers((sent) => new Map(sent).set(requestId, response));
      try {
        await agentRef.current.respond([{ requestId, ...response }]);
      } catch (err) {
        setSentAnswers((sent) => {
          const next = new Map(sent);
          next.delete(requestId);
          return next;
        });
        restorePendingInput(pendingInput);
        throw err;
      }
    },
    [pendingInput, clearPendingInput, restorePendingInput],
  );

  const prewarm = useCallback(() => {
    void agentRef.current.prewarm();
  }, []);

  return {
    runtime,
    status: agent.status,
    statusLine,
    pendingInput,
    pendingInputs: loop.pendingInputs,
    respondToInput,
    turnActive,
    error,
    newChat,
    prewarm,
    sessionId: agent.session?.sessionId,
  };
}

const EngineContext = createContext<UseAssistantResult | null>(null);

export function AssistantEngine({ children }: { children: ReactNode }) {
  const engine = useAssistantEngine();
  return createElement(EngineContext.Provider, { value: engine }, children);
}

export function useAssistant(): UseAssistantResult {
  const engine = useContext(EngineContext);
  if (!engine) {
    throw new Error(
      "NetBird assistant hooks must be used inside <AssistantProvider>",
    );
  }
  return engine;
}
