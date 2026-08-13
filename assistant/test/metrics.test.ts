import { test, expect, beforeEach } from "bun:test";
import { setEnv } from "./env.ts";
import {
  registry,
  observeLlm,
  withMetrics,
  setBuildInfo,
  resetMetricsForTests,
  metricsHandler,
  countRejection,
  reasonFromStatus,
  countToolRequest,
  observeServerTool,
  countServerToolCache,
  observeChatTurn,
  countLlmError,
  countPiiRedaction,
  setScrapeCollector,
} from "@/telemetry/metrics.ts";
import { compose } from "@/http/compose.ts";

beforeEach(() => {
  setEnv();
  resetMetricsForTests();
});

test("observeLlm records requests and tokens with bounded labels", async () => {
  observeLlm({
    provider: "anthropic",
    model: "claude-opus-4-8",
    tier: "main",
    task: "chat",
    status: "ok",
    durationSec: 1.5,
    usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 5, cacheCreationTokens: 0 },
    toolCalls: 2,
  });
  const out = await registry.metrics();
  expect(out).toContain('netbird_assistant_llm_requests_total{provider="anthropic",model="claude-opus-4-8",tier="main",task="chat",status="ok"} 1');
  expect(out).toContain('netbird_assistant_llm_tokens_total{provider="anthropic",model="claude-opus-4-8",tier="main",task="chat",type="input"} 100');
  // No per-account / per-user labels leak in.
  expect(out).not.toContain("account_id");
  expect(out).not.toContain("user_id");
});

test("withMetrics counts status and records duration", async () => {
  const handler = withMetrics("/v1/chat", async () => new Response("ok", { status: 200 }));
  await handler(new Request("https://x/v1/chat", { method: "POST" }));
  const out = await registry.metrics();
  expect(out).toContain('netbird_assistant_http_requests_total{route="/v1/chat",method="POST",status="200"} 1');
  expect(out).toContain('netbird_assistant_http_request_duration_seconds_count{route="/v1/chat",method="POST"} 1');
});

test("withMetrics records a 500 when the handler throws, then re-throws", async () => {
  const handler = withMetrics("/v1/chat", async () => {
    throw new Error("boom");
  });
  await expect(handler(new Request("https://x/v1/chat", { method: "POST" }))).rejects.toThrow("boom");
  expect(await registry.metrics()).toContain('status="500"');
});

test("/metrics serves the exposition and honours the auth token", async () => {
  setEnv({ METRICS_AUTH_TOKEN: "s3cret" });
  setBuildInfo("9.9.9", "test");

  const unauth = await metricsHandler(new Request("https://x/metrics"));
  expect(unauth.status).toBe(401);

  const ok = await metricsHandler(new Request("https://x/metrics", { headers: { Authorization: "Bearer s3cret" } }));
  expect(ok.status).toBe(200);
  expect(ok.headers.get("Content-Type")).toContain("text/plain");
  expect(await ok.text()).toContain('netbird_assistant_build_info{version="9.9.9"');
});

test("/metrics returns 404 when disabled", async () => {
  setEnv({ METRICS_ENABLED: "false" });
  expect((await metricsHandler(new Request("https://x/metrics"))).status).toBe(404);
});

test("observeLlm records the stop reason", async () => {
  observeLlm({
    provider: "anthropic",
    model: "claude-sonnet-5",
    tier: "main",
    task: "chat",
    status: "ok",
    durationSec: 1,
    stopReason: "tool_use",
  });
  expect(await registry.metrics()).toContain(
    'netbird_assistant_llm_stop_reasons_total{tier="main",task="chat",stop_reason="tool_use"} 1',
  );
});

test("tool metrics separate server from client tools and flag mutating ones", async () => {
  countToolRequest("list_peers", "client", false);
  countToolRequest("cc_add", "client", true);
  countToolRequest("search_docs", "server", false);
  observeServerTool("search_docs", "ok", 0.02);
  observeServerTool("ask_user", "blocked", 0);
  countServerToolCache("search_docs", "hit", 7);

  const out = await registry.metrics();
  expect(out).toContain('netbird_assistant_llm_tool_requests_total{tool="list_peers",runtime="client",mutating="false"} 1');
  expect(out).toContain('netbird_assistant_llm_tool_requests_total{tool="cc_add",runtime="client",mutating="true"} 1');
  expect(out).toContain('netbird_assistant_server_tool_executions_total{tool="search_docs",status="ok"} 1');
  expect(out).toContain('netbird_assistant_server_tool_executions_total{tool="ask_user",status="blocked"} 1');
  expect(out).toContain('netbird_assistant_server_tool_cache_events_total{tool="search_docs",result="hit"} 1');
  expect(out).toContain("netbird_assistant_server_tool_cache_entries 7");
});

test("chat turn outcomes and per-turn model calls are recorded", async () => {
  observeChatTurn("answer", 3.2, 2);
  observeChatTurn("error", 1.0, 1);
  const out = await registry.metrics();
  expect(out).toContain('netbird_assistant_chat_turns_total{outcome="answer"} 1');
  expect(out).toContain('netbird_assistant_chat_turns_total{outcome="error"} 1');
  expect(out).toContain("netbird_assistant_chat_model_calls_per_turn_count 2");
});

test("rejections are counted by reason, not just status", async () => {
  countRejection("/v1/chat", "unknown_model");
  countLlmError("overloaded", true);
  countPiiRedaction("IP");
  const out = await registry.metrics();
  expect(out).toContain('netbird_assistant_rejections_total{route="/v1/chat",reason="unknown_model"} 1');
  expect(out).toContain('netbird_assistant_llm_errors_total{code="overloaded",retryable="true"} 1');
  expect(out).toContain('netbird_assistant_pii_redactions_total{kind="IP"} 1');
});

test("reasonFromStatus maps the codes a refusal can carry", () => {
  expect(reasonFromStatus(401)).toBe("unauthorized");
  expect(reasonFromStatus(402)).toBe("usage_limit");
  expect(reasonFromStatus(413)).toBe("too_large");
  expect(reasonFromStatus(429)).toBe("rate_limited");
  expect(reasonFromStatus(503)).toBe("internal_error");
  expect(reasonFromStatus(418)).toBe("other");
});

test("compose counts a middleware refusal with the reason the middleware set", async () => {
  const handler = compose(
    "/v1/chat",
    [
      (_req, ctx) => {
        ctx.rejection = "rate_limited";
        return new Response("nope", { status: 429 });
      },
    ],
    () => new Response("ok"),
  );
  await handler(new Request("https://x/v1/chat", { method: "POST" }));
  expect(await registry.metrics()).toContain('netbird_assistant_rejections_total{route="/v1/chat",reason="rate_limited"} 1');
});

test("compose counts a handler 500 and doesn't count a success", async () => {
  const boom = compose("/v1/chat", [], () => {
    throw new Error("boom");
  });
  expect((await boom(new Request("https://x/v1/chat"))).status).toBe(500);

  const fine = compose("/v1/models", [], () => new Response("ok"));
  await fine(new Request("https://x/v1/models"));

  const out = await registry.metrics();
  expect(out).toContain('netbird_assistant_rejections_total{route="/v1/chat",reason="internal_error"} 1');
  expect(out).not.toContain('route="/v1/models"');
});

test("a failing scrape collector doesn't fail the scrape", async () => {
  setScrapeCollector(async () => {
    throw new Error("db down");
  });
  const res = await metricsHandler(new Request("https://x/metrics"));
  expect(res.status).toBe(200);
  expect(await res.text()).toContain("netbird_assistant_http_requests_total");
});
