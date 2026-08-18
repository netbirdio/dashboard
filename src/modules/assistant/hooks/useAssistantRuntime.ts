// The chat runtime: AI SDK `useChat` against the assistant service, bridged
// into assistant-ui. Client tool calls are fulfilled here; the AI SDK
// resubmits automatically once every call has an output.
"use client";

import { useChat } from "@ai-sdk/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { useNetBirdFetch } from "@utils/api";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAssistantSidebar } from "@/modules/assistant/AssistantSidebarProvider";
import type { AssistantQuestion } from "@/modules/assistant/chat/AssistantQuestionCard";
import {
  describeControlCenterTool,
  toolLabel,
} from "@/modules/assistant/chat/AssistantToolActivity";
import {
  type ToolResultStore,
  useAssistantTools,
} from "@/modules/assistant/hooks/useAssistantTools";
import { beginCanvasTurn } from "@/modules/assistant/tools/control-center-call-tool";
import {
  AssistantHttpError,
  describeAssistantError,
  serverFailure,
} from "@/modules/assistant/utils/errors";
import {
  identifierNotes,
  pseudonymizeMessages,
  type Redactor,
} from "@/modules/assistant/utils/redaction";
import { ASSISTANT_TOOLS } from "@/modules/assistant/utils/tools";

const TEXT = {
  thinking: "Thinking",
  working: "Working",
  pickOne: "Pick one",
} as const;

// Client tool rounds per user message before the loop is cut off.
const MAX_TOOL_ROUNDS = 24;

// How long the turn has to sit idle before it counts as over. Between two tool
// rounds the chat passes through "ready" for a moment while the results are
// submitted back; reporting that gap would collapse the steps panels mid-turn
// only to reopen them for the next round.
const TURN_SETTLE_MS = 200;

const STATUS_MAX_CHARS = 52;

const STATUS_FILLER = [
  /^(ok(ay)?|so|now|alright|right|hmm+|well|actually|but|and|also)\b[\s,:—-]*/i,
  /^(let me|let's|i'll|i will|i need to|i should|i want to|i have to|i must|i can|we need to|we should)\s+/i,
  /^(i'?m|i am|we'?re|we are)\s+/i,
  /^(first|next|then|finally|however|therefore|basically|essentially)\b[\s,:—-]*/i,
  /^(the user (is )?(asking|wants|said|says|means|wrote)( for| to| that)?)\s*/i,
  /^(i think|it (looks|seems) like|apparently|presumably)\s+/i,
];

// The reasoning stream compressed to one status line.
export function thinkingStatus(reasoning: string): string | null {
  const clauses = reasoning.split(/[.!?\n]+/).map((c) => c.trim());
  let clause = clauses.findLast(Boolean) ?? "";

  for (let prev = ""; prev !== clause; ) {
    prev = clause;
    for (const pattern of STATUS_FILLER) clause = clause.replace(pattern, "");
  }
  clause = clause.trim();
  if (clause.length < 12) return null;

  if (clause.length > STATUS_MAX_CHARS) {
    const cut = clause.slice(0, STATUS_MAX_CHARS);
    const lastSpace = cut.lastIndexOf(" ");
    clause =
      (lastSpace > STATUS_MAX_CHARS / 2 ? cut.slice(0, lastSpace) : cut) + "…";
  }
  clause = clause.replace(/[,;:\s]+(…)?$/, "$1");
  return clause.charAt(0).toUpperCase() + clause.slice(1);
}

type AuthedFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

// Turns a refused response into the server's own wording before the AI SDK
// can surface the raw body as the error message.
export function friendlyFetch(authedFetch: AuthedFetch): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await authedFetch(
      input instanceof URL ? input.toString() : input,
      init,
    );
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      const { code, message } = serverFailure(res.status, raw);
      throw new AssistantHttpError(res.status, message, code);
    }
    return res;
  }) as typeof fetch;
}

// Client tool parts that still owe an output: the stream has closed but the
// dashboard is executing them, and their results will resubmit the turn — so
// a "ready" status with these around is a round gap, not the end of the turn.
function pendingClientToolWork(messages: UIMessage[]): boolean {
  const last = messages.at(-1);
  if (last?.role !== "assistant") return false;
  return last.parts.some(
    (part) =>
      isToolUIPart(part) &&
      ASSISTANT_TOOLS[getToolName(part)]?.kind !== "server" &&
      (part.state === "input-streaming" || part.state === "input-available"),
  );
}

// Client tool rounds since the user last typed: every assistant message in
// between is one round of the loop.
function roundsSinceUser(messages: UIMessage[]): number {
  let rounds = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") break;
    if (messages[i].role === "assistant") rounds++;
  }
  return rounds;
}

interface AskInput {
  question: string;
  type: "single_select" | "multi_select";
  options: { label: string; description?: string }[];
}

export interface AssistantRuntimeOptions {
  toolResults: ToolResultStore;
  redactor: Redactor;
  onQuestion?: (question: AssistantQuestion | null) => void;
  onStatus?: (status: string | null) => void;
  // True from send until the turn is really over, spanning the round gaps
  // where the chat is briefly "ready" while client tools execute.
  onTurnActive?: (active: boolean) => void;
  pageContext?: () => string | null;
}

export function useAssistantRuntime({
  toolResults,
  redactor,
  onQuestion,
  onStatus,
  onTurnActive,
  pageContext,
}: AssistantRuntimeOptions) {
  const { fetch: authedFetch } = useNetBirdFetch(true);
  const executeTool = useAssistantTools();
  const { origin } = useAssistantSidebar();

  // Read at send time through a ref: the transport is built once per
  // conversation, and the page can change between two messages.
  const contextRef = useRef(pageContext);
  contextRef.current = pageContext;

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: `${origin}/v1/chat`,
        fetch: friendlyFetch(authedFetch),
        /*
          The privacy boundary. The wire copy is pseudonymized here, on every
          send — chat state keeps what the user typed, and the monotonic token
          map makes each resend come out identical. Tool outputs need nothing:
          they were redacted when they were recorded. The identifier notes ride
          in pageContext, which the server prepends to the newest user message.
        */
        prepareSendMessagesRequest: ({ id, messages }) => {
          const notes = identifierNotes(messages, redactor);
          const context = contextRef.current?.() ?? null;
          return {
            body: {
              id,
              messages: pseudonymizeMessages(messages, redactor),
              pageContext:
                [notes, context].filter(Boolean).join("\n\n") || undefined,
            },
          };
        },
      }),
    [origin, authedFetch, redactor],
  );

  // Holds the canvas lock and batches its re-layout from the first canvas
  // tool of a turn until the turn settles, spanning the rounds in between.
  const endCanvasTurnRef = useRef<(() => void) | null>(null);

  // The turn's published state, edge-triggered and settled: activity reports
  // immediately, idleness only after TURN_SETTLE_MS without a change of heart.
  const turnActiveRef = useRef(false);
  const turnSettleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const publishTurnActive = useCallback(
    (active: boolean) => {
      if (active) {
        if (turnSettleRef.current !== null) {
          clearTimeout(turnSettleRef.current);
          turnSettleRef.current = null;
        }
        if (!turnActiveRef.current) {
          turnActiveRef.current = true;
          onTurnActive?.(true);
        }
        return;
      }
      if (!turnActiveRef.current || turnSettleRef.current !== null) return;
      turnSettleRef.current = setTimeout(() => {
        turnSettleRef.current = null;
        turnActiveRef.current = false;
        onTurnActive?.(false);
      }, TURN_SETTLE_MS);
    },
    [onTurnActive],
  );
  useEffect(
    () => () => {
      if (turnSettleRef.current !== null) clearTimeout(turnSettleRef.current);
    },
    [],
  );

  type Chat = ReturnType<typeof useChat<UIMessage>>;
  const chatRef = useRef<Chat | null>(null);

  const runClientTool = useCallback(
    async (toolCall: {
      toolCallId: string;
      toolName: string;
      input: unknown;
    }) => {
      const current = chatRef.current;
      if (!current) return;
      const { toolCallId, toolName, input } = toolCall;
      const kind = ASSISTANT_TOOLS[toolName]?.kind;
      // Server tools stream their output from the service.
      if (kind === "server") return;

      if (kind === "control-center" && !endCanvasTurnRef.current) {
        endCanvasTurnRef.current = beginCanvasTurn();
      }
      try {
        // executeTool also words the failure for a tool this dashboard
        // version doesn't know.
        const outcome = await executeTool(
          toolName,
          input,
          toolResults,
          redactor,
        );
        if (outcome.isError) {
          current.addToolResult({
            tool: toolName,
            toolCallId,
            state: "output-error",
            errorText: outcome.content,
          });
        } else {
          current.addToolResult({
            tool: toolName,
            toolCallId,
            output: outcome.content,
          });
        }
      } catch (err) {
        current.addToolResult({
          tool: toolName,
          toolCallId,
          state: "output-error",
          errorText: describeAssistantError(err),
        });
      }
    },
    [executeTool, toolResults, redactor],
  );

  // Tool calls of one message run strictly in the order the model made them:
  // a cc_add fired concurrently with the cc_draft before it would find no
  // draft to add to. `runClientTool` never throws, so the chain can't stall.
  const toolQueueRef = useRef<Promise<void>>(Promise.resolve());

  const chat = useChat<UIMessage>({
    transport,
    sendAutomaticallyWhen: (options) =>
      roundsSinceUser(options.messages) < MAX_TOOL_ROUNDS &&
      lastAssistantMessageIsCompleteWithToolCalls(options),
    onToolCall: ({ toolCall }) => {
      toolQueueRef.current = toolQueueRef.current.then(() =>
        runClientTool(toolCall),
      );
    },
    onData: (part) => {
      if (part.type !== "data-suggestions") return;
      const s = part.data as { quick_replies?: string[]; question?: string };
      if (!s.quick_replies?.length) return;
      onQuestion?.({
        id: crypto.randomUUID(),
        title: s.question || TEXT.pickOne,
        options: s.quick_replies.map((label) => ({ label })),
        multi: false,
      });
    },
  });
  chatRef.current = chat;

  // Status line + question card, derived from the streaming message.
  const shownQuestionRef = useRef<string | null>(null);
  useEffect(() => {
    const last = chat.messages.at(-1);

    // "ready" mid-turn is real: each client tool round closes the stream, runs
    // the tools, and only then resubmits. The turn is over only when nothing
    // is left executing that would send the conversation back.
    const running =
      chat.status === "submitted" ||
      chat.status === "streaming" ||
      (chat.status === "ready" && pendingClientToolWork(chat.messages));
    publishTurnActive(running);

    // A running "ready" is a round gap — fall through so the parts loop keeps
    // the executing tool's label on the line instead of blanking it.
    if ((chat.status === "ready" || chat.status === "error") && !running) {
      onStatus?.(null);
      endCanvasTurnRef.current?.();
      endCanvasTurnRef.current = null;

      // A successfully shown ask_user question surfaces once the turn settled.
      if (chat.status === "ready" && last?.role === "assistant" && onQuestion) {
        for (const part of last.parts) {
          if (!isToolUIPart(part) || getToolName(part) !== "ask_user") continue;
          if (part.state !== "output-available") continue;
          if ((part.output as { ok?: boolean } | undefined)?.ok !== true)
            continue;
          if (shownQuestionRef.current === part.toolCallId) return;
          shownQuestionRef.current = part.toolCallId;
          const input = part.input as AskInput;
          onQuestion({
            id: part.toolCallId,
            title: input.question,
            options: input.options,
            multi: input.type === "multi_select",
          });
          return;
        }
      }
      return;
    }

    if (chat.status === "submitted" || last?.role !== "assistant") {
      onStatus?.(TEXT.thinking);
      return;
    }

    for (let i = last.parts.length - 1; i >= 0; i--) {
      const part = last.parts[i];
      // Once the answer streams, it is its own progress indicator.
      if (part.type === "text" && part.text.trim()) {
        onStatus?.(null);
        return;
      }
      if (isToolUIPart(part)) {
        const name = getToolName(part);
        if (
          part.state === "input-streaming" ||
          part.state === "input-available"
        ) {
          const trail =
            ASSISTANT_TOOLS[name]?.kind === "control-center"
              ? describeControlCenterTool(name, part.input)
              : null;
          // Restored here because the status line bypasses the components
          // that restore everywhere else: tool args and reasoning are the
          // model's words, so they carry tokens.
          onStatus?.(
            redactor.restore(
              trail
                ? [trail.label, trail.detail].filter(Boolean).join(" ")
                : toolLabel(name, true),
            ),
          );
        } else {
          onStatus?.(TEXT.working);
        }
        return;
      }
      if (part.type === "reasoning" && part.text) {
        const status = thinkingStatus(part.text);
        onStatus?.(status ? redactor.restore(status) : TEXT.thinking);
        return;
      }
    }
    onStatus?.(TEXT.thinking);
  }, [
    chat.messages,
    chat.status,
    onStatus,
    onQuestion,
    publishTurnActive,
    redactor,
  ]);

  return useAISDKRuntime(chat);
}
