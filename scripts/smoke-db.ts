import "./load-env";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";

async function main() {
  const [{ ok }] = await db.execute<{ ok: number }>(sql`SELECT 1 AS ok`);
  console.log(`DB smoke OK (ok=${ok})`);
  const [{ count }] = await db.execute<{ count: number }>(
    sql`SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  console.log(`public tables: ${count}`);
  const required = ["users", "orders", "books", "chapters", "chapter_translations", "pricing_tiers", "user_entitlements", "checklist_progress", "request_rate_limits", "locales", "translations"];
  const tables = await db.execute<{ table_name: string }>(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
  const missing = required.filter((name) => !tables.some((row) => row.table_name === name));
  if (missing.length) console.error(`Missing tables: ${missing.join(", ")}`);
  process.exit(missing.length ? 1 : 0);
}

main().catch((err: unknown) => {
  console.error("DB smoke FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
