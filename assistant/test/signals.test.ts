import { describe, expect, it } from "bun:test";
import { classifyToolFailure, detectSentiment } from "@/telemetry/signals.ts";
import { collectTurnSignals } from "@/telemetry/turnSignals.ts";
import { registry, resetMetricsForTests } from "@/telemetry/metrics.ts";
import type { ChatMessage } from "@/types.ts";

/** The real messages the dashboard's tools produce, as seen in the wild. */
describe("classifyToolFailure", () => {
  it("buckets a handle that doesn't resolve", () => {
    expect(classifyToolFailure("(no network) isn't a network frame.")).toBe(
      "bad_reference",
    );
    expect(classifyToolFailure("No network frame matches {NODE_4}.")).toBe(
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
    now: new Date("2026-01-01T00:00:00Z"),
  };

  const metric = async (name: string) =>
    (await registry.getSingleMetricAsString(name)) ?? "";

  it("counts a failed step against the tool that failed", async () => {
    resetMetricsForTests();
    const messages: ChatMessage[] = [
      { role: "user", content: "route the office network" },
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "cc_node",
            input: { action: "route_network" },
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            toolUseId: "t1",
            content: "(no network) isn't a network frame.",
            isError: true,
          },
        ],
      },
    ];

    collectTurnSignals(messages, ctx);

    const text = await metric("netbird_assistant_tool_failures_total");
    expect(text).toContain('tool="cc_node"');
    expect(text).toContain('reason="bad_reference"');
  });

  it("ignores a step that succeeded", async () => {
    resetMetricsForTests();
    collectTurnSignals(
      [
        {
          role: "assistant",
          content: [{ type: "tool_use", id: "t1", name: "cc_add", input: {} }],
        },
        {
          role: "user",
          content: [
            { type: "tool_result", toolUseId: "t1", content: "Added it." },
          ],
        },
      ],
      ctx,
    );
    expect(await metric("netbird_assistant_tool_failures_total")).not.toContain('tool="cc_add"');
  });

  it("counts only the newest turn, so a replayed transcript can't double-count", async () => {
    resetMetricsForTests();
    const failed: ChatMessage[] = [
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "t1", name: "cc_node", input: {} }],
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            toolUseId: "t1",
            content: "(no network) isn't a network frame.",
            isError: true,
          },
        ],
      },
    ];
    // The same failure, now followed by later turns — the shape every request
    // after it has.
    collectTurnSignals(
      [...failed, { role: "assistant", content: [{ type: "text", text: "ok" }] }, { role: "user", content: "thanks" }],
      ctx,
    );
    expect(await metric("netbird_assistant_tool_failures_total")).not.toContain('tool="cc_node"');
  });

  it("counts the user's tone from their own message", async () => {
    resetMetricsForTests();
    collectTurnSignals(
      [{ role: "user", content: "this still doesn't work, seriously?" }],
      ctx,
    );
    expect(await metric("netbird_assistant_user_sentiment_total")).toContain(
      'kind="frustration"',
    );
  });
});
