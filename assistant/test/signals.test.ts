import { describe, expect, it } from "bun:test";
import { classifyToolFailure, detectSentiment } from "@/instrumentation/signals.ts";
import { collectTurnSignals } from "@/instrumentation/signals.ts";
import { registry, resetMetricsForTests } from "@/instrumentation/metrics.ts";
import type { UIMessage } from "ai";

describe("classifyToolFailure", () => {
  it("buckets a handle that doesn't resolve", () => {
    expect(classifyToolFailure("(no network) isn't a network frame.")).toBe(
      "bad_reference",
    );
    expect(classifyToolFailure("No network frame matches node-4.")).toBe(
      "bad_reference",
    );
  });

  it("buckets a missing argument", () => {
    expect(
      classifyToolFailure(
        "A resource needs an address (IP, CIDR or domain) — nothing was added.",
      ),
    ).toBe("missing_argument");
    expect(classifyToolFailure("cc_node needs `node` and `action`.")).toBe(
      "missing_argument",
    );
  });

  it("buckets a dashboard older than the tool registry", () => {
    expect(
      classifyToolFailure('Tool "cc_policy" is not available in this dashboard version.'),
    ).toBe("version_skew");
  });

  it("buckets an action the mode doesn't allow", () => {
    expect(classifyToolFailure("That only works in a draft.")).toBe(
      "not_permitted",
    );
  });

  it("falls back to unknown rather than guessing", () => {
    expect(classifyToolFailure("something nobody has seen before")).toBe(
      "unknown",
    );
  });
});

describe("detectSentiment", () => {
  it("reads frustration from a repeat complaint", () => {
    expect(detectSentiment("this still doesn't work")).toEqual(["frustration"]);
    expect(detectSentiment("I already told you the peer name")).toEqual([
      "frustration",
    ]);
  });

  it("separates swearing at a problem from abuse aimed at the assistant", () => {
    expect(detectSentiment("this fucking thing is broken")).toEqual([
      "frustration",
      "profanity",
    ]);
    expect(detectSentiment("you're useless")).toEqual(["abuse"]);
  });

  it("says nothing about an ordinary message", () => {
    expect(detectSentiment("draft me a policy for the office")).toEqual([]);
    expect(detectSentiment("")).toEqual([]);
  });
});

describe("collectTurnSignals", () => {
  const ctx = {
    requestId: "11111111-1111-1111-1111-111111111111",
    accountId: "acc-1",
    userId: "user-1",
  };

  const metric = async (name: string) =>
    (await registry.getSingleMetricAsString(name)) ?? "";

  const say = (text: string): UIMessage => ({
    id: "m-user",
    role: "user",
    parts: [{ type: "text", text }],
  });

  const toolTurn = (state: "output-available" | "output-error", errorText?: string): UIMessage => ({
    id: "m-assistant",
    role: "assistant",
    parts: [
      {
        type: "tool-cc_node",
        toolCallId: "t1",
        state,
        input: { action: "route_network" },
        ...(state === "output-error"
          ? { errorText }
          : { output: { ok: true, content: "done", summary: "done" } }),
      } as UIMessage["parts"][number],
    ],
  });

  it("counts a failed step against the tool that failed", async () => {
    resetMetricsForTests();
    collectTurnSignals(
      [say("route the office network"), toolTurn("output-error", "(no network) isn't a network frame.")],
      ctx,
    );

    const text = await metric("netbird_assistant_tool_failures_total");
    expect(text).toContain('tool="cc_node"');
    expect(text).toContain('reason="bad_reference"');
  });

  it("ignores a step that succeeded", async () => {
    resetMetricsForTests();
    collectTurnSignals([say("add a node"), toolTurn("output-available")], ctx);
    expect(await metric("netbird_assistant_tool_failures_total")).not.toContain('tool="cc_node"');
  });

  it("counts only the newest message, so a replayed transcript can't double-count", async () => {
    resetMetricsForTests();
    collectTurnSignals(
      [toolTurn("output-error", "(no network) isn't a network frame."), say("thanks")],
      ctx,
    );
    expect(await metric("netbird_assistant_tool_failures_total")).not.toContain('tool="cc_node"');
  });

  it("counts the user's tone from their own message", async () => {
    resetMetricsForTests();
    collectTurnSignals([say("this still doesn't work, seriously?")], ctx);
    expect(await metric("netbird_assistant_user_sentiment_total")).toContain(
      'kind="frustration"',
    );
  });
});
