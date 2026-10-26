import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveLoginSource } from "../lib/modules/auth/login-source";

test("login source trusts only a valid single Vercel IP and canonicalizes IPv6", (t) => {
  const constEnv: Record<string, string | undefined> = process.env;
  const original = { VERCEL: process.env.VERCEL, NODE_ENV: process.env.NODE_ENV };
  t.after(() => { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  process.env.VERCEL = "1";
  const headers = (ip: string) => new Headers({ "x-vercel-forwarded-for": ip });
  assert.equal(resolveLoginSource(headers("203.0.113.10")), "203.0.113.10");
  assert.equal(resolveLoginSource(headers("2001:0db8:0:0:0:0:0:1")), resolveLoginSource(headers("2001:db8::1")));
  for (const ip of ["", "example.com", "203.0.113.10:80", "fe80::1%eth0", "203.0.113.10, 203.0.113.11"]) {
    assert.throws(() => resolveLoginSource(headers(ip)), { status: 503 });
  }
  assert.throws(() => resolveLoginSource(new Headers({ "x-forwarded-for": "203.0.113.10", "cf-connecting-ip": "203.0.113.10" })), { status: 503 });
  delete process.env.VERCEL;
  constEnv.NODE_ENV = "test";
  assert.equal(resolveLoginSource(headers("203.0.113.10")), "local-development");
  constEnv.NODE_ENV = "production";
  assert.throws(() => resolveLoginSource(new Headers({ "x-vercel-id": "forged", "x-vercel-forwarded-for": "203.0.113.10" })), { status: 503 });
});
