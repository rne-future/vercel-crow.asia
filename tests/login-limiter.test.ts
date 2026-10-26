import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcryptjs";

test("shared credential verifier isolates victims by source and caps email rotation", async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  const originalVercel = process.env.VERCEL;
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/unit_test";
  process.env.VERCEL = "1";
  t.after(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalUrl;
    if (originalVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = originalVercel;
  });
  const { authRepository } = await import("../lib/modules/auth/auth.repository");
  const { authService } = await import("../lib/modules/auth/auth.service");
  const counters = new Map<string, number>();
  t.mock.method(authRepository, "allowAttempt", async (scope: string, identifier: string, limit: number, minutes: number) => {
    assert.equal(minutes, 15);
    const key = `${scope}:${identifier}`;
    const count = (counters.get(key) ?? 0) + 1;
    counters.set(key, count);
    return count <= limit;
  });
  const password = await bcrypt.hash("valid-password", 4);
  const lookup = t.mock.method(authRepository, "findByEmail", async () => ({ id: "user", email: "victim@example.test", password, role: "reader", name: "Reader" }));
  const headers = (ip: string) => new Headers({ "x-vercel-forwarded-for": ip });
  const input = { email: "victim@example.test", password: "valid-password" };
  for (let i = 0; i < 10; i++) assert.equal((await authService.verifyCredentials(input, headers("203.0.113.1")))?.id, "user");
  await assert.rejects(authService.verifyCredentials(input, headers("203.0.113.1")), { status: 429 });
  assert.equal(lookup.mock.callCount(), 10);
  assert.equal((await authService.verifyCredentials(input, headers("203.0.113.2")))?.id, "user");
  for (let i = 0; i < 100; i++) await authService.verifyCredentials({ ...input, email: `rotated-${i}@example.test`, password: "wrong-password" }, headers("203.0.113.3"));
  await assert.rejects(authService.verifyCredentials(input, headers("203.0.113.3")), { status: 429 });
  assert.equal(counters.size, 105);
  assert.equal(await authService.verifyCredentials({ ...input, password: "wrong-password" }, headers("203.0.113.2")), null);
  assert.equal(await authService.verifyCredentials({}, headers("203.0.113.2")), null);
  await assert.rejects(authService.verifyCredentials(input, new Headers()), { status: 503 });
  for (let i = 0; i < 10; i++) await authService.verifyCredentials(input, headers("2001:0db8:0:0:0:0:0:1"));
  await assert.rejects(authService.verifyCredentials(input, headers("2001:db8::1")), { status: 429 });
  const beforeFailure = lookup.mock.callCount();
  t.mock.method(authRepository, "allowAttempt", async () => { throw new Error("database unavailable"); });
  await assert.rejects(authService.verifyCredentials(input, headers("203.0.113.4")), /database unavailable/);
  assert.equal(lookup.mock.callCount(), beforeFailure);
});
