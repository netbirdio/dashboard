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

/** Session lifecycle. */
export type AssistantStatus = ChatStatus;

// sessionStorage is scoped to the tab rather than the sign-in,
// so the key names the deployment and the signed-in user as well as the conversation.
// The agent only resumes a chat for the user who started it, whatever the browser holds.
const storageKey = (
  host: string,
  currentUserId: string | undefined,
  conversationId: string,
) =>
  `nb-assistant.session.${encodeURIComponent(host)}.${encodeURIComponent(
    currentUserId ?? "anonymous",
  )}.${encodeURIComponent(conversationId)}`;

/** A chat as the browser keeps it: the id it names the chat by, and eve's resume state once there is one. */
interface StoredChat {
  chatId: string;
  session?: StoredSession;
}

type CarriedResult = MessageContext["carriedResults"][number];

/** The newest results that fit what one message may carry, oldest first. */
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

// 18 random bytes, base64url: what the agent's CHAT_ID_PATTERN accepts.
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
  /** One line describing what the assistant is doing, or null when idle. */
  statusLine: string | null;
  /**
   * The eve input request this session is paused on:
   * an `ask_question` (with `options`, a card of choices), a runtime-limit continuation or a tool approval.
   * Browser tools never appear here; the SDK answers those itself.
   * Every later message queues behind it, so a host that renders nothing here
   * shows a chat that silently stopped replying.
   */
  pendingInput: PendingInputRequest | null;
  /** Every outstanding input request, oldest first; `pendingInput` is its head. */
  pendingInputs: PendingInputRequest[];
  /** Answers `pendingInput` with an option id, or with `{ text }` when it `acceptsFreeText`. */
  respondToInput: (answer: string | { text: string }) => Promise<void>;
  /** True from send until the turn really settles, spanning client-tool gaps. */
  turnActive: boolean;
  /** Friendly one-sentence error for the last failure, or null. */
  error: string | null;
  /** Starts a fresh conversation: resets the session and clears persistence. */
  newChat: () => void;
  /**
   * Creates the chat's session before its first message, so that message
   * starts its turn at once. Call it when the person is about to type, such
   * as when the panel opens; a chat that has a session ignores it.
   */
  prewarm: () => void;
  sessionId: string | undefined;
}

function useAssistantEngine(): UseAssistantResult {
  const ctx = useAssistantContext();
  const { host, conversationId, currentUserId } = ctx;

  // Repinned only by the principal effect below, not on every render:
  // following the render would point the ref at the new user's key while the old session is still live,
  // and the next `onSessionChange` would persist the old user's session id there.
  const sessionKey = storageKey(host, currentUserId, conversationId);
  const sessionKeyRef = useRef(sessionKey);

  const [initialChat] = useState(() => loadChat(sessionKey));
  const initialSession = initialChat.session;
  const chatIdRef = useRef(initialChat.chatId);

  const sessionIdRef = useRef<string | undefined>(initialSession?.sessionId);
  const statusRef = useRef<AssistantStatus>("ready");
  // True while the only thing that has happened to this chat is the attempt to resume it.
  const resumingStoredRef = useRef(initialSession !== undefined);

  /*
    Held in memory only, never stored: a chat resumed after a reload shows its
    earlier answers' tokens as they are, and new reads restore as usual.
    Replaced, never cleared, when a chat ends: the old chat's tokens mean nothing in the next.
  */
  const [vault, setVault] = useState(() => new Vault());
  const vaultRef = useRef(vault);
  vaultRef.current = vault;
  const [vaultRevision, setVaultRevision] = useState(vault.revision);
  // Reads of this chat, already tokenised, that the next message carries.
  const carriedRef = useRef<CarriedResult[]>([]);

  // A read mints a token per value, so the redraw waits for the read to finish.
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

  // The store's callbacks fire between renders.
  const loopRef = useRef(loop);
  loopRef.current = loop;

  /*
    The chat turns only `session.failed` into `agent.error`,
    so `step.failed` and `turn.failed` would end the turn with no text and no error,
    and the assistant would look like it simply stopped answering.
    Cleared on `turn.started` rather than on send, so the failure stays readable until it is certainly stale.
  */
  const [turnFailure, setTurnFailure] = useState<Error | null>(null);
  const noteTurnFailure = useCallback((ev: MessageStreamEvent) => {
    if (ev.type === "turn.started") {
      setTurnFailure(null);
      return;
    }
    if (!isTurnFailureEvent(ev) || ev.type === "session.failed") return;
    // Shaped like the chat's `session.failed` error, so `describeAssistantError` reads both the same way.
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

  /** The page the user is on, as the header each message carries; empty when there is none to send. */
  const pageHeaders = useCallback((): Record<string, string> => {
    const marker = ctx.pageContext();
    // The page names its resource by id and name, which leave the browser as the token its reads give it.
    const pageContext = marker && redactPageContext(vaultRef.current, marker);
    // A lone surrogate makes encodeURIComponent throw;
    // dropping the page context beats dropping the message with it.
    const encoded = pageContext ? encodeHeaderValue(pageContext) : undefined;
    return encoded === undefined ? {} : { [PAGE_CONTEXT_HEADER]: encoded };
  }, [ctx]);
  statusRef.current = agent.status;
  sessionIdRef.current = agent.session?.sessionId ?? sessionIdRef.current;

  // Calls a resumed session is still parked on run once its history has replayed.
  const flushReplayed = loop.flushReplayed;
  useEffect(() => {
    if (agent.status !== "resuming") flushReplayed();
  }, [agent.status, flushReplayed]);

  // A user change tears the conversation down.
  // `AssistantProvider` already remounts the engine on it;
  // this is the fallback if that key is ever loosened.
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

  /*
    The transcript as it stood when Stop was pressed, held until eve confirms
    the cancel. eve cancels asynchronously, so without it the thread kept
    spinning and streaming after Stop. Stop reads as done the moment it is pressed.
  */
  const [stoppedAt, setStoppedAt] = useState<EveMessage[] | null>(null);
  const agentRunning =
    agent.status === "submitted" || agent.status === "streaming" || loop.busy;
  // Adjusted during render: the turn is over, so the live transcript is final again.
  if (stoppedAt !== null && !agentRunning) setStoppedAt(null);
  const isRunning = agentRunning && stoppedAt === null;

  // Activity reports immediately, idleness only after TURN_SETTLE_MS without a change.
  const [turnActive, setTurnActive] = useState(false);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (stoppedAt !== null) {
      // A stopped turn is over at once, so its steps collapse without the settle delay.
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

  /*
    Browser results the agent refused, or that never reached it, leave the turn
    parked on a request nothing will answer, so the thread spun until a reload.
    Delivery has already retried what may pass, so the turn is cancelled; the
    error stays shown until the next turn starts.
  */
  const deliveryError = loop.deliveryError;
  useEffect(() => {
    if (!deliveryError) return;
    agentRef.current.cancel().catch(() => {});
  }, [deliveryError]);

  /** What a message carries: the chat's latest reads and the record of the page it is sent from. */
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
    // Read first, so the names in the page's record are known when the text is tokenised.
    const clientContext = await messageContext(vault);
    // Account values and credential-shaped values leave the browser as tokens.
    const scrubbed = vault.scrub(text);
    setStoppedAt(null);
    await agentRef.current.send(scrubbed, { clientContext, headers: pageHeaders() });
  }, [messageContext, pageHeaders]);


  const onCancel = useCallback(async () => {
    setStoppedAt(agentRef.current.messages);
    // A browser tool still executing keeps `loop.busy` set,
    // which would leave the thread spinning after Stop.
    loopRef.current.reset();
    try {
      await agentRef.current.cancel();
    } catch (err) {
      // The turn is still running, so the thread shows it again.
      setStoppedAt(null);
      throw err;
    }
  }, []);

  // Answers awaiting the session's echo, so the reply joins the transcript as soon as it is sent.
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

  // `endRun` is false when the session is already out of reach, so there is nothing to end.
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

  /*
    A stored chat the agent will not resume starts a new chat instead of showing an error.
    The agent refuses every chat it cannot resume for this user with one code,
    whether it expired or was never theirs; the common cause is an expired chat.
    Only a failed resume recovers this way: once the chat has heard from its session,
    the same code is a failed request in a live conversation, which is shown rather than wiped.
    The recovery is remembered by error identity, so it neither loops nor shows the error afterwards.
  */
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

  // A session-level failure is the more specific answer when several are present.
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
        // The session is still parked on it, so the card must come back to be answered again.
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

/** Just the assistant-ui runtime, for AssistantRuntimeProvider. */
export function useAssistantRuntime(): AssistantRuntime {
  return useAssistant().runtime;
}
