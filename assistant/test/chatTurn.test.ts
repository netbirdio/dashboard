/**
 * Turn-level metrics for POST /v1/chat, driven through the real route with a
 * stubbed provider. Unit tests cover the metric helpers; this covers the wiring
 * — that a tool-use turn is actually counted as one, with the tool's name.
 */
import { test, expect, beforeEach, mock } from "bun:test";
import { setEnv } from "./env.ts";
import { registry, resetMetricsForTests } from "@/telemetry/metrics.ts";
import type { LlmContentBlock, LlmResult } from "@/types.ts";
import type { MutableCtx } from "@/http/compose.ts";

const USAGE = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheCreationTokens: 0 };

function fakeProvider(final: LlmResult, text = "thinking…") {
  return {
    name: "anthropic" as const,
    streamChat: () => ({
      async *events() {
        yield { type: "text" as const, delta: text };
      },
      final: async () => final,
    }),
    complete: async () => ({ text: "{}", usage: USAGE, model: "fake-model" }),
  };
}

let current = fakeProvider({
  content: [],
  stopReason: "end_turn",
  usage: USAGE,
  model: "fake-model",
});

mock.module("@/llm/registry.ts", () => ({
  providerFor: () => ({ provider: current, model: "fake-model" }),
}));

// The Postgres row is covered by db.test.ts; stubbing it keeps this test from
// queueing writes that fail (harmlessly, but noisily) with no database around.
mock.module("@/telemetry/store.ts", () => ({ record: () => {} }));

const { chat } = await import("@/routes/chat.ts");

function ctx(): MutableCtx {
  return {
    requestId: crypto.randomUUID(),
    startedAt: performance.now(),
    principal: { userId: "u1", accountId: "a1" },
  };
}

function request(text = "how many peers do I have?"): Request {
  return new Request("https://x/v1/chat", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
  });
}

/** Run one turn and wait for the SSE stream to close. */
async function runTurn(final: LlmResult): Promise<string> {
  current = fakeProvider(final);
  const res = await chat(request(), ctx());
  return await res.text();
}

beforeEach(() => {
  // Suggestions off: it's a second model call, and this is about the main turn.
  // The telemetry DB write is fire-and-forget and fails soft, so no DB is needed.
  setEnv({ SUGGESTIONS_ENABLED: "false", GUARDRAIL_SCRUB_PII: "false", DOCS_ENABLED: "false" });
  resetMetricsForTests();
});

test("an answered turn counts one turn, one model call, and its stop reason", async () => {
  const body = await runTurn({
    content: [{ type: "text", text: "You have 3 peers." }] as LlmContentBlock[],
    stopReason: "end_turn",
    usage: USAGE,
    model: "fake-model",
  });
  expect(body).toContain("event: final");

  const out = await registry.metrics();
  expect(out).toContain('netbird_assistant_chat_turns_total{outcome="answer"} 1');
  expect(out).toContain("netbird_assistant_chat_model_calls_per_turn_count 1");
  expect(out).toContain('netbird_assistant_llm_stop_reasons_total{tier="main",task="chat",stop_reason="end_turn"} 1');
  expect(out).toContain('netbird_assistant_llm_tokens_total{provider="anthropic",model="fake-model",tier="main",task="chat",type="input"} 10');
});

test("a client-tool turn records the tool by name, runtime, and mutating flag", async () => {
  const body = await runTurn({
    content: [
      { type: "tool_use", id: "t1", name: "list_peers", input: {} },
      { type: "tool_use", id: "t2", name: "cc_add", input: {} },
    ] as LlmContentBlock[],
    stopReason: "tool_use",
    usage: USAGE,
    model: "fake-model",
  });
  expect(body).toContain("event: tool_use");

  const out = await registry.metrics();
  expect(out).toContain('netbird_assistant_chat_turns_total{outcome="tool_use"} 1');
  expect(out).toContain('netbird_assistant_llm_tool_requests_total{tool="list_peers",runtime="client",mutating="false"} 1');
  // mutating tracks the registry flag, which no tool currently sets (canvas edits
  // stay local until deployed) — so this asserts the plumbing, not a true case.
  expect(out).toContain('netbird_assistant_llm_tool_requests_total{tool="cc_add",runtime="client",mutating="false"} 1');
  expect(out).toContain("netbird_assistant_llm_tool_calls_requested_total");
});

test("a failed turn is counted as an error, with the classified code", async () => {
  current = {
    ...fakeProvider({ content: [], stopReason: "end_turn", usage: USAGE, model: "fake-model" }),
    streamChat: () => ({
      async *events() {
        throw new Error("connection reset");
      },
      final: async () => {
        throw new Error("connection reset");
      },
    }),
  };
  const body = await (await chat(request(), ctx())).text();
  expect(body).toContain("event: error");

  const out = await registry.metrics();
  expect(out).toContain('netbird_assistant_chat_turns_total{outcome="error"} 1');
  expect(out).toContain('netbird_assistant_llm_errors_total{code="unknown",retryable="true"} 1');
  expect(out).toContain('netbird_assistant_llm_requests_total{provider="anthropic",model="fake-model",tier="main",task="chat",status="error"} 1');
});
