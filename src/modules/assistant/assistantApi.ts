/**
 * Wire client for the assistant server (`POST /v1/chat`, `GET /v1/models`,
 * `GET /v1/suggestions`).
 *
 * The chat endpoint streams SSE: `event: <type>\ndata: <json>\n\n`. We parse it
 * by hand rather than using EventSource, because EventSource cannot send an
 * Authorization header or issue a POST.
 */
import type { ChatMessage, LlmContentBlock } from "./types";

/** Mirrors `ToolUseDecision` in the server's `src/guardrails/output.ts`. */
export interface ToolDecision {
  toolUseId: string;
  name: string;
  allowed: boolean;
  mutating: boolean;
}

/** The SSE events the server emits (netbird-assistant `src/routes/chat.ts`). */
export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "reasoning"; delta: string }
  /** A documentation page the model actually read (server's `fetch_doc`). */
  | { type: "source"; url: string; title: string; domain: string }
  | {
      type: "tool_activity";
      phase: "start" | "end";
      id: string;
      name: string;
      input?: unknown;
      ok?: boolean;
      summary?: string;
    }
  | { type: "component"; component: string; [key: string]: unknown }
  | {
      type: "question";
      question: string;
      /** single_select when only one answer can be true (netbird-assistant `src/ui/ask.ts`). */
      questionType: "single_select" | "multi_select";
      options: { label: string; description?: string }[];
    }
  | {
      type: "tool_use";
      content: LlmContentBlock[];
      decisions: ToolDecision[];
      appendMessages: ChatMessage[];
      serverToolResults: LlmContentBlock[];
    }
  | {
      type: "suggestions";
      /** Answers to a question the assistant just asked. Never "what to ask next". */
      quick_replies: string[];
      /** The assistant's question, restated — titles the card. */
      question: string;
    }
  | { type: "final"; content: LlmContentBlock[]; stopReason: string | null }
  | { type: "done"; stopReason: string | null }
  | {
      type: "error";
      /** Already written for the user (netbird-assistant `src/llm/errors.ts`). */
      message: string;
      /** Why it failed, for logs — not for display. */
      code?: string;
      /** Whether the same request is worth sending again. */
      retryable?: boolean;
    };

/**
 * The server's rejection when a request names a model that is no longer in the
 * allowlist — usually a panel that resolved the model list before the deployment
 * changed models. Recoverable: retry without the id and the server picks its own.
 */
export const UNKNOWN_MODEL = "unknown model";

export class AssistantHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /**
     * The server's own `error` string, kept alongside the user-facing message so
     * callers can recognise a specific, recoverable rejection (see UNKNOWN_MODEL)
     * without matching on prose.
     */
    readonly detail?: string,
  ) {
    super(message);
    this.name = "AssistantHttpError";
  }
}

/** The server's `error` field, if the body is the shape we expect. */
const serverDetail = (body: string): string | undefined => {
  try {
    return JSON.parse(body)?.error as string | undefined;
  } catch {
    return undefined;
  }
};

/**
 * An `error` event the server sent mid-stream. Its message is already written
 * for the user, so it's carried through as-is rather than re-described.
 */
export class AssistantStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssistantStreamError";
  }
}

/**
 * Map a non-2xx from the assistant server onto a message worth showing.
 * Exported for its own tests — it's the whole of what the user reads on a failure.
 */
export const describeFailure = (status: number, body: string): string => {
  const detail = serverDetail(body);

  switch (status) {
    case 400:
      /*
        The server's 400 bodies are terse machine strings ("unknown model",
        "invalid request body"). Each gets a sentence written for the user —
        pasting the raw string in front of a generic "try again" produced
        ungrammatical advice that was also wrong: retrying changes nothing here.
      */
      if (detail === UNKNOWN_MODEL) {
        return "The model this chat was set to isn't available any more. Reopen the assistant to pick up the current one.";
      }
      if (detail === "request blocked by guardrails") {
        return "That request was blocked before it reached the assistant. Try rewording it.";
      }
      if (detail === "too many messages") {
        return "This conversation has too many messages. Start a new chat to continue.";
      }
      return "The assistant couldn't read that request. Starting a new chat usually clears it.";
    case 401:
      return "Your session expired. Reload the page and sign in again.";
    case 402:
      return "The AI assistant has reached its usage limit for this account.";
    case 429:
      return "Too many requests — give it a moment and try again.";
    case 413:
      return "This conversation is too long. Start a new chat to continue.";
    case 404:
      return "The assistant service isn't available at this address. Ask your administrator to check the dashboard's assistant configuration.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "The assistant service is temporarily unavailable. It may be restarting — try again in a minute.";
    default:
      // No raw server detail here either — an unmapped status is a bug on our
      // side, and the status code is the part worth reporting.
      return `The assistant couldn't complete that request (error ${status}). Try again in a moment.`;
  }
};

/**
 * Every failure the chat can hit → one sentence the user can act on.
 *
 * The case that matters most is the server being down: `fetch` rejects with a
 * bare `TypeError: Failed to fetch` for that, for DNS failures and for a CORS
 * rejection alike, and showing that verbatim tells the user nothing about
 * whether to retry, reload or call an administrator.
 */
export function describeAssistantError(err: unknown): string {
  if (err instanceof AssistantHttpError) return err.message;
  if (err instanceof AssistantStreamError) return err.message;

  if ((err as Error)?.name === "TimeoutError") {
    return "The assistant took too long to respond. Try again in a moment.";
  }
  if (err instanceof TypeError) {
    return "Can't reach the assistant service — it looks offline or is restarting. Try again in a minute, or contact your administrator if it keeps happening.";
  }

  const detail = (err as Error)?.message;
  return detail
    ? `The assistant ran into an unexpected problem (${detail}). Try again in a moment.`
    : "The assistant ran into an unexpected problem. Try again in a moment.";
}

type AuthedFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export interface ChatRequestBody {
  messages: ChatMessage[];
  conversationId?: string;
  model?: string;
}

/**
 * One turn's stream, with the one HTTP failure that's worth recovering from
 * handled here: a model id the server no longer allows.
 *
 * That happens on any deployment that changes models — the panel resolves the
 * model list once, so an open tab keeps naming the old one and every send fails.
 * Dropping the id and retrying lets the server pick its own current default, so
 * the user's turn goes through instead of erroring; `onModelDropped` lets the
 * caller stop sending the dead id on later turns.
 */
export async function* streamTurn(
  fetchFn: AuthedFetch,
  origin: string,
  body: ChatRequestBody,
  signal: AbortSignal | undefined,
  onModelDropped: (rejected: string) => void,
): AsyncGenerator<ChatEvent> {
  try {
    yield* streamChat(fetchFn, origin, body, signal);
    return;
  } catch (err) {
    const stale =
      err instanceof AssistantHttpError &&
      err.status === 400 &&
      err.detail === UNKNOWN_MODEL &&
      body.model !== undefined;
    if (!stale) throw err;
    onModelDropped(body.model!);
  }
  // Outside the catch: a failure in the retry is the caller's to describe, and
  // nesting it here would report the first error instead of the real one.
  yield* streamChat(fetchFn, origin, { ...body, model: undefined }, signal);
}

/**
 * Stream one chat turn. Yields each parsed SSE event in order; returns when the
 * server closes the stream.
 */
export async function* streamChat(
  fetchFn: AuthedFetch,
  origin: string,
  body: ChatRequestBody,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const res = await fetchFn(`${origin}/v1/chat`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    throw new AssistantHttpError(
      res.status,
      describeFailure(res.status, raw),
      serverDetail(raw),
    );
  }
  if (!res.body) throw new Error("Assistant returned an empty stream.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Frames are separated by a blank line. Keep the trailing partial frame.
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseFrame(frame);
        if (parsed) yield parsed;
      }
    }
  } finally {
    // Abandoning the stream mid-turn must not leak the connection.
    reader.cancel().catch(() => {});
  }
}

function parseFrame(frame: string): ChatEvent | null {
  let event = "";
  const dataLines: string[] = [];

  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (!event || dataLines.length === 0) return null;

  try {
    return { type: event, ...JSON.parse(dataLines.join("\n")) } as ChatEvent;
  } catch {
    // A malformed frame is not worth killing the turn over.
    return null;
  }
}

export interface SelectableModel {
  id: string;
  default: boolean;
}

export async function fetchModels(
  fetchFn: AuthedFetch,
  origin: string,
): Promise<SelectableModel[]> {
  const res = await fetchFn(`${origin}/v1/models`);
  if (!res.ok) return [];
  return ((await res.json()) as { models?: SelectableModel[] }).models ?? [];
}

export async function fetchStarters(
  fetchFn: AuthedFetch,
  origin: string,
): Promise<string[]> {
  const res = await fetchFn(`${origin}/v1/suggestions`);
  if (!res.ok) return [];
  return ((await res.json()) as { starters?: string[] }).starters ?? [];
}
