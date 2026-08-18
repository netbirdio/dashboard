import { readdirSync } from "node:fs";
import { db } from "@/db/index.ts";

const MIGRATIONS_DIR = new URL("./migrations/", import.meta.url).pathname;

const LOCK_KEY = 4242424242;

export async function migrate(): Promise<void> {
  await db().begin(async (tx) => {
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
  try {
    await migrate();
    process.exit(0);
  } catch (err) {
    console.error("migration failed:", err);
    process.exit(1);
  }
}
