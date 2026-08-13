/**
 * Telemetry store (Postgres via Bun.sql). Writes are async/batched so logging
 * never adds latency to the response — one row per model call, with token usage.
 */
import { SQL } from "bun";
import { loadConfig } from "@/config.ts";
import {
  setTelemetryQueueDepth,
  countTelemetryWritten,
  countTelemetryFailed,
} from "@/telemetry/metrics.ts";
import { costOfTotals, mean, percentile } from "@/telemetry/pricing.ts";
import type { TelemetryRow, Usage } from "@/types.ts";

let sql: SQL | null = null;
export function db(): SQL {
  if (sql) return sql;
  sql = new SQL(loadConfig().DATABASE_URL);
  return sql;
}

// ── async batched writer ─────────────────────────────────────────────────────
const queue: TelemetryRow[] = [];
let inFlight: Promise<void> | null = null;

function toDbRow(r: TelemetryRow) {
  return {
    request_id: r.requestId,
    conversation_id: r.conversationId ?? null,
    account_id: r.accountId,
    user_id: r.userId,
    provider: r.provider,
    model: r.model,
    task: r.task,
    input_tokens: r.usage.inputTokens,
    output_tokens: r.usage.outputTokens,
    cache_read_tokens: r.usage.cacheReadTokens,
    cache_creation_tokens: r.usage.cacheCreationTokens,
    latency_ms: r.latencyMs,
    stop_reason: r.stopReason,
    tool_calls_requested: r.toolCallsRequested,
    created_at: r.createdAt,
  };
}

/** Enqueue a telemetry row. Non-blocking; never throws into the request path. */
export function record(row: TelemetryRow): void {
  queue.push(row);
  setTelemetryQueueDepth(queue.length);
  void flush();
}

function flush(): Promise<void> {
  if (inFlight) return inFlight;
  if (queue.length === 0) return Promise.resolve();
  inFlight = drain().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function drain(): Promise<void> {
  while (queue.length) {
    const batch = queue.splice(0, queue.length).map(toDbRow);
    setTelemetryQueueDepth(queue.length);
    try {
      await db()`INSERT INTO llm_usage ${db()(batch)}`;
      countTelemetryWritten(batch.length);
    } catch (err) {
      // Never crash the server on a telemetry write; drop the batch but log why.
      countTelemetryFailed(batch.length);
      console.error("telemetry flush failed, dropped", batch.length, "rows:", (err as Error).message);
    }
  }
}

/** Flush remaining rows (e.g. on shutdown). */
export async function drainTelemetry(): Promise<void> {
  await flush();
}

// ── token-usage aggregates (for the usage-limit middleware) ──────────────────
export interface UsageKey {
  accountId: string;
  userId: string;
}

export interface UsageTotals {
  userDaily: number;
  userMonthly: number;
  accountDaily: number;
  accountMonthly: number;
}

/** Tokens (input + output) used by the user + account over the current day/month (UTC). */
export async function getUsage({ accountId, userId }: UsageKey): Promise<UsageTotals> {
  // One scan of the current month (daily window ⊂ monthly) with FILTERed sums.
  const [row] = await db()`
    SELECT
      COALESCE(SUM(input_tokens + output_tokens) FILTER (
        WHERE user_id = ${userId} AND created_at >= date_trunc('day', now())), 0) AS user_daily,
      COALESCE(SUM(input_tokens + output_tokens) FILTER (
        WHERE user_id = ${userId}), 0) AS user_monthly,
      COALESCE(SUM(input_tokens + output_tokens) FILTER (
        WHERE account_id = ${accountId} AND created_at >= date_trunc('day', now())), 0) AS account_daily,
      COALESCE(SUM(input_tokens + output_tokens) FILTER (
        WHERE account_id = ${accountId}), 0) AS account_monthly
    FROM llm_usage
    WHERE (user_id = ${userId} OR account_id = ${accountId})
      AND created_at >= date_trunc('month', now())
  `;
  return {
    userDaily: Number(row.user_daily),
    userMonthly: Number(row.user_monthly),
    accountDaily: Number(row.account_daily),
    accountMonthly: Number(row.account_monthly),
  };
}

// ── service-wide rollups (for the /metrics gauges) ───────────────────────────
export interface WindowRollup {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  calls: number;
  toolCalls: number;
  users: number;
  accounts: number;
}

export interface Rollups {
  day: WindowRollup;
  month: WindowRollup;
  /** Model calls today, keyed by task (chat, guardrail, suggestions). */
  callsByTaskToday: Record<string, number>;
}

/**
 * Whole-service totals for the current UTC day and month. Deliberately not
 * per-account: this feeds Prometheus gauges, and account_id as a label is a
 * series explosion (per-tenant numbers stay in Postgres, queried on demand).
 */
export async function getRollups(): Promise<Rollups> {
  // One scan of the current month; the day window is a FILTERed subset of it.
  const [row] = await db()`
    SELECT
      COALESCE(SUM(input_tokens) FILTER (WHERE d), 0)            AS d_input,
      COALESCE(SUM(output_tokens) FILTER (WHERE d), 0)           AS d_output,
      COALESCE(SUM(cache_read_tokens) FILTER (WHERE d), 0)       AS d_cache_read,
      COALESCE(SUM(cache_creation_tokens) FILTER (WHERE d), 0)   AS d_cache_creation,
      COUNT(*) FILTER (WHERE d)                                  AS d_calls,
      COALESCE(SUM(tool_calls_requested) FILTER (WHERE d), 0)    AS d_tool_calls,
      COUNT(DISTINCT user_id) FILTER (WHERE d)                   AS d_users,
      COUNT(DISTINCT account_id) FILTER (WHERE d)                AS d_accounts,
      COALESCE(SUM(input_tokens), 0)                             AS m_input,
      COALESCE(SUM(output_tokens), 0)                            AS m_output,
      COALESCE(SUM(cache_read_tokens), 0)                        AS m_cache_read,
      COALESCE(SUM(cache_creation_tokens), 0)                    AS m_cache_creation,
      COUNT(*)                                                   AS m_calls,
      COALESCE(SUM(tool_calls_requested), 0)                     AS m_tool_calls,
      COUNT(DISTINCT user_id)                                    AS m_users,
      COUNT(DISTINCT account_id)                                 AS m_accounts
    FROM (
      SELECT *, created_at >= date_trunc('day', now()) AS d
      FROM llm_usage
      WHERE created_at >= date_trunc('month', now())
    ) t
  `;
  const byTask = await db()`
    SELECT task, COUNT(*) AS n
    FROM llm_usage
    WHERE created_at >= date_trunc('day', now())
    GROUP BY task
  `;
  const win = (p: "d" | "m"): WindowRollup => ({
    inputTokens: Number(row[`${p}_input`]),
    outputTokens: Number(row[`${p}_output`]),
    cacheReadTokens: Number(row[`${p}_cache_read`]),
    cacheCreationTokens: Number(row[`${p}_cache_creation`]),
    calls: Number(row[`${p}_calls`]),
    toolCalls: Number(row[`${p}_tool_calls`]),
    users: Number(row[`${p}_users`]),
    accounts: Number(row[`${p}_accounts`]),
  });
  return {
    day: win("d"),
    month: win("m"),
    callsByTaskToday: Object.fromEntries(
      (byTask as { task: string; n: number }[]).map((r) => [r.task, Number(r.n)]),
    ),
  };
}

// ── cost per chat ────────────────────────────────────────────────────────────

/**
 * Sessions are capped so one busy day can't turn a scrape into a full-table
 * aggregate. The busiest sessions are kept (they're the ones that set the upper
 * percentiles), and the gauge reports how many were considered.
 */
const SESSION_SAMPLE_MAX = 5000;

export interface SessionStats {
  /** Sessions in the window (a chat with no conversation id counts as one). */
  sessions: number;
  tokens: { mean: number; p50: number; p95: number; total: number };
  costUsd: { mean: number; p50: number; p95: number; total: number };
  /** Model calls whose model has no price — the estimate is short by these. */
  unpricedCalls: number;
}

/**
 * What a chat costs, over the current UTC day.
 *
 * Aggregated per (conversation, model) in SQL — bounded by the number of models —
 * then priced and summarised here, because the price table lives in TypeScript
 * and duplicating it into SQL is how the two drift apart. Per-session percentiles
 * need per-session rows, which is why this doesn't just divide the daily total by
 * the session count: the mean of a handful of long builds and a hundred one-line
 * questions describes neither.
 */
export async function getSessionStats(): Promise<SessionStats> {
  const rows = (await db()`
    SELECT
      COALESCE(conversation_id, request_id::text) AS session,
      model,
      SUM(input_tokens)          AS input_tokens,
      SUM(output_tokens)         AS output_tokens,
      SUM(cache_read_tokens)     AS cache_read_tokens,
      SUM(cache_creation_tokens) AS cache_creation_tokens
    FROM llm_usage
    WHERE created_at >= date_trunc('day', now())
    GROUP BY 1, 2
    ORDER BY SUM(input_tokens + output_tokens) DESC
    LIMIT ${SESSION_SAMPLE_MAX}
  `) as {
    session: string;
    model: string;
    input_tokens: string;
    output_tokens: string;
    cache_read_tokens: string;
    cache_creation_tokens: string;
  }[];

  const bySession = new Map<string, { model: string; usage: Usage }[]>();
  for (const row of rows) {
    const usage: Usage = {
      inputTokens: Number(row.input_tokens),
      outputTokens: Number(row.output_tokens),
      cacheReadTokens: Number(row.cache_read_tokens),
      cacheCreationTokens: Number(row.cache_creation_tokens),
    };
    const list = bySession.get(row.session) ?? [];
    list.push({ model: row.model, usage });
    bySession.set(row.session, list);
  }

  const tokenSamples: number[] = [];
  const costSamples: number[] = [];
  let unpricedCalls = 0;
  for (const totals of bySession.values()) {
    tokenSamples.push(
      totals.reduce(
        (sum, t) =>
          sum +
          t.usage.inputTokens +
          t.usage.outputTokens +
          t.usage.cacheReadTokens +
          t.usage.cacheCreationTokens,
        0,
      ),
    );
    const { usd, unpriced } = costOfTotals(totals);
    costSamples.push(usd);
    unpricedCalls += unpriced;
  }

  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  return {
    sessions: bySession.size,
    tokens: {
      mean: mean(tokenSamples),
      p50: percentile(tokenSamples, 0.5),
      p95: percentile(tokenSamples, 0.95),
      total: sum(tokenSamples),
    },
    costUsd: {
      mean: mean(costSamples),
      p50: percentile(costSamples, 0.5),
      p95: percentile(costSamples, 0.95),
      total: sum(costSamples),
    },
    unpricedCalls,
  };
}

/** Readiness probe helper — cheap connectivity check. */
export async function dbReady(): Promise<boolean> {
  try {
    await db()`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/** Test-only: point the pool at a fresh DATABASE_URL and clear the queue. */
export function resetDbForTests(): void {
  sql = null;
  queue.length = 0;
  inFlight = null;
}
