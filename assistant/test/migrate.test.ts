import { describe, test, expect, beforeEach } from "bun:test";
import { setEnv } from "./env.ts";
import { db, resetDbForTests } from "@/db/index.ts";
import { migrate } from "@/db/migrate.ts";

const TEST_DB = process.env.TEST_DATABASE_URL;
const suite = TEST_DB ? describe : describe.skip;

const versions = async () =>
  (await db()`SELECT version FROM schema_migrations ORDER BY version`).map(
    (r: { version: string }) => r.version,
  );

const tableExists = async (name: string) =>
  (await db()`SELECT to_regclass(${"public." + name}) IS NOT NULL AS present`)[0].present as boolean;

suite("migrations (integration)", () => {
  beforeEach(async () => {
    setEnv({ DATABASE_URL: TEST_DB! });
    resetDbForTests();
    await db()`DROP TABLE IF EXISTS llm_usage, turn_signals, schema_migrations CASCADE`;
  });

  test("applies pending migrations on a fresh database", async () => {
    await migrate();
    expect(await versions()).toContain("0001_init.sql");
    expect(await tableExists("llm_usage")).toBe(true);
  });

  test("is idempotent — a second run changes nothing", async () => {
    await migrate();
    const first = await versions();
    await migrate();
    expect(await versions()).toEqual(first);
  });

  test("concurrent runs are safe — each migration recorded exactly once", async () => {
    await Promise.all([migrate(), migrate(), migrate()]);
    const [{ dupes }] = await db()`
      SELECT count(*)::int AS dupes FROM (
        SELECT version FROM schema_migrations GROUP BY version HAVING count(*) > 1
      ) d
    `;
    expect(dupes).toBe(0);
    expect(await tableExists("llm_usage")).toBe(true);
  });
});
