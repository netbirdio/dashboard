import { test, expect, beforeEach, afterAll, mock } from "bun:test";
import type { LanguageModelV3StreamPart } from "@ai-sdk/provider";
import { convertArrayToReadableStream, MockLanguageModelV3 } from "ai/test";
import { setEnv } from "./env.ts";
import { registry, resetMetricsForTests } from "@/instrumentation/metrics.ts";
import { resetPiiCacheForTests } from "@/pii.ts";
import type { MutableCtx } from "@/types.ts";

const realLlm = await import("@/llm.ts");
let current: MockLanguageModelV3;
mock.module("@/llm.ts", () => ({
  ...realLlm,
  anthropic: () => ((() => current) as unknown as ReturnType<typeof realLlm.anthropic>),
}));

mock.module("@/db/index.ts", () => ({ record: () => {} }));

const { chat } = await import("@/agent.ts");

const USAGE = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};

function modelStreaming(parts: LanguageModelV3StreamPart[]): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doStream: { stream: convertArrayToReadableStream(parts) },
  });
}

function textModel(text: string): MockLanguageModelV3 {
  return modelStreaming([
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "t" },
    { type: "text-delta", id: "t", delta: text },
    { type: "text-end", id: "t" },
    { type: "finish", finishReason: { unified: "stop", raw: "end_turn" }, usage: USAGE },
  ]);
}

function clientToolModel(): MockLanguageModelV3 {
  return modelStreaming([
    { type: "stream-start", warnings: [] },
    { type: "tool-call", toolCallId: "t1", toolName: "list_peers", input: "{}" },
    { type: "tool-call", toolCallId: "t2", toolName: "cc_add", input: "{}" },
    { type: "finish", finishReason: { unified: "tool-calls", raw: "tool_use" }, usage: USAGE },
  ]);
}

function ctx(): MutableCtx {
  return {
    requestId: crypto.randomUUID(),
    principal: { userId: "u1", accountId: "a1" },
  };
}

function request(text = "how many peers do I have?"): Request {
  return new Request("https://x/v1/chat", {
    method: "POST",
    body: JSON.stringify({
      id: "conv-1",
      messages: [{ id: "m1", role: "user", parts: [{ type: "text", text }] }],
    }),
  });
}

// The backstop is always on and calls the analyzer over fetch; a no-findings
// mock keeps these turns deterministic and off the network.
const realFetch = globalThis.fetch;

beforeEach(() => {
  setEnv({ SUGGESTIONS_ENABLED: "false" });
  resetMetricsForTests();
  resetPiiCacheForTests();
  globalThis.fetch = (async () => new Response("[]")) as unknown as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = realFetch;
});

test("an answered turn streams the text and counts one model call", async () => {
  current = textModel("You have 3 peers.");
  const res = await chat(request(), ctx());
  const body = await res.text();
  expect(body).toContain("You have 3 peers.");

  const out = await registry.metrics();
  expect(out).toContain('netbird_assistant_chat_turns_total{outcome="answer"} 1');
  expect(out).toContain("netbird_assistant_chat_model_calls_per_turn_count 1");
  expect(out).toContain('netbird_assistant_llm_stop_reasons_total{tier="main",task="chat",stop_reason="stop"} 1');
  expect(out).toContain('netbird_assistant_llm_tokens_total{provider="anthropic",model="claude-sonnet-5",tier="main",task="chat",type="input"} 10');
});

test("a client-tool turn hands the calls to the dashboard and records them", async () => {
  current = clientToolModel();
  const res = await chat(request(), ctx());
  const body = await res.text();
  expect(body).toContain("list_peers");
  expect(body).toContain("cc_add");

  const out = await registry.metrics();
  expect(out).toContain('netbird_assistant_chat_turns_total{outcome="tool_use"} 1');
  expect(out).toContain('netbird_assistant_llm_tool_requests_total{tool="list_peers",runtime="client"} 1');
  expect(out).toContain('netbird_assistant_llm_tool_requests_total{tool="cc_add",runtime="client"} 1');
});

test("a failed turn is counted as an error with a user-safe message", async () => {
  current = new MockLanguageModelV3({
    doStream: () => {
      throw new Error("connection reset");
    },
  });
  const res = await chat(request(), ctx());
  const body = await res.text();
  expect(body).toContain("error");
  expect(body).not.toContain("connection reset");

  const out = await registry.metrics();
  expect(out).toContain('netbird_assistant_chat_turns_total{outcome="error"} 1');
  expect(out).toContain('netbird_assistant_llm_errors_total{code="unknown",retryable="true"} 1');
});

test("the PII backstop scrubs the prompt and restores the reply", async () => {
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    const { text } = JSON.parse(String(init?.body)) as { text: string };
    const i = text.indexOf("Milo Kern");
    return new Response(
      JSON.stringify(
        i === -1 ? [] : [{ entity_type: "PERSON", start: i, end: i + 9, score: 0.9 }],
      ),
    );
  }) as unknown as typeof fetch;

  try {
    let promptSeen = "";
    current = new MockLanguageModelV3({
      doStream: async (params) => {
        promptSeen = JSON.stringify(params.prompt);
        return {
          stream: convertArrayToReadableStream<LanguageModelV3StreamPart>([
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: "It belongs to [REDACTED_PER" },
            { type: "text-delta", id: "t", delta: "SON_1]." },
            { type: "text-end", id: "t" },
            { type: "finish", finishReason: { unified: "stop", raw: "end_turn" }, usage: USAGE },
          ]),
        };
      },
    });

    const res = await chat(request("whose laptop is Milo Kern's?"), ctx());
    const body = await res.text();

    // The provider saw the token, never the name.
    expect(promptSeen).toContain("[REDACTED_PERSON_1]");
    expect(promptSeen).not.toContain("Milo Kern");
    // The user gets their own words back, across the chunk split.
    const answer = [...body.matchAll(/"delta":"([^"]*)"/g)].map((m) => m[1]).join("");
    expect(answer).toBe("It belongs to Milo Kern.");
    expect(body).not.toContain("REDACTED_PERSON_1");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a malformed body is rejected before any model call", async () => {
  const res = await chat(
    new Request("https://x/v1/chat", { method: "POST", body: "{nope" }),
    ctx(),
  );
  expect(res.status).toBe(400);

  const bad = await chat(
    new Request("https://x/v1/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "old wire format" }] }),
    }),
    ctx(),
  );
  expect(bad.status).toBe(400);
});
