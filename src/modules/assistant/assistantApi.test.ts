import { describe, expect, it, vi } from "vitest";
import {
  AssistantHttpError,
  describeFailure,
  streamChat,
  streamTurn,
  UNKNOWN_MODEL,
} from "./assistantApi";

const jsonError = (error: string) => JSON.stringify({ error });

describe("describeFailure", () => {
  it("writes a 400 for the user instead of pasting the server's string", () => {
    const message = describeFailure(400, jsonError(UNKNOWN_MODEL));

    // The old text was "unknown model Try again in a moment." — ungrammatical,
    // and wrong: retrying an unknown model changes nothing.
    expect(message).not.toContain("unknown model");
    expect(message).not.toContain("Try again in a moment");
    expect(message).toContain("Reopen the assistant");
  });

  it("maps the other 400 bodies to something actionable", () => {
    expect(describeFailure(400, jsonError("request blocked by guardrails"))).toContain(
      "rewording",
    );
    expect(describeFailure(400, jsonError("too many messages"))).toContain(
      "new chat",
    );
    // An unrecognised 400 still avoids echoing the raw body.
    const unknown = describeFailure(400, jsonError("something internal"));
    expect(unknown).not.toContain("something internal");
    expect(unknown).toContain("new chat");
  });

  it("keeps the per-status messages, and never echoes a server string", () => {
    expect(describeFailure(401, "")).toContain("Reload the page");
    expect(describeFailure(402, "")).toContain("usage limit");
    expect(describeFailure(429, "")).toContain("give it a moment");
    expect(describeFailure(503, "")).toContain("restarting");
    expect(describeFailure(418, jsonError("teapot"))).not.toContain("teapot");
  });
});

describe("streamChat", () => {
  it("throws with the status, the written message and the raw detail", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(jsonError(UNKNOWN_MODEL), { status: 400 }),
    );

    const stream = streamChat(fetchFn as never, "https://assistant.test", {
      messages: [{ role: "user", content: "hi" }],
      model: "claude-opus-4-8",
    });

    const err = await stream.next().then(
      () => null,
      (e) => e as AssistantHttpError,
    );
    expect(err).toBeInstanceOf(AssistantHttpError);
    expect(err!.status).toBe(400);
    // The prose is for the thread; the detail is what callers branch on.
    expect(err!.detail).toBe(UNKNOWN_MODEL);
    expect(err!.message).toContain("Reopen the assistant");
  });
});

describe("streamTurn", () => {
  /** An SSE body with a single `done` event — enough to drive one turn. */
  const sseOk = () =>
    new Response('event: done\ndata: {"stopReason":"end_turn"}\n\n', {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });

  it("drops a model the server refused and retries the turn", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response(jsonError(UNKNOWN_MODEL), { status: 400 }))
      .mockResolvedValueOnce(sseOk());
    const onDropped = vi.fn();

    const events = [];
    for await (const event of streamTurn(
      fetchFn as never,
      "https://assistant.test",
      { messages: [{ role: "user", content: "hi" }], model: "claude-opus-4-8" },
      undefined,
      onDropped,
    )) {
      events.push(event);
    }

    // The user's turn went through rather than erroring.
    expect(events).toEqual([{ type: "done", stopReason: "end_turn" }]);
    expect(onDropped).toHaveBeenCalledWith("claude-opus-4-8");
    // The retry named no model, so the server picks its own current default.
    expect(JSON.parse(fetchFn.mock.calls[1][1].body).model).toBeUndefined();
  });

  it("leaves every other failure to the caller", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(jsonError("usage limit reached"), { status: 402 }),
    );
    const onDropped = vi.fn();

    const run = (async () => {
      for await (const _ of streamTurn(
        fetchFn as never,
        "https://assistant.test",
        { messages: [{ role: "user", content: "hi" }], model: "claude-sonnet-5" },
        undefined,
        onDropped,
      )) {
        // no-op
      }
    })();

    await expect(run).rejects.toBeInstanceOf(AssistantHttpError);
    expect(onDropped).not.toHaveBeenCalled();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does not retry when no model was named", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(jsonError(UNKNOWN_MODEL), { status: 400 }),
    );

    const run = (async () => {
      for await (const _ of streamTurn(
        fetchFn as never,
        "https://assistant.test",
        { messages: [{ role: "user", content: "hi" }] },
        undefined,
        vi.fn(),
      )) {
        // no-op
      }
    })();

    await expect(run).rejects.toBeInstanceOf(AssistantHttpError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
