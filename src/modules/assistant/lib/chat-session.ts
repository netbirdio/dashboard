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
import {
  cancelTurn,
  prewarmChat,
  sendTurn,
  STREAM_IDLE_MS,
  streamEvents,
  StreamIdleError,
  type TransportOptions,
} from "./transport";

export type ChatStatus = "ready" | "submitted" | "streaming" | "resuming" | "error";

export interface StoredSession {
  sessionId: string;
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

const RECONNECT_DELAYS_MS = [250, 500, 1_000, 2_000, 4_000];
// 404/409/425 are retried too: a new chat's session may still be being claimed.
const RETRYABLE = new Set([404, 409, 425, 429, 500, 502, 503, 504]);
const MAX_FOLLOW_FAILURES = 10;
const HEALTHY_CONNECTION_MS = 2 * STREAM_IDLE_MS;
const CANCEL_TIMEOUT_MS = 15_000;
const PREWARM_WAIT_MS = 5_000;

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
  private projection: EveAgentReducerEvent[] = [];
  private data: EveMessageData = this.reducer.initial();
  private serverEvents = 0;
  private pending: Pending[] = [];
  private session: StoredSession | undefined;
  private status: ChatStatus = "ready";
  private error: Error | undefined;
  private awaitingTurn = 0;
  private follower: AbortController | null = null;
  private generation = 0;
  private stopped = false;
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

  start(): void {
    this.stopped = false;
    if (!this.session || this.follower) return;
    if (this.replayed) this.ensureFollowing();
    else void this.resume();
  }

  private replayed: boolean;

  private async resume(): Promise<void> {
    const session = this.session;
    if (!session) return;
    // A replay cut short by a remount starts over, so no event is counted twice.
    this.projection = [];
    this.data = this.reducer.initial();
    this.serverEvents = 0;
    this.turnActive = false;
    this.status = "resuming";
    this.notify();
    const controller = new AbortController();
    this.follower = controller;
    let ended = false;
    try {
      for await (const event of streamEvents(this.transport, session.sessionId, {
        startIndex: 0,
        toTail: true,
        signal: controller.signal,
      })) {
        if (controller.signal.aborted) return;
        this.accept(event);
        if (event.type === "session.completed" || event.type === "session.failed") ended = true;
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
    if (ended) {
      if (this.follower === controller) this.follower = null;
      return;
    }
    void this.follow(controller);
  }

  async prewarm(): Promise<void> {
    if (this.session || this.prewarming) return;
    const prewarming = this.adoptPrewarmed();
    this.prewarming = prewarming;
    try {
      await prewarming;
    } finally {
      if (this.prewarming === prewarming) this.prewarming = null;
    }
  }

  private async adoptPrewarmed(): Promise<void> {
    const generation = this.generation;
    const epoch = this.prewarmEpoch;
    try {
      const sessionId = await prewarmChat(this.transport);
      if (!sessionId || this.session || generation !== this.generation || epoch !== this.prewarmEpoch) return;
      this.session = { sessionId, streamIndex: 0 };
      this.callbacks.onSessionChange?.(this.session);
      this.notify();
    } catch {
      // Offline or refused; the first message creates the session instead.
    }
  }

  private prewarming: Promise<void> | null = null;
  private prewarmEpoch = 0;

  private async prewarmSettled(prewarming: Promise<void>): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const gaveUp = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(true), PREWARM_WAIT_MS);
    });
    const late = await Promise.race([prewarming.then(() => false), gaveUp]);
    clearTimeout(timer);
    if (!late || this.prewarming !== prewarming) return;
    this.prewarming = null;
    this.prewarmEpoch++;
  }
  private readonly sends = new Set<Promise<void>>();

  async send(text: string, options: SendOptions = {}): Promise<void> {
    const sending = this.submit(text, options);
    this.sends.add(sending);
    try {
      await sending;
    } finally {
      this.sends.delete(sending);
    }
  }

  private async submit(text: string, options: SendOptions): Promise<void> {
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
    const generation = this.generation;
    try {
      if (this.prewarming) await this.prewarmSettled(this.prewarming);
      if (generation !== this.generation) return;
      const body = { message: text, ...(options.clientContext === undefined ? {} : { clientContext: options.clientContext }) };
      const accepted = await sendTurn(this.transport, this.session?.sessionId, body, options.headers);
      if (generation !== this.generation) return;
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
      if (generation !== this.generation) return;
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

  // Unlike `send`, this throws when the agent refuses, so the caller can retry.
  async respond(responses: InputResponse[], options: SendOptions = {}): Promise<void> {
    const session = this.session;
    if (!session) throw new AssistantHttpError(409, "There is no chat to answer.");
    const event: EveAgentReducerEvent = { type: "client.input.responded", data: { createdAt: Date.now(), responses } };
    this.project(event);
    this.error = undefined;
    this.status = "submitted";
    this.awaitingTurn++;
    this.notify();
    const generation = this.generation;
    try {
      const body = {
        inputResponses: responses,
        ...(options.clientContext === undefined ? {} : { clientContext: options.clientContext }),
      };
      await sendTurn(this.transport, session.sessionId, body, options.headers);
      if (generation !== this.generation) return;
      this.ensureFollowing();
    } catch (err) {
      if (generation !== this.generation) throw err;
      this.awaitingTurn = Math.max(0, this.awaitingTurn - 1);
      this.removeProjection((e) => e === event);
      this.status = this.turnActive ? "streaming" : "ready";
      this.notify();
      throw err;
    }
  }

  async cancel(): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new DOMException("The cancel request timed out.", "TimeoutError")),
      CANCEL_TIMEOUT_MS,
    );
    const timedOut = new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
    });
    const cancelling = this.cancelOnceAccepted(controller.signal);
    cancelling.catch(() => {});
    try {
      await Promise.race([cancelling, timedOut]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async cancelOnceAccepted(signal: AbortSignal): Promise<void> {
    const generation = this.generation;
    await Promise.all(this.sends);
    if (signal.aborted || generation !== this.generation || !this.session) return;
    await cancelTurn(this.transport, this.session.sessionId, signal);
  }

  reset(): void {
    this.follower?.abort();
    this.follower = null;
    this.generation++;
    this.prewarming = null;
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

  stop(): void {
    this.stopped = true;
    this.follower?.abort();
    this.follower = null;
  }

  private turnActive = false;

  private ensureFollowing() {
    if (this.follower || !this.session || this.stopped) return;
    const controller = new AbortController();
    this.follower = controller;
    void this.follow(controller);
  }

  private async follow(controller: AbortController): Promise<void> {
    let attempt = 0;
    let failures = 0;
    let reauthorised = false;
    while (!controller.signal.aborted && this.session) {
      const sessionId = this.session.sessionId;
      let received = false;
      let openedAt: number | undefined;
      try {
        for await (const event of streamEvents(this.transport, sessionId, {
          startIndex: this.serverEvents,
          signal: controller.signal,
          onOpen: () => {
            openedAt = Date.now();
          },
        })) {
          if (controller.signal.aborted) return;
          received = true;
          attempt = 0;
          failures = 0;
          reauthorised = false;
          try {
            this.accept(event);
          } catch (err) {
            if (this.follower === controller) this.follower = null;
            this.fail(new Error("The assistant sent an event the dashboard could not handle.", { cause: err }));
            return;
          }
          if (event.type === "session.completed" || event.type === "session.failed") {
            if (this.follower === controller) this.follower = null;
            return;
          }
        }
        const lived = openedAt === undefined ? 0 : Date.now() - openedAt;
        if (!received && !controller.signal.aborted && lived < HEALTHY_CONNECTION_MS) throw new StreamIdleError();
      } catch (err) {
        if (controller.signal.aborted) return;
        if (openedAt !== undefined && Date.now() - openedAt >= HEALTHY_CONNECTION_MS) {
          attempt = 0;
          failures = 0;
          reauthorised = false;
        }
        const expired = err instanceof AssistantHttpError && err.status === 401 && !reauthorised;
        if (expired) reauthorised = true;
        const retryable =
          expired ||
          err instanceof StreamIdleError ||
          err instanceof TypeError ||
          (err instanceof AssistantHttpError && RETRYABLE.has(err.status));
        if (!retryable || ++failures >= MAX_FOLLOW_FAILURES) {
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
