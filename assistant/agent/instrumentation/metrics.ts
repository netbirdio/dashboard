import { timingSafeEqual } from "node:crypto";
import { hostname } from "node:os";
import client from "prom-client";
import { pushTimeseries } from "prometheus-remote-write";
import { loadConfig } from "@/config.ts";
import type { ModelTier, ProviderName, Task, Usage } from "@/types.ts";

export const registry = new client.Registry();

const METRIC_PREFIX = "netbird_assistant_";

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

export const httpInFlight = new client.Gauge({
  name: "netbird_assistant_http_requests_in_flight",
  help: "In-progress HTTP handler invocations by route.",
  labelNames: ["route"],
  registers: [registry],
});

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

export const llmStreamsInFlight = new client.Gauge({
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
  help: "Classified model-call failures (LlmErrorKind in llm.ts).",
  labelNames: ["code", "retryable"],
  registers: [registry],
});

const toolRequests = new client.Counter({
  name: "netbird_assistant_llm_tool_requests_total",
  help: "Tool calls the model asked for, by tool. runtime = server (we run it) | client (the caller does).",
  labelNames: ["tool", "runtime"],
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

export type RejectionReason =
  | "cors"
  | "unauthorized"
  | "rate_limited"
  | "usage_limit"
  | "too_large"
  | "too_many_messages"
  | "invalid_json"
  | "invalid_body"
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
    "Tool calls that came back as errors, by tool and classified reason (signals.ts). " +
    "Read off the tool_result the caller resends, so it counts client-executed steps too.",
  labelNames: ["tool", "reason"],
  registers: [registry],
});

const userSentiment = new client.Counter({
  name: "netbird_assistant_user_sentiment_total",
  help: "User messages carrying frustration, profanity or abuse. A kind only — never the text.",
  labelNames: ["kind"],
  registers: [registry],
});

const suggestionsResults = new client.Counter({
  name: "netbird_assistant_suggestions_total",
  help: "Quick-reply generation outcomes. empty = the answer asked nothing, so no chips.",
  labelNames: ["result"],
  registers: [registry],
});

const piiRedactions = new client.Counter({
  name: "netbird_assistant_pii_redactions_total",
  help: "Values the server-side backstop replaced before the model provider, by kind. Never the value.",
  labelNames: ["kind"],
  registers: [registry],
});

const piiBackstopFailures = new client.Counter({
  name: "netbird_assistant_pii_backstop_failures_total",
  help: "Analyzer calls that failed or timed out; the turn continued unscrubbed (fail-open).",
  registers: [registry],
});

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

export function setBuildInfo(version: string, nodeEnv: string): void {
  buildInfo.set({ version, node_env: nodeEnv }, 1);
}

export function observeHttp(route: string, method: string, status: number, durationSec: number): void {
  httpRequests.inc({ route, method, status: String(status) });
  httpDuration.observe({ route, method }, durationSec);
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

export function countPiiRedaction(kind: string): void {
  piiRedactions.inc({ kind });
}

export function countPiiBackstopFailure(): void {
  piiBackstopFailures.inc();
}

export function countLlmError(code: string, retryable: boolean): void {
  llmErrors.inc({ code, retryable: String(retryable) });
}

export function countToolRequest(tool: string, runtime: "server" | "client"): void {
  toolRequests.inc({ tool, runtime });
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

type ScrapeCollector = () => Promise<void>;
let scrapeCollector: ScrapeCollector | null = null;

export function setScrapeCollector(fn: ScrapeCollector | null): void {
  scrapeCollector = fn;
}

async function runScrapeCollector(): Promise<void> {
  if (!scrapeCollector) return;
  try {
    await scrapeCollector();
  } catch (err) {
    console.error("metrics collector failed:", (err as Error).message);
  }
}

export function resetMetricsForTests(): void {
  registry.resetMetrics();
  scrapeCollector = null;
}

function tokenOk(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  return a.length === b.length && timingSafeEqual(a, b);
}

export async function metricsHandler(req: Request): Promise<Response> {
  const cfg = loadConfig();
  if (!cfg.METRICS_ENABLED) return new Response("metrics disabled", { status: 404 });

  if (cfg.METRICS_AUTH_TOKEN) {
    const [scheme, token] = (req.headers.get("Authorization") ?? "").split(" ");
    if (scheme !== "Bearer" || !token || !tokenOk(token, cfg.METRICS_AUTH_TOKEN)) {
      return new Response("unauthorized", { status: 401 });
    }
  }
  await runScrapeCollector();
  return new Response(await registry.metrics(), {
    headers: { "Content-Type": registry.contentType },
  });
}

interface TimeSeries {
  labels: { __name__: string } & Record<string, string>;
  samples: { value: number; timestamp: number }[];
}

async function collectSeries(extraLabels: Record<string, string>): Promise<TimeSeries[]> {
  const now = Date.now();
  const series: TimeSeries[] = [];
  for (const metric of await registry.getMetricsAsJSON()) {
    for (const v of (metric as unknown as {
      name: string;
      values: { value: number; labels?: Record<string, string | number>; metricName?: string }[];
    }).values ?? []) {
      if (typeof v.value !== "number" || !Number.isFinite(v.value)) continue;
      const labels: TimeSeries["labels"] = {
        __name__: v.metricName ?? (metric as { name: string }).name,
        ...extraLabels,
      };
      for (const [k, val] of Object.entries(v.labels ?? {})) labels[k] = String(val);
      series.push({ labels, samples: [{ value: v.value, timestamp: now }] });
    }
  }
  return series;
}

async function pushOnce(): Promise<void> {
  const cfg = loadConfig();
  await runScrapeCollector();
  const series = await collectSeries({
    env: cfg.DEPLOY_ENV ?? cfg.NODE_ENV,
    host: cfg.DEPLOY_HOST ?? hostname(),
  });
  const res = await pushTimeseries(series, {
    url: cfg.METRICS_PUSH_URL!,
    // The library compresses with snappy but omits the header the spec requires.
    headers: { "Content-Encoding": "snappy" },
    ...(cfg.METRICS_PUSH_USER
      ? { auth: { username: cfg.METRICS_PUSH_USER, password: cfg.METRICS_PUSH_PASSWORD ?? "" } }
      : {}),
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(
      `remote_write ${res.status}: ${(res.errorMessage ?? res.statusText).slice(0, 200)}`,
    );
  }
}

export const METRICS_PUSH_INTERVAL_MS = 30_000;

export function startMetricsPush(): Timer | null {
  const cfg = loadConfig();
  if (!cfg.METRICS_ENABLED || !cfg.METRICS_PUSH_URL) return null;
  const timer = setInterval(() => {
    pushOnce().catch((err) => console.error("metrics push failed:", (err as Error).message));
  }, METRICS_PUSH_INTERVAL_MS);
  timer.unref();
  return timer;
}
