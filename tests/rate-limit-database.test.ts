import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { readFileSync } from "node:fs";

test("limiter SQL enforces concurrent ceilings and prunes only unlocked expired budgets", { skip: !process.env.TEST_DATABASE_URL }, async (t) => {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  assert.equal(url.pathname, "/crow_checklist_batch2_test");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  const admin = postgres(url.href, { max: 1 });
  const schema = `limiter_${crypto.randomUUID().replaceAll("-", "")}`;
  const client = postgres(url.href, { max: 12, connection: { search_path: schema } });
  const oldUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = url.href;
  try {
    await admin.unsafe(`CREATE SCHEMA "${schema}"`);
    await client.unsafe(`CREATE TABLE request_rate_limits (key varchar(128) PRIMARY KEY, attempts integer NOT NULL, resets_at timestamptz NOT NULL)`);
    const migration = readFileSync(new URL("../drizzle/0007_rate_limit_expiry.sql", import.meta.url), "utf8");
    await client.unsafe(migration);
    const { authRepository } = await import("../lib/modules/auth/auth.repository");
    const schemaDefinition = await import("../lib/db/schema");
    const connection = drizzle(client, { schema: schemaDefinition });
    const allow = (scope: "login-pair" | "login-ip" | "checkout", identifier: string, limit: number) => authRepository.allowAttempt(scope, identifier, limit, 15, connection);
    const attempts = await Promise.all(Array.from({ length: 11 }, () => allow("login-pair", "source-a/email", 10)));
    assert.equal(attempts.filter(Boolean).length, 10);
    const ipAttempts = await Promise.all(Array.from({ length: 101 }, () => allow("login-ip", "source-a", 100)));
    assert.equal(ipAttempts.filter(Boolean).length, 100);
    assert.equal(await allow("login-pair", "source-b/email", 10), true);
    assert.equal(await allow("checkout", "source-a/email", 10), true);
    const key = (scope: string, id: string) => `${scope}:${createHash("sha256").update(id).digest("hex")}`;
    const targetKey = key("login-pair", "expired-target");
    await client`INSERT INTO request_rate_limits VALUES (${targetKey}, 11, NOW() - INTERVAL '1 minute')`;
    assert.equal(await allow("login-pair", "expired-target", 10), true);
    const [target] = await client`SELECT attempts, resets_at FROM request_rate_limits WHERE key = ${targetKey}`;
    assert.equal(target.attempts, 1);
    await allow("login-pair", "expired-target", 10);
    const [active] = await client`SELECT attempts, resets_at FROM request_rate_limits WHERE key = ${targetKey}`;
    assert.equal(active.attempts, 2);
    assert.equal(String(active.resets_at), String(target.resets_at));
    await client`INSERT INTO request_rate_limits SELECT 'login:legacy-' || n, 1, NOW() - INTERVAL '1 day' FROM generate_series(1, 205) n`;
    await allow("checkout", "cleanup", 10);
    assert.equal(Number((await client`SELECT count(*) FROM request_rate_limits WHERE key LIKE 'login:legacy-%'`)[0].count), 105);
    await allow("checkout", "cleanup", 10);
    assert.equal(Number((await client`SELECT count(*) FROM request_rate_limits WHERE key LIKE 'login:legacy-%'`)[0].count), 5);
    const lockedKey = key("login-pair", "locked");
    await client`INSERT INTO request_rate_limits VALUES (${lockedKey}, 10, NOW() - INTERVAL '1 day')`;
    await client.begin(async tx => {
      await tx`SELECT key FROM request_rate_limits WHERE key = ${lockedKey} FOR UPDATE`;
      await allow("checkout", "during-lock", 10);
      assert.equal((await tx`SELECT attempts FROM request_rate_limits WHERE key = ${lockedKey}`)[0].attempts, 10);
      await tx`UPDATE request_rate_limits SET resets_at = NOW() + INTERVAL '15 minutes' WHERE key = ${lockedKey}`;
    });
    assert.equal(await allow("login-pair", "locked", 10), false);
    const [preserved] = await client`SELECT attempts FROM request_rate_limits WHERE key = ${targetKey}`;
    assert.equal(preserved.attempts, 2);
    t.mock.method(connection, "execute", async () => { throw new Error("database unavailable"); });
    await assert.rejects(authRepository.allowAttempt("login-ip", "db-failure", 100, 15, connection), /database unavailable/);
  } finally {
    if (oldUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = oldUrl;
    await client.end();
    await admin.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
});
