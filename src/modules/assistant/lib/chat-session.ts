/**
 * One chat's state in the browser: its session, the events its stream has
 * brought, and the transcript they project to.
 *
 * The transcript is projected by the agent framework's own message reducer,
 * the same one its client uses, so tool parts, approvals and answers read
 * exactly as they always did; only the transport is the assistant's. While a
 * session exists its stream is followed, reconnecting where it left off, so
 * every event reaches the transcript once and in order.
 */
import {
  defaultMessageReducer,
  type EveAgentReducerEvent,
  type EveMessage,
  type EveMessageData,
  type InputResponse,
  isCurrentTurnBoundaryEvent,
  type MessageStreamEvent,
} from "eve/client";
import { AssistantHttpError } from "./session-client";
import { cancelTurn, prewarmChat, sendTurn, streamEvents, StreamIdleError, type TransportOptions } from "./transport";

export type ChatStatus = "ready" | "submitted" | "streaming" | "resuming" | "error";

/** What the browser keeps to resume a chat after a reload. */
export interface StoredSession {
  sessionId: string;
  /** How many of the session's events the transcript already holds. */
  streamIndex: number;
}

export interface ChatSnapshot {
  status: ChatStatus;
  messages: EveMessage[];
  session?: StoredSession;
  error?: Error;
}

export interface ChatSessionCallbacks {
  onEvent?: (event: MessageStreamEvent) => void;
  onSessionChange?: (session: StoredSession | undefined) => void;
}

export interface SendOptions {
  clientContext?: unknown;
  headers?: Record<string, string>;
}

// A stream that drops is reopened after these delays, longest last and then repeated.
const RECONNECT_DELAYS_MS = [250, 500, 1_000, 2_000, 4_000];
// Statuses worth reopening on: the agent restarting, or a new chat's session still being claimed.
const RETRYABLE = new Set([404, 409, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

const turnIdOf = (event: MessageStreamEvent): string | undefined => {
  const data = (event as { data?: { turnId?: unknown } }).data;
  return typeof data?.turnId === "string" ? data.turnId : undefined;
};

const newSubmissionId = () => `submission_${crypto.getRandomValues(new Uint32Array(2)).join("")}`;

interface Pending {
  submissionId: string;
  deliveryId?: string;
}

export class ChatSession {
  private readonly reducer = defaultMessageReducer();
  // Server events and the browser's own projection events, in order; the transcript is their fold.
  private projection: EveAgentReducerEvent[] = [];
  private data: EveMessageData = this.reducer.initial();
  private serverEvents = 0;
  private pending: Pending[] = [];
  private session: StoredSession | undefined;
  private status: ChatStatus = "ready";
  private error: Error | undefined;
  // Calls the agent has accepted whose turn has not yet started streaming.
  private awaitingTurn = 0;
  private follower: AbortController | null = null;
  private readonly listeners = new Set<() => void>();
  private snapshot: ChatSnapshot;
  private callbacks: ChatSessionCallbacks = {};

  constructor(
    private readonly transport: TransportOptions,
    initialSession?: StoredSession,
  ) {
    this.session = initialSession && { sessionId: initialSession.sessionId, streamIndex: 0 };
    this.replayed = initialSession === undefined;
    if (this.session) this.status = "resuming";
    this.snapshot = this.makeSnapshot();
  }

  setCallbacks(callbacks: ChatSessionCallbacks): void {
    this.callbacks = callbacks;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ChatSnapshot => this.snapshot;

  /** Follows the chat's stream, after replaying a stored chat into the transcript once. */
  start(): void {
    if (!this.session || this.follower) return;
    if (this.replayed) this.ensureFollowing();
    else void this.resume();
  }

  // False until a stored chat's history has replayed in full; a fresh chat has none to replay.
  private replayed: boolean;

  private async resume(): Promise<void> {
    const session = this.session;
    if (!session) return;
    // A replay cut short (the view remounting) starts over, so no event is counted twice.
    this.projection = [];
    this.data = this.reducer.initial();
    this.serverEvents = 0;
    this.turnActive = false;
    this.status = "resuming";
    this.notify();
    const controller = new AbortController();
    this.follower = controller;
    try {
      for await (const event of streamEvents(this.transport, session.sessionId, {
        startIndex: 0,
        toTail: true,
        signal: controller.signal,
      })) {
        if (controller.signal.aborted) return;
        this.accept(event);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      this.fail(err);
      this.follower = null;
      return;
    }
    if (controller.signal.aborted) return;
    this.replayed = true;
    if (this.error) this.status = "error";
    else this.status = this.turnActive ? "streaming" : "ready";
    this.notify();
    void this.follow(controller);
  }

  /**
   * Creates the session before the first message, so that message starts its
   * turn at once. Nothing to do for a chat that has a session; a chat whose
   * first message is already on its way keeps that message's session. Best
   * effort: a failure leaves the first message to create the session.
   */
  async prewarm(): Promise<void> {
    if (this.session || this.prewarming) return;
    this.prewarming = true;
    try {
      const sessionId = await prewarmChat(this.transport);
      // The first message may have created the session meanwhile; its id wins.
      if (!sessionId || this.session) return;
      this.session = { sessionId, streamIndex: 0 };
      this.callbacks.onSessionChange?.(this.session);
      this.notify();
    } catch {
      // Offline or refused; the first message creates the session instead.
    } finally {
      this.prewarming = false;
    }
  }

  private prewarming = false;

  /** Sends a message; the first one starts the chat. Failures are shown, not thrown. */
  async send(text: string, options: SendOptions = {}): Promise<void> {
    const submissionId = newSubmissionId();
    this.pending.push({ submissionId });
    this.project({
      type: "client.message.submitted",
      data: { createdAt: Date.now(), message: text, submissionId },
    });
    this.error = undefined;
    this.status = "submitted";
    this.awaitingTurn++;
    this.notify();
    try {
      const body = { message: text, ...(options.clientContext === undefined ? {} : { clientContext: options.clientContext }) };
      const accepted = await sendTurn(this.transport, this.session?.sessionId, body, options.headers);
      if (!this.session) {
        this.session = { sessionId: accepted.sessionId, streamIndex: 0 };
        this.callbacks.onSessionChange?.(this.session);
      }
      this.ensureFollowing();
      const pending = this.pending.find((p) => p.submissionId === submissionId);
      if (pending) pending.deliveryId = accepted.deliveryId;
      // The stream may have reported the message before the POST returned.
      this.settleEchoes();
    } catch (err) {
      this.awaitingTurn = Math.max(0, this.awaitingTurn - 1);
      this.pending = this.pending.filter((p) => p.submissionId !== submissionId);
      this.replaceProjection(
        (e) => e.type === "client.message.submitted" && e.data.submissionId === submissionId,
        {
          type: "client.message.failed",
          data: { createdAt: Date.now(), message: text, submissionId, error: { message: (err as Error).message } },
        },
      );
      this.fail(err);
    }
  }

  /** Answers the requests the chat is parked on. Throws when the agent refuses, so the caller can retry. */
  async respond(responses: InputResponse[], options: SendOptions = {}): Promise<void> {
    const session = this.session;
    if (!session) throw new AssistantHttpError(409, "There is no chat to answer.");
    const event: EveAgentReducerEvent = { type: "client.input.responded", data: { createdAt: Date.now(), responses } };
    this.project(event);
    this.error = undefined;
    this.status = "submitted";
    this.awaitingTurn++;
    this.notify();
    try {
      const body = {
        inputResponses: responses,
        ...(options.clientContext === undefined ? {} : { clientContext: options.clientContext }),
      };
      await sendTurn(this.transport, session.sessionId, body, options.headers);
      this.ensureFollowing();
    } catch (err) {
      this.awaitingTurn = Math.max(0, this.awaitingTurn - 1);
      this.removeProjection((e) => e === event);
      this.status = this.turnActive ? "streaming" : "ready";
      this.notify();
      throw err;
    }
  }

  async cancel(): Promise<void> {
    if (this.session) await cancelTurn(this.transport, this.session.sessionId);
  }

  /** Forgets the chat: a new message starts a new one. */
  reset(): void {
    this.stop();
    this.projection = [];
    this.data = this.reducer.initial();
    this.serverEvents = 0;
    this.pending = [];
    this.awaitingTurn = 0;
    this.turnActive = false;
    this.error = undefined;
    this.status = "ready";
    this.replayed = true;
    const had = this.session !== undefined;
    this.session = undefined;
    if (had) this.callbacks.onSessionChange?.(undefined);
    this.notify();
  }

  /** Stops following the stream; the chat itself stays as it is. */
  stop(): void {
    this.follower?.abort();
    this.follower = null;
  }

  private turnActive = false;

  private ensureFollowing() {
    if (this.follower || !this.session) return;
    const controller = new AbortController();
    this.follower = controller;
    void this.follow(controller);
  }

  private async follow(controller: AbortController): Promise<void> {
    let attempt = 0;
    while (!controller.signal.aborted && this.session) {
      const sessionId = this.session.sessionId;
      let received = false;
      try {
        for await (const event of streamEvents(this.transport, sessionId, {
          startIndex: this.serverEvents,
          signal: controller.signal,
        })) {
          if (controller.signal.aborted) return;
          received = true;
          attempt = 0;
          this.accept(event);
          if (event.type === "session.completed" || event.type === "session.failed") {
            if (this.follower === controller) this.follower = null;
            return;
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const retryable =
          err instanceof StreamIdleError ||
          err instanceof TypeError ||
          (err instanceof AssistantHttpError && RETRYABLE.has(err.status));
        if (!retryable) {
          if (this.follower === controller) this.follower = null;
          this.fail(err);
          return;
        }
      }
      if (!received) attempt++;
      await sleep(RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)], controller.signal);
    }
  }

  private accept(event: MessageStreamEvent) {
    this.serverEvents++;
    if (this.session) this.session = { ...this.session, streamIndex: this.serverEvents };

    if (event.type === "message.received") this.settleEcho(event);
    this.project(event);

    const resuming = this.status === "resuming";
    if (event.type === "turn.started") this.turnActive = true;
    if (event.type === "session.failed") {
      const failure = new Error(event.data.message);
      failure.name = event.data.code;
      this.error = failure;
      this.status = "error";
    } else if (isCurrentTurnBoundaryEvent(event)) {
      this.turnActive = false;
      if (!resuming && this.awaitingTurn === 0) this.status = this.error ? "error" : "ready";
    } else if (turnIdOf(event) !== undefined && !resuming) {
      if (this.awaitingTurn > 0) this.awaitingTurn--;
      this.status = "streaming";
    }

    this.callbacks.onEvent?.(event);
    this.callbacks.onSessionChange?.(this.session);
    if (!resuming) this.notify();
  }

  /** The optimistic copy of a message the agent just reported, dropped in favour of its own. */
  private settleEcho(event: Extract<MessageStreamEvent, { type: "message.received" }>) {
    const ids = (event as { meta?: { deliveryIds?: readonly string[] } }).meta?.deliveryIds ?? [];
    const match =
      this.pending.find((p) => p.deliveryId !== undefined && ids.includes(p.deliveryId)) ??
      // A message sent before its POST returned has no delivery id yet; the oldest one is it.
      this.pending.find((p) => p.deliveryId === undefined);
    if (!match) return;
    this.pending = this.pending.filter((p) => p !== match);
    this.removeProjection((e) => e.type === "client.message.submitted" && e.data.submissionId === match.submissionId);
  }

  private settleEchoes() {
    for (const event of this.projection) {
      if (event.type !== "message.received") continue;
      const ids = (event as { meta?: { deliveryIds?: readonly string[] } }).meta?.deliveryIds ?? [];
      const match = this.pending.find((p) => p.deliveryId !== undefined && ids.includes(p.deliveryId));
      if (!match) continue;
      this.pending = this.pending.filter((p) => p !== match);
      this.removeProjection((e) => e.type === "client.message.submitted" && e.data.submissionId === match.submissionId);
    }
    this.notify();
  }

  private fail(err: unknown) {
    this.error = err instanceof Error ? err : new Error(String(err));
    this.status = "error";
    this.notify();
  }

  private project(event: EveAgentReducerEvent) {
    this.projection.push(event);
    this.data = this.reducer.reduce(this.data, event);
  }

  private removeProjection(matches: (event: EveAgentReducerEvent) => boolean) {
    const before = this.projection.length;
    this.projection = this.projection.filter((e) => !matches(e));
    if (this.projection.length !== before) this.refold();
  }

  private replaceProjection(matches: (event: EveAgentReducerEvent) => boolean, next: EveAgentReducerEvent) {
    const index = this.projection.findIndex(matches);
    if (index === -1) this.projection.push(next);
    else this.projection[index] = next;
    this.refold();
  }

  private refold() {
    let data = this.reducer.initial();
    for (const event of this.projection) data = this.reducer.reduce(data, event);
    this.data = data;
  }

  private makeSnapshot(): ChatSnapshot {
    return {
      status: this.status,
      messages: this.data.messages as EveMessage[],
      ...(this.session ? { session: this.session } : {}),
      ...(this.error ? { error: this.error } : {}),
    };
  }

  private notify() {
    this.snapshot = this.makeSnapshot();
    for (const listener of this.listeners) listener();
  }
}
