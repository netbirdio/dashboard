/**
 * Telemetry + usage-limit integration tests. Gated on TEST_DATABASE_URL so the
 * suite stays green without a database; run with a Postgres URL to exercise SQL.
 */
import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import { setEnv } from "./env.ts";
import { db, record, drainTelemetry, getUsage, getRollups, resetDbForTests } from "@/telemetry/store.ts";
import { registry, resetMetricsForTests } from "@/telemetry/metrics.ts";
import { refreshRollups, resetRollupsForTests } from "@/telemetry/dbGauges.ts";
import { migrate } from "@/db/migrate.ts";
import { usageLimit } from "@/middleware/usageLimit.ts";
import type { MutableCtx } from "@/http/compose.ts";
import type { TelemetryRow } from "@/types.ts";

const TEST_DB = process.env.TEST_DATABASE_URL;
const suite = TEST_DB ? describe : describe.skip;

// Small token ceilings so tests can cross them with a couple of rows.
const LIMITS = {
  DATABASE_URL: TEST_DB ?? "",
  LIMIT_USER_DAILY_TOKENS: "1000",
  LIMIT_USER_MONTHLY_TOKENS: "10000",
  LIMIT_ACCOUNT_DAILY_TOKENS: "5000",
  LIMIT_ACCOUNT_MONTHLY_TOKENS: "50000",
};

// `tokens` sets input+output (the limited quantity); split evenly.
function row(tokens: number, over: Partial<TelemetryRow> = {}): TelemetryRow {
  return {
    requestId: crypto.randomUUID(),
    accountId: "a1",
    userId: "u1",
    provider: "anthropic",
    model: "claude-opus-4-8",
    task: "chat",
    usage: { inputTokens: tokens, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
    latencyMs: 42,
    stopReason: "end_turn",
    toolCallsRequested: 0,
    createdAt: new Date(),
    ...over,
  };
}

function ctx(userId: string, accountId: string): MutableCtx {
  return { requestId: "r", startedAt: 0, principal: { userId, accountId } };
}

suite("telemetry + usage limit (integration)", () => {
  beforeAll(async () => {
    setEnv(LIMITS);
    resetDbForTests();
    await migrate();
  });

  beforeEach(async () => {
    setEnv(LIMITS);
    await db()`TRUNCATE llm_usage`;
  });

  test("record() flushes a batched INSERT that getUsage reads back", async () => {
    record(row(100));
    record(row(200));
    await drainTelemetry();

    const [{ n }] = await db()`SELECT count(*)::int AS n FROM llm_usage`;
    expect(n).toBe(2);

    const used = await getUsage({ userId: "u1", accountId: "a1" });
    expect(used.userDaily).toBe(300);
    expect(used.accountMonthly).toBe(300);
  });

  test("getUsage separates per-user from per-account totals", async () => {
    record(row(300, { userId: "u1" }));
    record(row(400, { userId: "u2" }));
    await drainTelemetry();

    const u1 = await getUsage({ userId: "u1", accountId: "a1" });
    expect(u1.userDaily).toBe(300); // only u1's own usage
    expect(u1.accountDaily).toBe(700); // whole account
  });

  test("getUsage ignores usage outside the current month", async () => {
    record(row(9000, { createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000) }));
    await drainTelemetry();
    expect((await getUsage({ userId: "u1", accountId: "a1" })).userMonthly).toBe(0);
  });

  test("usageLimit returns 402 once a ceiling is hit, else passes", async () => {
    record(row(500)); // under the 1000 user-daily cap
    await drainTelemetry();
    expect(await usageLimit(new Request("https://x"), ctx("u1", "a1"))).toBeUndefined();

    record(row(600)); // now 1100 ≥ 1000
    await drainTelemetry();
    const blocked = await usageLimit(new Request("https://x"), ctx("u1", "a1"));
    expect((blocked as Response).status).toBe(402);
  });

  test("getRollups sums today and this month, and counts distinct users", async () => {
    record(row(100, { userId: "u1" }));
    record(row(200, { userId: "u2", task: "suggestions" }));
    record(row(50, { userId: "u3", createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000) }));
    await drainTelemetry();

    const r = await getRollups();
    expect(r.day.inputTokens).toBe(300);
    expect(r.day.calls).toBe(2);
    expect(r.day.users).toBe(2);
    expect(r.day.accounts).toBe(1);
    expect(r.callsByTaskToday).toEqual({ chat: 1, suggestions: 1 });
    // Last month's row is outside both windows.
    expect(r.month.inputTokens).toBe(300);
  });

  test("rollup gauges land in the exposition", async () => {
    resetMetricsForTests();
    resetRollupsForTests();
    record(row(120, { usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 0, cacheCreationTokens: 0 } }));
    await drainTelemetry();

    await refreshRollups();
    const out = await registry.metrics();
    expect(out).toContain('netbird_assistant_tokens_today{type="input"} 100');
    expect(out).toContain('netbird_assistant_tokens_today{type="output"} 20');
    expect(out).toContain('netbird_assistant_model_calls_today{task="chat"} 1');
    expect(out).toContain("netbird_assistant_active_users_today 1");
  });
});
