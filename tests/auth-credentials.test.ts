import assert from "node:assert/strict";
import { test } from "node:test";
import { Auth, skipCSRFCheck, type AuthConfig } from "@auth/core";
import Credentials from "@auth/core/providers/credentials";
import { ServiceError } from "../lib/shared/errors";

test("Auth.js credentials entrypoint passes source once and never issues sessions on limiter failures", async (t) => {
  const oldUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/unit_test";
  t.after(() => { if (oldUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = oldUrl; });
  const { authService } = await import("../lib/modules/auth/auth.service");
  const { authorizeCredentials } = await import("../lib/integrations/auth-credentials");
  let outcome: "ok" | "wrong" | "limited" | "unavailable" | "unexpected" = "ok";
  let calls = 0;
  t.mock.method(authService, "verifyCredentials", async (raw: unknown, headers: Headers) => {
    calls++;
    assert.deepEqual(raw, { email: "reader@example.test", password: "password" });
    assert.equal(headers.get("x-vercel-forwarded-for"), "203.0.113.10");
    if (outcome === "limited") throw new ServiceError(429, "private message", "rate_limited");
    if (outcome === "unavailable") throw new ServiceError(503, "private message", "login_unavailable");
    if (outcome === "unexpected") throw new Error("DB unavailable");
    return outcome === "ok" ? { id: "user-1", email: "reader@example.test", role: "reader", name: "Reader" } : null;
  });
  const request = () => new Request("http://localhost/api/auth/callback/credentials", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "x-vercel-forwarded-for": "203.0.113.10" },
    body: new URLSearchParams({ email: "reader@example.test", password: "password", callbackUrl: "http://localhost/dashboard" }),
  });
  const logged: string[] = [];
  const config: Omit<AuthConfig, "raw"> = { logger: { error: (error: Error) => { logged.push(error.name); } }, basePath: "/api/auth", secret: "isolated-auth-test-secret-long-enough", trustHost: true, skipCSRFCheck, providers: [Credentials({ authorize: authorizeCredentials })] };
  let response = await Auth(request(), config);
  assert.equal(calls, 1);
  assert.match(response.headers.get("set-cookie") ?? "", /authjs.session-token=/);
  for (const [state, code] of [["limited", "rate_limited"], ["unavailable", "login_unavailable"], ["wrong", "credentials"]] as const) {
    outcome = state;
    const before: number = calls;
    response = await Auth(request(), config);
    assert.equal(calls, before + 1);
    assert.equal(new URL(response.headers.get("location")!).searchParams.get("code"), code);
    assert.doesNotMatch(response.headers.get("set-cookie") ?? "", /authjs.session-token=[^;]/);
  }
  outcome = "unexpected";
  await assert.rejects(authorizeCredentials({ email: "reader@example.test", password: "password" }, request()), /DB unavailable/);
});
