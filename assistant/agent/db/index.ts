import { SQL } from "bun";
import client from "prom-client";
import { loadConfig } from "@/config.ts";
import {
  countTelemetryFailed,
  countTelemetryWritten,
  registry,
  setScrapeCollector,
  setTelemetryQueueDepth,
} from "@/instrumentation/metrics.ts";
import type { TelemetryRow, Usage } from "@/types.ts";

let sql: SQL | null = null;
export function db(): SQL {
  sql ??= new SQL(loadConfig().DATABASE_URL);
  return sql;
}

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
      countTelemetryFailed(batch.length);
      console.error("telemetry flush failed, dropped", batch.length, "rows:", (err as Error).message);
    }
  }
}

export async function drainTelemetry(): Promise<void> {
  await flush();
}

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

export async function getUsage({ accountId, userId }: UsageKey): Promise<UsageTotals> {
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
  callsByTaskToday: Record<string, number>;
}

export async function getRollups(): Promise<Rollups> {
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
  const byTask: { task: string; n: number }[] = await db()`
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
      byTask.map((r) => [r.task, Number(r.n)]),
    ),
  };
}

export interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

const PRICES: Record<string, ModelPrice> = {
  "claude-opus": { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  "claude-sonnet": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  "claude-haiku-4": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  "claude-haiku": { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
  "claude-3-5-haiku": { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
  "claude-3-5-sonnet": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
};

export function priceFor(model: string): ModelPrice | null {
  const key = Object.keys(PRICES)
    .filter((prefix) => model.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0];
  return key ? PRICES[key]! : null;
}

const PER_MILLION = 1_000_000;

export function costUsd(model: string, usage: Usage): number | null {
  const price = priceFor(model);
  if (!price) return null;
  return (
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      usage.cacheReadTokens * price.cacheRead +
      usage.cacheCreationTokens * price.cacheWrite) /
    PER_MILLION
  );
}

export function costOfTotals(
  totals: { model: string; usage: Usage }[],
): { usd: number; unpriced: number } {
  let usd = 0;
  let unpriced = 0;
  for (const { model, usage } of totals) {
    const cost = costUsd(model, usage);
    if (cost === null) unpriced += 1;
    else usd += cost;
  }
  return { usd, unpriced };
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * p;
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low]!;
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (rank - low);
}

export const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

const SESSION_SAMPLE_MAX = 5000;

export interface SessionStats {
  sessions: number;
  tokens: { mean: number; p50: number; p95: number; total: number };
  costUsd: { mean: number; p50: number; p95: number; total: number };
  unpricedCalls: number;
}

export async function getSessionStats(): Promise<SessionStats> {
  interface SessionRow {
    session: string;
    model: string;
    input_tokens: string;
    output_tokens: string;
    cache_read_tokens: string;
    cache_creation_tokens: string;
  }
  const rows: SessionRow[] = await db()`
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
  `;

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

const DB_READY_TTL_MS = 2000;
let dbReadyAt = 0;
let dbReadyOk = false;
let dbReadyCheck: Promise<boolean> | null = null;

export async function dbReady(): Promise<boolean> {
  if (Date.now() - dbReadyAt < DB_READY_TTL_MS) return dbReadyOk;
  if (dbReadyCheck) return dbReadyCheck;

  dbReadyCheck = (async () => {
    try {
      await db()`SELECT 1`;
      dbReadyOk = true;
    } catch {
      dbReadyOk = false;
    }
    dbReadyAt = Date.now();
    dbReadyCheck = null;
    return dbReadyOk;
  })();

  return dbReadyCheck;
}

export function resetDbForTests(): void {
  sql = null;
  queue.length = 0;
  inFlight = null;
  dbReadyAt = 0;
  dbReadyOk = false;
  dbReadyCheck = null;
}

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

const sessionCost = new client.Gauge({
  name: "netbird_assistant_session_cost_usd",
  help: "USD per chat session today, estimated from token counts. stat = mean | p50 | p95 | total.",
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
  help: "Model calls whose model has no entry in the price table — the cost gauges are short by these.",
  registers: [registry],
});

const rollupStaleness = new client.Gauge({
  name: "netbird_assistant_rollup_age_seconds",
  help: "Age of the rollup gauges above. Climbing means the rollup query is failing.",
  registers: [registry],
});

let lastOkMs = 0;
let refreshInFlight: Promise<void> | null = null;

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

const ROLLUP_TTL_MS = 30_000;

export async function refreshRollups(): Promise<void> {
  const ageMs = Date.now() - lastOkMs;
  if (lastOkMs !== 0) rollupStaleness.set(ageMs / 1000);
  if (ageMs < ROLLUP_TTL_MS) return;

  refreshInFlight ??= refresh().finally(() => {
    refreshInFlight = null;
  });
  await refreshInFlight;
  rollupStaleness.set(0);
}

export function installRollupGauges(): void {
  setScrapeCollector(refreshRollups);
}

export function resetRollupsForTests(): void {
  lastOkMs = 0;
  refreshInFlight = null;
}
