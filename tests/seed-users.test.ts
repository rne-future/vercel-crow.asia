import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { spawnSync } from "node:child_process";
import bcrypt from "bcryptjs";
import type { users } from "../lib/db/schema";

type SeedUser = typeof users.$inferInsert;

async function seedFixture(t: TestContext, existing: boolean) {
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://test:test@127.0.0.1:1/unit_test";
  const { db } = await import("../lib/db");
  const script = await import("../scripts/seed-users");
  if (originalUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalUrl;
  const originalPassword = process.env.SEED_DEV_PASSWORD;
  t.after(() => { if (originalPassword === undefined) delete process.env.SEED_DEV_PASSWORD; else process.env.SEED_DEV_PASSWORD = originalPassword; });
  const row = { id: "019a22a0-1234-7000-8000-000000000002", email: "admin@crow.asia", password: "existing-password-hash" };
  const select = t.mock.method(db, "select", () => ({ from: () => ({ where: () => ({ limit: async () => existing ? [{ ...row }] : [] }) }) }));
  const writes: Partial<SeedUser>[] = [];
  t.mock.method(db, "update", () => ({ set: (values: Partial<SeedUser>) => ({ where: async () => { writes.push(values); Object.assign(row, values); } }) }));
  const insert = t.mock.method(db, "insert", () => ({ values: (values: SeedUser) => ({ returning: async () => { writes.push(values); return [{ id: row.id }]; } }) }));
  return { ...script, row, writes, select, insert };
}

for (const password of [undefined, ""]) {
  test(`new seed account rejects ${password === undefined ? "missing" : "empty"} password without inserting`, async (t) => {
    const f = await seedFixture(t, false);
    if (password === undefined) delete process.env.SEED_DEV_PASSWORD; else process.env.SEED_DEV_PASSWORD = password;
    await assert.rejects(f.upsertUser("admin@crow.asia", "Admin crow.asia", "admin"), /SEED_DEV_PASSWORD/);
    assert.equal(f.insert.mock.callCount(), 0);
    assert.deepEqual(f.writes, []);
  });
}

test("new seed account hashes the explicitly supplied password", async (t) => {
  const f = await seedFixture(t, false);
  process.env.SEED_DEV_PASSWORD = "explicit-test-only-password";
  assert.equal(await f.upsertUser("admin@crow.asia", "Admin crow.asia", "admin"), f.row.id);
  assert.equal(f.writes.length, 1);
  const hash = f.writes[0].password!;
  assert.notEqual(hash, "explicit-test-only-password");
  assert.equal(await bcrypt.compare("explicit-test-only-password", hash), true);
  assert.equal(f.writes[0].role, "admin");
});

for (const password of [undefined, "different-test-only-password"]) {
  test(`existing seed account preserves password with ${password === undefined ? "missing" : "changed"} seed password`, async (t) => {
    const f = await seedFixture(t, true);
    if (password === undefined) delete process.env.SEED_DEV_PASSWORD; else process.env.SEED_DEV_PASSWORD = password;
    assert.equal(await f.upsertUser("admin@crow.asia", "Admin crow.asia", "admin"), f.row.id);
    assert.equal(f.row.password, "existing-password-hash");
    assert.equal(f.writes.length, 1);
    assert.equal("password" in f.writes[0], false);
    assert.equal(f.insert.mock.callCount(), 0);
  });
}

test("seed refuses production before accessing users and CLI exits nonzero", async (t) => {
  const f = await seedFixture(t, false);
  const env: Record<string, string | undefined> = process.env;
  const original = env.NODE_ENV;
  env.NODE_ENV = "production";
  try {
    await assert.rejects(f.main(), /Refusing to seed dev users in production/);
    assert.equal(f.select.mock.callCount(), 0);
    assert.equal(f.insert.mock.callCount(), 0);
    assert.deepEqual(f.writes, []);
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/seed-users.ts"], {
      env: { ...process.env, DATABASE_URL: "postgresql://test:test@127.0.0.1:1/unit_test" }, encoding: "utf8", timeout: 15000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Refusing to seed dev users in production/);
  } finally {
    if (original === undefined) delete env.NODE_ENV; else env.NODE_ENV = original;
  }
});
