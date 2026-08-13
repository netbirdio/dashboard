/**
 * Prometheus metrics. Deliberately low-cardinality: labels are bounded sets
 * (route, method, status, provider, model, tier, task) — never account_id/user_id
 * (unbounded). Per-account/user cost lives in Postgres (model_calls); Prometheus
 * tracks operational rates/latency and aggregate cost throughput.
 */
import type { Server } from "bun";
import client from "prom-client";
import { timingSafeEqual } from "node:crypto";
import { loadConfig } from "@/config.ts";
import type { ProviderName, ModelTier, Task, Usage } from "@/types.ts";

/** Bun's route-handler second argument. Optional so tests can call a wrapped
 *  handler with just a Request, as the real server always supplies it. */
export type RouteServer = Server<unknown>;

export const registry = new client.Registry();

/**
 * Every series this service exports carries one prefix, so a single selector
 * matches all of it and nothing collides with another NetBird service scraped
 * into the same Prometheus. Names are written out in full at each definition
 * rather than composed from this constant — a metric name should be greppable
 * from the dashboard query that uses it.
 */
export const METRIC_PREFIX = "netbird_assistant_";

// Node/Bun process metrics (cpu, memory, event-loop lag, gc). Guarded so a
// runtime that can't provide them doesn't take the server down at boot.
try {
  client.collectDefaultMetrics({ register: registry, prefix: METRIC_PREFIX });
} catch (err) {
  console.error("default metrics unavailable:", (err as Error).message);
}

const buildInfo = new client.Gauge({
  name: "netbird_assistant_build_info",
  help: "Build/version info; value is always 1.",
  labelNames: ["version", "node_env"],
  registers: [registry],
});

// ── HTTP ─────────────────────────────────────────────────────────────────────
const httpRequests = new client.Counter({
  name: "netbird_assistant_http_requests_total",
  help: "HTTP requests by route, method, and status code.",
  labelNames: ["route", "method", "status"],
  registers: [registry],
});

const httpDuration = new client.Histogram({
  name: "netbird_assistant_http_request_duration_seconds",
  help: "Handler latency (time to return the Response, not stream lifetime).",
  labelNames: ["route", "method"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const httpInFlight = new client.Gauge({
  name: "netbird_assistant_http_requests_in_flight",
  help: "In-progress HTTP handler invocations by route.",
  labelNames: ["route"],
  registers: [registry],
});

// ── LLM ──────────────────────────────────────────────────────────────────────
const llmRequests = new client.Counter({
  name: "netbird_assistant_llm_requests_total",
  help: "Model calls by provider, model, tier, task, and outcome.",
  labelNames: ["provider", "model", "tier", "task", "status"],
  registers: [registry],
});

const llmDuration = new client.Histogram({
  name: "netbird_assistant_llm_request_duration_seconds",
  help: "Model call latency.",
  labelNames: ["provider", "model", "tier", "task"],
  buckets: [0.25, 0.5, 1, 2, 5, 10, 20, 30, 60, 120],
  registers: [registry],
});

const llmTokens = new client.Counter({
  name: "netbird_assistant_llm_tokens_total",
  help: "Tokens by provider, model, tier, task, and type.",
  labelNames: ["provider", "model", "tier", "task", "type"],
  registers: [registry],
});

const llmToolCalls = new client.Counter({
  name: "netbird_assistant_llm_tool_calls_requested_total",
  help: "Tool calls the model requested, by provider, model, tier, task.",
  labelNames: ["provider", "model", "tier", "task"],
  registers: [registry],
});

const llmStreamsInFlight = new client.Gauge({
  name: "netbird_assistant_llm_streams_in_flight",
  help: "Streaming chat turns currently open.",
  registers: [registry],
});

const llmStopReasons = new client.Counter({
  name: "netbird_assistant_llm_stop_reasons_total",
  help: "Why model calls ended (end_turn, tool_use, max_tokens, …).",
  labelNames: ["tier", "task", "stop_reason"],
  registers: [registry],
});

const llmErrors = new client.Counter({
  name: "netbird_assistant_llm_errors_total",
  help: "Classified model-call failures (see llm/errors.ts LlmErrorKind).",
  labelNames: ["code", "retryable"],
  registers: [registry],
});

// ── tools ────────────────────────────────────────────────────────────────────
// Tool names are a fixed allowlist (llm/tools.ts), so they are safe as a label.
const toolRequests = new client.Counter({
  name: "netbird_assistant_llm_tool_requests_total",
  help: "Tool calls the model asked for, by tool. runtime = server (we run it) | client (the caller does).",
  labelNames: ["tool", "runtime", "mutating"],
  registers: [registry],
});

const serverToolExecutions = new client.Counter({
  name: "netbird_assistant_server_tool_executions_total",
  help: "Server-executed tool runs. status = ok | error | blocked (refused by a precondition).",
  labelNames: ["tool", "status"],
  registers: [registry],
});

const serverToolDuration = new client.Histogram({
  name: "netbird_assistant_server_tool_duration_seconds",
  help: "Server-executed tool latency, cache hits included.",
  labelNames: ["tool"],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

const serverToolCacheEvents = new client.Counter({
  name: "netbird_assistant_server_tool_cache_events_total",
  help: "Shared public-tool cache lookups, by outcome.",
  labelNames: ["tool", "result"],
  registers: [registry],
});

const serverToolCacheEntries = new client.Gauge({
  name: "netbird_assistant_server_tool_cache_entries",
  help: "Entries currently held in the public server-tool cache.",
  registers: [registry],
});

// ── chat turns ───────────────────────────────────────────────────────────────
const chatTurns = new client.Counter({
  name: "netbird_assistant_chat_turns_total",
  help: "Completed /v1/chat turns by how they ended.",
  labelNames: ["outcome"],
  registers: [registry],
});

const chatTurnDuration = new client.Histogram({
  name: "netbird_assistant_chat_turn_duration_seconds",
  help: "Whole streamed turn, doc-tool loop and suggestions included (unlike netbird_assistant_http_request_duration_seconds).",
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60, 120, 300],
  registers: [registry],
});

const chatModelCallsPerTurn = new client.Histogram({
  name: "netbird_assistant_chat_model_calls_per_turn",
  help: "Main-model calls one turn took — >1 means the server looped on doc tools.",
  buckets: [1, 2, 3, 4, 5, 6, 8, 10],
  registers: [registry],
});

// ── rejections & guardrails ──────────────────────────────────────────────────
/**
 * Why a request was refused. A bounded set, and the reason the status code alone
 * isn't enough: 400 covers a malformed body, an unknown model, and a guardrail
 * block, which call for completely different responses from whoever is on call.
 */
export type RejectionReason =
  | "cors"
  | "unauthorized"
  | "rate_limited"
  | "usage_limit"
  | "too_large"
  | "too_many_messages"
  | "invalid_json"
  | "invalid_body"
  | "unknown_model"
  | "guardrail_blocked"
  | "internal_error"
  | "other";

const rejections = new client.Counter({
  name: "netbird_assistant_rejections_total",
  help: "Requests refused, by route and reason.",
  labelNames: ["route", "reason"],
  registers: [registry],
});

const guardrailChecks = new client.Counter({
  name: "netbird_assistant_guardrail_input_checks_total",
  help: "Fast-model injection/abuse pre-screen verdicts. error = classifier failed (fails open).",
  labelNames: ["verdict"],
  registers: [registry],
});

const toolFailures = new client.Counter({
  name: "netbird_assistant_tool_failures_total",
  help:
    "Tool calls that came back as errors, by tool and classified reason " +
    "(telemetry/signals.ts). Read off the tool_result the caller resends, so it " +
    "counts client-executed steps the server never runs itself.",
  labelNames: ["tool", "reason"],
  registers: [registry],
});

const userSentiment = new client.Counter({
  name: "netbird_assistant_user_sentiment_total",
  help:
    "User messages carrying frustration, profanity or abuse. A kind only — never " +
    "the text — and it changes nothing about the answer; it's the loudest signal " +
    "that a turn went wrong and the one nobody files a bug about.",
  labelNames: ["kind"],
  registers: [registry],
});

const piiRedactions = new client.Counter({
  name: "netbird_assistant_pii_redactions_total",
  help: "Values the server-side PII backstop replaced before the model saw them.",
  labelNames: ["kind"],
  registers: [registry],
});

const suggestionsResults = new client.Counter({
  name: "netbird_assistant_suggestions_total",
  help: "Quick-reply generation outcomes. empty = the answer asked nothing, so no chips.",
  labelNames: ["result"],
  registers: [registry],
});

// ── telemetry pipeline ─────────────────────────────────────────────────────
const telemetryQueueDepth = new client.Gauge({
  name: "netbird_assistant_telemetry_queue_depth",
  help: "Telemetry rows buffered and not yet written to Postgres.",
  registers: [registry],
});

const telemetryRowsWritten = new client.Counter({
  name: "netbird_assistant_telemetry_rows_written_total",
  help: "Telemetry rows successfully inserted.",
  registers: [registry],
});

const telemetryWriteFailures = new client.Counter({
  name: "netbird_assistant_telemetry_write_failures_total",
  help: "Telemetry rows dropped after a failed insert.",
  registers: [registry],
});

// ── helpers (the surface app code uses) ──────────────────────────────────────
export function setBuildInfo(version: string, nodeEnv: string): void {
  buildInfo.set({ version, node_env: nodeEnv }, 1);
}

export function observeHttp(route: string, method: string, status: number, durationSec: number): void {
  httpRequests.inc({ route, method, status: String(status) });
  httpDuration.observe({ route, method }, durationSec);
}

export const streamsInFlightGauge = llmStreamsInFlight;

/**
 * Wrap a route handler to record count, status, latency, and in-flight count.
 * Bun's second route argument is passed through so a handler can reach
 * `server.requestIP()`; handlers that don't need it just declare one parameter.
 */
export function withMetrics(
  route: string,
  handler: (req: Request, server?: RouteServer) => Response | Promise<Response>,
): (req: Request, server?: RouteServer) => Promise<Response> {
  return async (req: Request, server?: RouteServer): Promise<Response> => {
    const start = performance.now();
    httpInFlight.inc({ route });
    try {
      const res = await handler(req, server);
      observeHttp(route, req.method, res.status, (performance.now() - start) / 1000);
      return res;
    } catch (err) {
      observeHttp(route, req.method, 500, (performance.now() - start) / 1000);
      throw err;
    } finally {
      httpInFlight.dec({ route });
    }
  };
}

export interface LlmObservation {
  provider: ProviderName;
  model: string;
  tier: ModelTier;
  task: Task;
  status: "ok" | "error";
  durationSec: number;
  usage?: Usage;
  toolCalls?: number;
  stopReason?: string | null;
}

export function observeLlm(o: LlmObservation): void {
  const labels = { provider: o.provider, model: o.model, tier: o.tier, task: o.task };
  llmRequests.inc({ ...labels, status: o.status });
  llmDuration.observe(labels, o.durationSec);
  if (o.usage) {
    llmTokens.inc({ ...labels, type: "input" }, o.usage.inputTokens);
    llmTokens.inc({ ...labels, type: "output" }, o.usage.outputTokens);
    llmTokens.inc({ ...labels, type: "cache_read" }, o.usage.cacheReadTokens);
    llmTokens.inc({ ...labels, type: "cache_creation" }, o.usage.cacheCreationTokens);
  }
  if (o.toolCalls) llmToolCalls.inc(labels, o.toolCalls);
  if (o.stopReason) llmStopReasons.inc({ tier: o.tier, task: o.task, stop_reason: o.stopReason });
}

export function countLlmError(code: string, retryable: boolean): void {
  llmErrors.inc({ code, retryable: String(retryable) });
}

export function countToolRequest(tool: string, runtime: "server" | "client", mutating: boolean): void {
  toolRequests.inc({ tool, runtime, mutating: String(mutating) });
}

export function observeServerTool(
  tool: string,
  status: "ok" | "error" | "blocked",
  durationSec: number,
): void {
  serverToolExecutions.inc({ tool, status });
  serverToolDuration.observe({ tool }, durationSec);
}

export function countServerToolCache(tool: string, result: "hit" | "miss", entries: number): void {
  serverToolCacheEvents.inc({ tool, result });
  serverToolCacheEntries.set(entries);
}

export type ChatOutcome = "answer" | "tool_use" | "question" | "error";

export function observeChatTurn(outcome: ChatOutcome, durationSec: number, modelCalls: number): void {
  chatTurns.inc({ outcome });
  chatTurnDuration.observe(durationSec);
  if (modelCalls > 0) chatModelCallsPerTurn.observe(modelCalls);
}

export function countRejection(route: string, reason: RejectionReason): void {
  rejections.inc({ route, reason });
}

/** Fallback when a refusal carries no explicit reason (e.g. a status from elsewhere). */
export function reasonFromStatus(status: number): RejectionReason {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 402) return "usage_limit";
  if (status === 413) return "too_large";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "internal_error";
  return "other";
}

export function countGuardrailCheck(verdict: "allow" | "block" | "error"): void {
  guardrailChecks.inc({ verdict });
}

export function countToolFailure(tool: string, reason: string): void {
  toolFailures.inc({ tool, reason });
}

export function countUserSentiment(kind: string): void {
  userSentiment.inc({ kind });
}

export function countPiiRedaction(kind: string): void {
  piiRedactions.inc({ kind });
}

export function countSuggestions(result: "emitted" | "empty" | "error"): void {
  suggestionsResults.inc({ result });
}

export function setTelemetryQueueDepth(depth: number): void {
  telemetryQueueDepth.set(depth);
}

export function countTelemetryWritten(rows: number): void {
  telemetryRowsWritten.inc(rows);
}

export function countTelemetryFailed(rows: number): void {
  telemetryWriteFailures.inc(rows);
}

/**
 * Extra work to run before serving an exposition — used by the Postgres rollup
 * gauges (telemetry/dbGauges.ts). Registered from outside rather than imported
 * here: those gauges read the DB, and the DB store already imports this module.
 */
type ScrapeCollector = () => Promise<void>;
let scrapeCollector: ScrapeCollector | null = null;

export function setScrapeCollector(fn: ScrapeCollector | null): void {
  scrapeCollector = fn;
}

/** Test-only: reset all metric values between cases. */
export function resetMetricsForTests(): void {
  registry.resetMetrics();
  scrapeCollector = null;
}

// ── /metrics route ───────────────────────────────────────────────────────────
function tokenOk(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Length check first — timingSafeEqual throws on unequal-length buffers.
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET /metrics — Prometheus exposition. Guarded by a bearer token when
 * METRICS_AUTH_TOKEN is set; otherwise assume the endpoint is network-restricted
 * to the scraper.
 */
export async function metricsHandler(req: Request): Promise<Response> {
  const cfg = loadConfig();
  if (!cfg.METRICS_ENABLED) return new Response("metrics disabled", { status: 404 });

  if (cfg.METRICS_AUTH_TOKEN) {
    const [scheme, token] = (req.headers.get("Authorization") ?? "").split(" ");
    if (scheme !== "Bearer" || !token || !tokenOk(token, cfg.METRICS_AUTH_TOKEN)) {
      return new Response("unauthorized", { status: 401 });
    }
  }
  // A stale rollup is better than a failed scrape: the in-process metrics below
  // are the ones that matter when the DB is the thing having a bad day.
  if (scrapeCollector) {
    try {
      await scrapeCollector();
    } catch (err) {
      console.error("metrics collector failed:", (err as Error).message);
    }
  }
  return new Response(await registry.metrics(), {
    headers: { "Content-Type": registry.contentType },
  });
}
