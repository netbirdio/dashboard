/**
 * Postgres-backed rollup gauges: how much the service has used *so far today*
 * and *this month*.
 *
 * Counters in metrics.ts answer "what rate", and reset with the process. These
 * answer "what total, since midnight UTC" — read from `model_calls`, so a deploy
 * or crash mid-day doesn't zero the number, and no 24h range query is needed to
 * read it. They are whole-service sums: per-account attribution stays in
 * Postgres, where it can't explode Prometheus' series count.
 *
 * Refreshed on scrape, at most once per METRICS_DB_ROLLUP_SEC, so a tight scrape
 * interval (or several scrapers) can't turn into a query per scrape.
 */
import client from "prom-client";
import { loadConfig } from "@/config.ts";
import { registry, setScrapeCollector } from "@/telemetry/metrics.ts";
import { getRollups, getSessionStats } from "@/telemetry/store.ts";

const tokensDay = new client.Gauge({
  name: "netbird_assistant_tokens_today",
  help: "Tokens used since midnight UTC, by type.",
  labelNames: ["type"],
  registers: [registry],
});

const tokensMonth = new client.Gauge({
  name: "netbird_assistant_tokens_month",
  help: "Tokens used since the start of the UTC month, by type.",
  labelNames: ["type"],
  registers: [registry],
});

const callsDay = new client.Gauge({
  name: "netbird_assistant_model_calls_today",
  help: "Model calls since midnight UTC, by task.",
  labelNames: ["task"],
  registers: [registry],
});

const toolCallsDay = new client.Gauge({
  name: "netbird_assistant_tool_calls_today",
  help: "Tool calls the model requested since midnight UTC.",
  registers: [registry],
});

const activeUsersDay = new client.Gauge({
  name: "netbird_assistant_active_users_today",
  help: "Distinct users that made a model call since midnight UTC.",
  registers: [registry],
});

const activeAccountsDay = new client.Gauge({
  name: "netbird_assistant_active_accounts_today",
  help: "Distinct accounts that made a model call since midnight UTC.",
  registers: [registry],
});

const activeUsersMonth = new client.Gauge({
  name: "netbird_assistant_active_users_month",
  help: "Distinct users that made a model call this UTC month.",
  registers: [registry],
});

const activeAccountsMonth = new client.Gauge({
  name: "netbird_assistant_active_accounts_month",
  help: "Distinct accounts that made a model call this UTC month.",
  registers: [registry],
});

/**
 * Cost of a chat, today. The whole point of the `stat` label is that an average
 * alone is misleading here: a handful of canvas builds and a hundred one-line
 * questions have wildly different shapes, so p50 is what a typical chat costs and
 * p95 is what the expensive ones do.
 */
const sessionCost = new client.Gauge({
  name: "netbird_assistant_session_cost_usd",
  help: "USD per chat session today, estimated from token counts (telemetry/pricing.ts). stat = mean | p50 | p95 | total.",
  labelNames: ["stat"],
  registers: [registry],
});

const sessionTokens = new client.Gauge({
  name: "netbird_assistant_session_tokens",
  help: "Tokens per chat session today (input + output + cache). stat = mean | p50 | p95 | total.",
  labelNames: ["stat"],
  registers: [registry],
});

const sessionsDay = new client.Gauge({
  name: "netbird_assistant_sessions_today",
  help: "Chat sessions counted today. Capped at the rollup's sample size, so a flat number here means the cap was hit.",
  registers: [registry],
});

const unpricedCallsDay = new client.Gauge({
  name: "netbird_assistant_unpriced_model_calls_today",
  help: "Model calls whose model has no entry in the price table — the cost gauges are short by these. Anything above 0 means telemetry/pricing.ts needs the new model adding.",
  registers: [registry],
});

const rollupStaleness = new client.Gauge({
  name: "netbird_assistant_rollup_age_seconds",
  help: "Age of the rollup gauges above. Climbing means the rollup query is failing.",
  registers: [registry],
});

let lastOkMs = 0;
let inFlight: Promise<void> | null = null;

async function refresh(): Promise<void> {
  const r = await getRollups();
  tokensDay.set({ type: "input" }, r.day.inputTokens);
  tokensDay.set({ type: "output" }, r.day.outputTokens);
  tokensDay.set({ type: "cache_read" }, r.day.cacheReadTokens);
  tokensDay.set({ type: "cache_creation" }, r.day.cacheCreationTokens);
  tokensMonth.set({ type: "input" }, r.month.inputTokens);
  tokensMonth.set({ type: "output" }, r.month.outputTokens);
  tokensMonth.set({ type: "cache_read" }, r.month.cacheReadTokens);
  tokensMonth.set({ type: "cache_creation" }, r.month.cacheCreationTokens);

  // Reset first so a task that saw no calls today reads 0 rather than yesterday's
  // value, which would otherwise stick around until the process restarts.
  callsDay.reset();
  for (const [task, n] of Object.entries(r.callsByTaskToday)) callsDay.set({ task }, n);

  toolCallsDay.set(r.day.toolCalls);
  activeUsersDay.set(r.day.users);
  activeAccountsDay.set(r.day.accounts);
  activeUsersMonth.set(r.month.users);
  activeAccountsMonth.set(r.month.accounts);

  const s = await getSessionStats();
  sessionsDay.set(s.sessions);
  unpricedCallsDay.set(s.unpricedCalls);
  for (const stat of ["mean", "p50", "p95", "total"] as const) {
    sessionCost.set({ stat }, s.costUsd[stat]);
    sessionTokens.set({ stat }, s.tokens[stat]);
  }

  lastOkMs = Date.now();
}

/** Refresh if the cached values have aged out. Throws only if the query does. */
export async function refreshRollups(): Promise<void> {
  const ttlSec = loadConfig().METRICS_DB_ROLLUP_SEC;
  if (ttlSec === 0) return;
  const ageMs = Date.now() - lastOkMs;
  if (lastOkMs !== 0) rollupStaleness.set(ageMs / 1000);
  if (ageMs < ttlSec * 1000) return;
  // Concurrent scrapes share one query rather than queueing several.
  inFlight ??= refresh().finally(() => {
    inFlight = null;
  });
  await inFlight;
  rollupStaleness.set(0);
}

/** Wire the rollups into /metrics. No-op when the rollup TTL is 0. */
export function installRollupGauges(): void {
  if (loadConfig().METRICS_DB_ROLLUP_SEC === 0) return;
  setScrapeCollector(refreshRollups);
}

/** Test-only: forget the cached rollup so the next call re-queries. */
export function resetRollupsForTests(): void {
  lastOkMs = 0;
  inFlight = null;
}
