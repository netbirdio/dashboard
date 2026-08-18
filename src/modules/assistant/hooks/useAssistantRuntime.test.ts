import { describe, expect, it, vi } from "vitest";
import {
  friendlyFetch,
  thinkingStatus,
} from "@/modules/assistant/hooks/useAssistantRuntime";
import { AssistantHttpError } from "@/modules/assistant/utils/errors";

describe("thinkingStatus", () => {
  it("shows the sentence being written, not the whole stream", () => {
    expect(
      thinkingStatus(
        "The user wants office access. Now I'm checking which peers can route that network",
      ),
    ).toBe("Checking which peers can route that network");
  });

  it("drops the filler most reasoning starts with", () => {
    expect(thinkingStatus("Okay, let me look at the access policies")).toBe(
      "Look at the access policies",
    );
  });

  it("prefers the unfinished fragment over the sentence before it", () => {
    expect(
      thinkingStatus("I read the peers. Comparing them to the groups now"),
    ).toBe("Comparing them to the groups now");
  });

  it("treats newlines as boundaries", () => {
    expect(
      thinkingStatus("Plan:\n- read the peers\nMatching the address to a peer"),
    ).toBe("Matching the address to a peer");
  });

  it("clips a long clause at a word boundary", () => {
    const line = thinkingStatus(
      "Working out whether the destination group already contains every one of those resources or not",
    );
    expect(line).toBe("Working out whether the destination group already…");
    expect(line!.length).toBeLessThanOrEqual(53);
  });

  it("says nothing for a fragment too short to mean anything", () => {
    expect(thinkingStatus("Wait")).toBeNull();
    expect(thinkingStatus("Yes. Hmm")).toBeNull();
    expect(thinkingStatus("")).toBeNull();
  });

  it("keeps the subject of the clause intact", () => {
    expect(
      thinkingStatus("I need to check whether eduards-macbook is online"),
    ).toBe("Check whether eduards-macbook is online");
  });

  it("never ends on a dangling comma", () => {
    expect(thinkingStatus("Reading the groups first, then the policies")).toBe(
      "Reading the groups first, then the policies",
    );
    expect(
      thinkingStatus(
        "Reading the groups and the policies and the networks, then deciding what to draw",
      ),
    ).toBe("Reading the groups and the policies and the…");
  });
});

const jsonError = (code: string, message: string) =>
  JSON.stringify({ code, message });

describe("friendlyFetch", () => {
  it("carries the server's own message and code, unmapped", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(
          jsonError(
            "usage_limit",
            "The AI assistant has reached its usage limit for this account.",
          ),
          { status: 402 },
        ),
    );

    const err = await friendlyFetch(fetchFn as never)(
      "https://assistant.test/v1/chat",
    ).then(
      () => null,
      (e) => e as AssistantHttpError,
    );
    expect(err).toBeInstanceOf(AssistantHttpError);
    expect(err!.status).toBe(402);
    expect(err!.code).toBe("usage_limit");
    expect(err!.message).toBe(
      "The AI assistant has reached its usage limit for this account.",
    );
  });

  it("falls back to a status-based sentence when the reply carried no message", async () => {
    const fetchFn = vi.fn(
      async () => new Response("<html>502</html>", { status: 502 }),
    );

    const err = await friendlyFetch(fetchFn as never)(
      "https://assistant.test/v1/chat",
    ).then(
      () => null,
      (e) => e as AssistantHttpError,
    );
    // A proxy 5xx while the service restarts should still say "try again".
    expect(err!.message).toContain("temporarily unavailable");
    // Never echo a body the assistant did not write.
    expect(err!.message).not.toContain("html");
  });

  it("passes a successful response through untouched", async () => {
    const fetchFn = vi.fn(async () => new Response("ok", { status: 200 }));
    const res = await friendlyFetch(fetchFn as never)(
      "https://assistant.test/v1/chat",
    );
    expect(await res.text()).toBe("ok");
  });
});
