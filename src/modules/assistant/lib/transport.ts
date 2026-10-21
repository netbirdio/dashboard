/**
 * The HTTP side of a chat: the assistant's own routes and headers, and
 * nothing of the agent framework behind them. A chat is a session the agent
 * addresses by id; messages and answers are POSTs, and what happens in the
 * session comes back as one NDJSON event stream.
 */
import type { InputResponse, MessageStreamEvent } from "eve/client";
import { PREWARM_PATH, SESSION_ID_HEADER, SESSION_PATH } from "./contract";
import { AssistantHttpError, serverFailure } from "./session-client";

export interface TransportOptions {
  /** Origin of the assistant service. */
  host: string;
  /** Resolved before every request: the user's bearer and the chat header. */
  headers: () => Promise<Record<string, string>>;
}

/** What the agent says when it takes a message or an answer. */
export interface Accepted {
  sessionId: string;
  /** Matches the message to the one the stream reports, so an optimistic copy can be replaced. */
  deliveryId?: string;
}

export type TurnBody =
  | { message: string; clientContext?: unknown }
  | { inputResponses: InputResponse[]; clientContext?: unknown };

const sessionPath = (sessionId?: string, action?: string) => {
  const parts = [SESSION_PATH];
  if (sessionId) parts.push(`/${encodeURIComponent(sessionId)}`);
  if (action) parts.push(`/${action}`);
  return parts.join("");
};

// The agent's own "not ready yet": a new chat's session is still being claimed.
const NOT_READY_CODE = "session_not_ready";
const NOT_READY_DELAYS_MS = [250, 500, 1_000, 2_000];

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

async function failure(res: Response): Promise<AssistantHttpError> {
  const { code, message } = serverFailure(res.status, await res.text().catch(() => ""));
  return new AssistantHttpError(res.status, message, code);
}

async function post(options: TransportOptions, path: string, body: unknown, headers: Record<string, string> = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${options.host}${path}`, {
      method: "POST",
      headers: { ...(await options.headers()), ...headers, "content-type": "application/json" },
      body: JSON.stringify(body),
      // A redirect would carry the bearer to wherever it points.
      redirect: "error",
    });
    if (res.ok) return (await res.json()) as Record<string, unknown>;
    const error = await failure(res);
    const delay = NOT_READY_DELAYS_MS[attempt];
    if (error.status !== 409 || error.code !== NOT_READY_CODE || delay === undefined) throw error;
    await sleep(delay);
  }
}

/** Sends a message or answers to a chat; without a session id, starts the chat with its first message. */
export async function sendTurn(
  options: TransportOptions,
  sessionId: string | undefined,
  body: TurnBody,
  headers?: Record<string, string>,
): Promise<Accepted> {
  const reply = await post(options, sessionPath(sessionId), body, headers);
  const id = typeof reply.sessionId === "string" ? reply.sessionId : sessionId;
  if (!id) throw new AssistantHttpError(500, "The assistant did not name the chat it started.");
  return { sessionId: id, ...(typeof reply.deliveryId === "string" ? { deliveryId: reply.deliveryId } : {}) };
}

/**
 * Creates the chat's session ahead of its first message, or finds the one the
 * chat already has. Null when the agent cannot prewarm, in which case the
 * first message creates the session; any other failure is thrown.
 */
export async function prewarmChat(options: TransportOptions): Promise<string | null> {
  const res = await fetch(`${options.host}${PREWARM_PATH}`, {
    method: "POST",
    headers: { ...(await options.headers()), "content-type": "application/json" },
    body: "{}",
    redirect: "error",
  });
  if (res.status === 501) return null;
  if (!res.ok) throw await failure(res);
  const reply = (await res.json()) as Record<string, unknown>;
  return typeof reply.sessionId === "string" ? reply.sessionId : null;
}

/** Stops the turn the chat is running, if any. */
export async function cancelTurn(options: TransportOptions, sessionId: string): Promise<void> {
  await post(options, sessionPath(sessionId, "cancel"), {});
}

/**
 * Ends a chat's run on the agent, so its stored transcript starts its
 * retention countdown now instead of at the session timeout.
 * Best effort: a failure leaves the chat to end at its timeout.
 */
export async function endChat(options: TransportOptions, sessionId: string): Promise<void> {
  try {
    await fetch(`${options.host}${sessionPath(sessionId, "reset")}`, {
      method: "POST",
      headers: { ...(await options.headers()), "content-type": "application/json" },
      body: "{}",
      keepalive: true,
      redirect: "error",
    });
  } catch {
    // Offline or refused; the timeout still ends it.
  }
}

// The agent writes a blank line every 10 s on a quiet stream, so this long without a byte is a dead one.
const STREAM_IDLE_MS = 15_000;

export class StreamIdleError extends Error {
  constructor() {
    super("The stream went quiet.");
    this.name = "StreamIdleError";
  }
}

export interface StreamOptions {
  /** The index of the first event to send. */
  startIndex: number;
  /** Ends the stream at the session's current last event instead of following it; the agent closes it there. */
  toTail?: boolean;
  signal: AbortSignal;
}

/** The chat's events from `startIndex` on, as they happen. Ends when the agent ends the response. */
export async function* streamEvents(
  options: TransportOptions,
  sessionId: string,
  { startIndex, toTail, signal }: StreamOptions,
): AsyncGenerator<MessageStreamEvent> {
  const query = new URLSearchParams();
  if (startIndex !== 0) query.set("startIndex", String(startIndex));
  if (toTail) query.set("includeTailIndex", "1");
  const search = query.size > 0 ? `?${query}` : "";
  const url = `${options.host}${sessionPath(sessionId, "stream")}${search}`;
  const res = await fetch(url, { headers: await options.headers(), cache: "no-store", redirect: "error", signal });
  if (!res.ok) throw await failure(res);
  if (!res.body) return;
  // The agent names the session it streams; anything else is not this chat's stream.
  if (res.headers.get(SESSION_ID_HEADER) !== sessionId) throw new AssistantHttpError(502, "The stream answered for another chat.");

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffered = "";
  try {
    for (;;) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const idle = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new StreamIdleError()), STREAM_IDLE_MS);
      });
      const { value, done } = await Promise.race([reader.read(), idle]).finally(() => clearTimeout(timer));
      if (done) break;
      buffered += value;
      let newline = buffered.indexOf("\n");
      while (newline !== -1) {
        const line = buffered.slice(0, newline).trim();
        buffered = buffered.slice(newline + 1);
        if (line) yield JSON.parse(line) as MessageStreamEvent;
        newline = buffered.indexOf("\n");
      }
    }
    const rest = buffered.trim();
    if (rest) yield JSON.parse(rest) as MessageStreamEvent;
  } finally {
    reader.cancel().catch(() => {});
  }
}
