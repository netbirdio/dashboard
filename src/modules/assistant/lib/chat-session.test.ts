import type { MessageStreamEvent } from "eve/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatSession } from "./chat-session";
import { AssistantHttpError } from "./session-client";
import { type Accepted, cancelTurn, prewarmChat, sendTurn, streamEvents } from "./transport";

vi.mock("./transport", async (original) => ({
  ...(await original<typeof import("./transport")>()),
  sendTurn: vi.fn(),
  prewarmChat: vi.fn(),
  cancelTurn: vi.fn(),
  streamEvents: vi.fn(),
}));

const transport = { host: "https://assistant.test", headers: async () => ({}) };

const event = (type: string, data: Record<string, unknown> = {}) => ({ type, data }) as unknown as MessageStreamEvent;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Stream = (signal: AbortSignal, opened: () => void) => AsyncGenerator<MessageStreamEvent>;

function streams(...list: Stream[]) {
  let next = 0;
  vi.mocked(streamEvents).mockImplementation((_options, _sessionId, { signal, onOpen }) =>
    list[Math.min(next++, list.length - 1)](signal, () => onOpen?.()),
  );
}

const failing = (err: unknown): Stream =>
  async function* () {
    throw err;
  };

const quiet: Stream = async function* (signal, opened) {
  opened();
  await new Promise((resolve) => signal.addEventListener("abort", resolve, { once: true }));
};

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), resolve()), { once: true });
  });

const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
  streams(quiet);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("a chat discarded while a request is in flight", () => {
  it("is not revived when the first message is accepted after a reset", async () => {
    const accepted = deferred<Accepted>();
    vi.mocked(sendTurn).mockReturnValue(accepted.promise);
    const onSessionChange = vi.fn();
    const chat = new ChatSession(transport);
    chat.setCallbacks({ onSessionChange });

    const sending = chat.send("hello");
    chat.reset();
    accepted.resolve({ sessionId: "discarded" });
    await sending;
    await flush();

    expect(chat.getSnapshot()).toEqual({ status: "ready", messages: [] });
    expect(onSessionChange).not.toHaveBeenCalled();
    expect(streamEvents).not.toHaveBeenCalled();
  });

  it("does not report the discarded message's failure in the next chat", async () => {
    const accepted = deferred<Accepted>();
    vi.mocked(sendTurn).mockReturnValue(accepted.promise);
    const chat = new ChatSession(transport);

    const sending = chat.send("hello");
    chat.reset();
    accepted.reject(new AssistantHttpError(500, "boom"));
    await sending;

    expect(chat.getSnapshot()).toEqual({ status: "ready", messages: [] });
  });

  it("does not follow after an answer is accepted for a reset chat", async () => {
    const accepted = deferred<Accepted>();
    vi.mocked(sendTurn).mockReturnValue(accepted.promise);
    const chat = new ChatSession(transport, { sessionId: "s1", streamIndex: 0 });

    const responding = chat.respond([]);
    chat.reset();
    accepted.resolve({ sessionId: "s1" });
    await responding;
    await flush();

    expect(chat.getSnapshot()).toEqual({ status: "ready", messages: [] });
    expect(streamEvents).not.toHaveBeenCalled();
  });

  it("does not adopt a session prewarmed for a reset chat", async () => {
    const prewarmed = deferred<string | null>();
    vi.mocked(prewarmChat).mockReturnValue(prewarmed.promise);
    const chat = new ChatSession(transport);

    const prewarming = chat.prewarm();
    chat.reset();
    prewarmed.resolve("discarded");
    await prewarming;

    expect(chat.getSnapshot().session).toBeUndefined();
  });

  it("follows nothing while stopped, and picks the chat up when started again", async () => {
    const accepted = deferred<Accepted>();
    vi.mocked(sendTurn).mockReturnValue(accepted.promise);
    const chat = new ChatSession(transport);

    const sending = chat.send("hello");
    chat.stop();
    accepted.resolve({ sessionId: "s1" });
    await sending;
    await flush();
    expect(streamEvents).not.toHaveBeenCalled();

    chat.start();
    await flush();
    expect(streamEvents).toHaveBeenCalledTimes(1);
    expect(chat.getSnapshot().session?.sessionId).toBe("s1");
    chat.stop();
  });

  it("follows the chat that a message starts after a reset in place", async () => {
    vi.mocked(sendTurn).mockResolvedValue({ sessionId: "s1" });
    const chat = new ChatSession(transport);
    chat.start();
    await chat.send("hello");
    await flush();

    chat.reset();
    vi.mocked(sendTurn).mockResolvedValue({ sessionId: "s2" });
    await chat.send("again");
    await flush();

    expect(vi.mocked(streamEvents).mock.calls.map(([, sessionId]) => sessionId)).toEqual(["s1", "s2"]);
    chat.stop();
  });

  it("stays unfollowed when reset after it was stopped", async () => {
    vi.mocked(sendTurn).mockResolvedValue({ sessionId: "s1" });
    const chat = new ChatSession(transport);
    chat.stop();
    chat.reset();

    await chat.send("hello");
    await flush();

    expect(streamEvents).not.toHaveBeenCalled();
  });
});

describe("a session prewarmed while the first message is sent", () => {
  it("sends the message to the prewarmed session and follows it", async () => {
    const prewarmed = deferred<string | null>();
    vi.mocked(prewarmChat).mockReturnValue(prewarmed.promise);
    vi.mocked(sendTurn).mockImplementation(async (_options, sessionId) => ({ sessionId: sessionId ?? "created" }));
    const chat = new ChatSession(transport);

    const prewarming = chat.prewarm();
    const sending = chat.send("hello");
    await flush();
    prewarmed.resolve("prewarmed");
    await prewarming;
    await sending;
    await flush();

    expect(vi.mocked(sendTurn).mock.calls[0][1]).toBe("prewarmed");
    expect(vi.mocked(streamEvents).mock.calls.map(([, sessionId]) => sessionId)).toEqual(["prewarmed"]);
    expect(chat.getSnapshot().session?.sessionId).toBe("prewarmed");
    chat.stop();
  });

  it("sends nothing for a chat reset while it waited for the prewarm", async () => {
    const prewarmed = deferred<string | null>();
    vi.mocked(prewarmChat).mockReturnValue(prewarmed.promise);
    const chat = new ChatSession(transport);

    const prewarming = chat.prewarm();
    const sending = chat.send("hello");
    chat.reset();
    prewarmed.resolve("prewarmed");
    await prewarming;
    await sending;

    expect(sendTurn).not.toHaveBeenCalled();
    expect(chat.getSnapshot()).toEqual({ status: "ready", messages: [] });
  });
});

describe("a prewarm that does not settle", () => {
  it("stops holding the first message, and its late session is not adopted", async () => {
    const prewarmed = deferred<string | null>();
    vi.mocked(prewarmChat).mockReturnValue(prewarmed.promise);
    const accepted = deferred<Accepted>();
    vi.mocked(sendTurn).mockReturnValue(accepted.promise);
    const chat = new ChatSession(transport);

    void chat.prewarm();
    const sending = chat.send("hello");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(vi.mocked(sendTurn).mock.calls.map(([, sessionId]) => sessionId)).toEqual([undefined]);

    prewarmed.resolve("prewarmed");
    await flush();
    accepted.resolve({ sessionId: "created" });
    await sending;
    await flush();

    expect(chat.getSnapshot().session?.sessionId).toBe("created");
    expect(vi.mocked(streamEvents).mock.calls.map(([, sessionId]) => sessionId)).toEqual(["created"]);
    chat.stop();
  });

  it("is not inherited by the chat that a reset starts", async () => {
    vi.mocked(prewarmChat).mockReturnValueOnce(new Promise(() => {})).mockResolvedValueOnce("fresh");
    const chat = new ChatSession(transport);

    void chat.prewarm();
    chat.reset();
    await chat.prewarm();

    expect(prewarmChat).toHaveBeenCalledTimes(2);
    expect(chat.getSnapshot().session?.sessionId).toBe("fresh");
  });
});

describe("cancelling", () => {
  it("cancels the turn of a first message that is still being sent, once it is accepted", async () => {
    const accepted = deferred<Accepted>();
    vi.mocked(sendTurn).mockReturnValue(accepted.promise);
    vi.mocked(cancelTurn).mockResolvedValue();
    const chat = new ChatSession(transport);

    const sending = chat.send("hello");
    const cancelling = chat.cancel();
    await flush();
    expect(cancelTurn).not.toHaveBeenCalled();

    accepted.resolve({ sessionId: "s1" });
    await sending;
    await cancelling;

    expect(vi.mocked(cancelTurn).mock.calls[0][1]).toBe("s1");
    chat.stop();
  });

  it("has nothing to cancel when the message it waited for was refused", async () => {
    vi.mocked(sendTurn).mockRejectedValue(new AssistantHttpError(500, "boom"));
    const chat = new ChatSession(transport);

    const sending = chat.send("hello");
    await expect(chat.cancel()).resolves.toBeUndefined();
    await sending;

    expect(cancelTurn).not.toHaveBeenCalled();
  });

  it("gives up on a cancel request that never settles", async () => {
    vi.mocked(sendTurn).mockResolvedValue({ sessionId: "s1" });
    vi.mocked(cancelTurn).mockReturnValue(new Promise(() => {}));
    const chat = new ChatSession(transport);
    await chat.send("hello");

    const outcome = chat.cancel().then(
      () => "cancelled",
      (err: Error) => err.name,
    );
    await vi.advanceTimersByTimeAsync(60_000);

    await expect(outcome).resolves.toBe("TimeoutError");
    expect(vi.mocked(cancelTurn).mock.calls[0][2]?.aborted).toBe(true);
    chat.stop();
  });
});

describe("following the stream", () => {
  async function following(...list: Stream[]) {
    streams(...list);
    vi.mocked(sendTurn).mockResolvedValue({ sessionId: "s1" });
    const chat = new ChatSession(transport);
    await chat.send("hello");
    await flush();
    return chat;
  }

  it("gives up and reports the error after repeated failed connections", async () => {
    const down = new AssistantHttpError(503, "down");
    const chat = await following(failing(down));

    await vi.advanceTimersByTimeAsync(120_000);

    expect(chat.getSnapshot().status).toBe("error");
    expect(chat.getSnapshot().error).toBe(down);
    const attempts = vi.mocked(streamEvents).mock.calls.length;
    expect(attempts).toBe(10);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(streamEvents).toHaveBeenCalledTimes(attempts);
  });

  it("keeps retrying a session that is still being claimed", async () => {
    const unclaimed = failing(new AssistantHttpError(404, "not yet"));
    const chat = await following(unclaimed, unclaimed, unclaimed, quiet);

    await vi.advanceTimersByTimeAsync(30_000);

    expect(streamEvents).toHaveBeenCalledTimes(4);
    expect(chat.getSnapshot().status).not.toBe("error");
    chat.stop();
  });

  it("starts counting again once events arrive", async () => {
    const flaky: Stream = async function* () {
      yield event("turn.started", { turnId: "t1" });
      throw new AssistantHttpError(503, "down");
    };
    const chat = await following(...Array.from({ length: 15 }, () => flaky), quiet);

    await vi.advanceTimersByTimeAsync(120_000);

    expect(streamEvents).toHaveBeenCalledTimes(16);
    expect(chat.getSnapshot().status).not.toBe("error");
    chat.stop();
  });

  it("does not count the drops of connections that had been healthy", async () => {
    const dropsAfterAMinute: Stream = async function* (signal, opened) {
      opened();
      await wait(60_000, signal);
      throw new TypeError("network error");
    };
    const chat = await following(dropsAfterAMinute);

    await vi.advanceTimersByTimeAsync(15 * 60_000);

    expect(vi.mocked(streamEvents).mock.calls.length).toBeGreaterThan(12);
    expect(chat.getSnapshot().status).not.toBe("error");
    chat.stop();
  });

  it("still gives up on connections that open and drop at once", async () => {
    const dropsAtOnce: Stream = async function* (_signal, opened) {
      opened();
      throw new TypeError("network error");
    };
    const chat = await following(dropsAtOnce);

    await vi.advanceTimersByTimeAsync(120_000);

    expect(chat.getSnapshot().status).toBe("error");
    expect(streamEvents).toHaveBeenCalledTimes(10);
  });

  it("gives up on a stream that keeps opening and closing without an event", async () => {
    const chat = await following(async function* (_signal, opened) {
      opened();
    });

    await vi.advanceTimersByTimeAsync(120_000);

    expect(chat.getSnapshot().status).toBe("error");
    expect(streamEvents).toHaveBeenCalledTimes(10);
  });

  it("does not count an idle connection that closed after staying open", async () => {
    const chat = await following(async function* (signal, opened) {
      opened();
      await wait(60_000, signal);
    });

    await vi.advanceTimersByTimeAsync(15 * 60_000);

    expect(vi.mocked(streamEvents).mock.calls.length).toBeGreaterThan(12);
    expect(chat.getSnapshot().status).not.toBe("error");
    chat.stop();
  });

  it("retries once with fresh headers when the stream is refused as unauthorised", async () => {
    const expired = failing(new AssistantHttpError(401, "expired"));
    const chat = await following(expired, quiet);

    await vi.advanceTimersByTimeAsync(10_000);

    expect(streamEvents).toHaveBeenCalledTimes(2);
    expect(chat.getSnapshot().status).not.toBe("error");
    chat.stop();
  });

  it("reports a stream that stays unauthorised", async () => {
    const chat = await following(failing(new AssistantHttpError(401, "expired")));

    await vi.advanceTimersByTimeAsync(10_000);

    expect(streamEvents).toHaveBeenCalledTimes(2);
    expect(chat.getSnapshot().status).toBe("error");
  });

  it("fails the chat instead of reconnecting when an event cannot be handled", async () => {
    streams(async function* (signal, opened) {
      yield event("turn.started", { turnId: "t1" });
      yield* quiet(signal, opened);
    });
    vi.mocked(sendTurn).mockResolvedValue({ sessionId: "s1" });
    const chat = new ChatSession(transport);
    chat.setCallbacks({
      onEvent: () => {
        throw new TypeError("Cannot read properties of undefined");
      },
    });
    await chat.send("hello");

    await vi.advanceTimersByTimeAsync(120_000);

    const { status, error } = chat.getSnapshot();
    expect(status).toBe("error");
    expect(error).not.toBeInstanceOf(TypeError);
    expect(error?.cause).toBeInstanceOf(TypeError);
    expect(streamEvents).toHaveBeenCalledTimes(1);
  });
});

describe("resuming a stored session", () => {
  it("does not follow a session whose replay already ended", async () => {
    streams(async function* (_signal, opened) {
      opened();
      yield event("session.completed");
    });
    const chat = new ChatSession(transport, { sessionId: "s1", streamIndex: 0 });

    chat.start();
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(streamEvents).toHaveBeenCalledTimes(1);
    expect(chat.getSnapshot().status).toBe("ready");
  });
});

describe("two first messages sent at once", () => {
  it("sends the second to the session the first one created", async () => {
    const first = deferred<Accepted>();
    vi.mocked(sendTurn)
      .mockReturnValueOnce(first.promise)
      .mockImplementation(async (_options, sessionId) => ({ sessionId: sessionId ?? "second" }) as Accepted);
    const chat = new ChatSession(transport);

    const a = chat.send("a");
    const b = chat.send("b");
    await flush();
    expect(sendTurn).toHaveBeenCalledTimes(1);
    first.resolve({ sessionId: "created" } as Accepted);
    await Promise.all([a, b]);

    expect(vi.mocked(sendTurn).mock.calls.map(([, sessionId]) => sessionId)).toEqual([undefined, "created"]);
    expect(chat.getSnapshot().session?.sessionId).toBe("created");
    chat.stop();
  });

  it("lets the second create the session when the first is refused", async () => {
    const first = deferred<Accepted>();
    vi.mocked(sendTurn)
      .mockReturnValueOnce(first.promise)
      .mockImplementation(async () => ({ sessionId: "second" }) as Accepted);
    const chat = new ChatSession(transport);

    const a = chat.send("a");
    const b = chat.send("b");
    await flush();
    first.reject(new AssistantHttpError(500, "refused"));
    await Promise.all([a, b]);

    expect(chat.getSnapshot().session?.sessionId).toBe("second");
    chat.stop();
  });

  it("does not hold the first message of the chat a reset starts", async () => {
    const first = deferred<Accepted>();
    vi.mocked(sendTurn)
      .mockReturnValueOnce(first.promise)
      .mockImplementation(async () => ({ sessionId: "fresh" }) as Accepted);
    const chat = new ChatSession(transport);

    void chat.send("a");
    await flush();
    chat.reset();
    await chat.send("b");

    expect(chat.getSnapshot().session?.sessionId).toBe("fresh");
    chat.stop();
  });
});
