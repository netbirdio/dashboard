import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import { setEnv } from "./env.ts";
import { db, record, drainTelemetry, getUsage, getRollups, resetDbForTests } from "@/db/index.ts";
import { registry, resetMetricsForTests } from "@/instrumentation/metrics.ts";
import { refreshRollups, resetRollupsForTests } from "@/db/index.ts";
import { migrate } from "@/db/migrate.ts";
import { Hono } from "hono";
import { usageLimit } from "@/http/limits.ts";
import type { AppEnv } from "@/types.ts";
import type { TelemetryRow } from "@/types.ts";

const TEST_DB = process.env.TEST_DATABASE_URL;
const suite = TEST_DB ? describe : describe.skip;

const LIMITS = {
  DATABASE_URL: TEST_DB ?? "",
  LIMIT_USER_DAILY_TOKENS: "1000",
  LIMIT_USER_MONTHLY_TOKENS: "10000",
  LIMIT_ACCOUNT_DAILY_TOKENS: "5000",
  LIMIT_ACCOUNT_MONTHLY_TOKENS: "50000",
};

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

function usageApp(userId: string, accountId: string): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use((c, next) => {
    c.set("principal", { userId, accountId });
    return next();
  });
  app.get("/x", usageLimit, (c) => c.text("ok"));
  return app;
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
    expect(u1.userDaily).toBe(300);
    expect(u1.accountDaily).toBe(700);
  });

  test("getUsage ignores usage outside the current month", async () => {
    record(row(9000, { createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000) }));
    await drainTelemetry();
    expect((await getUsage({ userId: "u1", accountId: "a1" })).userMonthly).toBe(0);
  });

  test("usageLimit returns 402 once a ceiling is hit, else passes", async () => {
    const app = usageApp("u1", "a1");
    record(row(500));
    await drainTelemetry();
    expect((await app.request("/x")).status).toBe(200);

    record(row(600));
    await drainTelemetry();
    expect((await app.request("/x")).status).toBe(402);
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
