/**
 * Migration runner. Applies each .sql in ./migrations in filename order exactly
 * once, recording versions in schema_migrations. Runs on app boot (idempotent —
 * a no-op when nothing is pending) and via `bun run migrate`.
 */
import { readdirSync } from "node:fs";
import { db } from "@/telemetry/store.ts";

const MIGRATIONS_DIR = new URL("./migrations/", import.meta.url).pathname;

// Fixed key so concurrently-booting instances serialize on the same lock.
const LOCK_KEY = 4242424242;

/** Apply pending migrations in one advisory-locked transaction. */
export async function migrate(): Promise<void> {
  await db().begin(async (tx) => {
    // Blocks other booting instances until this transaction ends; each then
    // re-reads schema_migrations and finds nothing left to do.
    await tx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    await tx`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    const applied = new Set<string>(
      (await tx`SELECT version FROM schema_migrations`).map((r: { version: string }) => r.version),
    );
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      console.log(`applying ${file}…`);
      await tx.unsafe(await Bun.file(MIGRATIONS_DIR + file).text());
      await tx`INSERT INTO schema_migrations (version) VALUES (${file})`;
    }
  });
  console.log("migrations up to date");
}

if (import.meta.main) {
  migrate().then(
    () => process.exit(0),
    (err) => {
      console.error("migration failed:", err);
      process.exit(1);
    },
  );
}
