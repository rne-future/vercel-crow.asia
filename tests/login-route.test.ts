import assert from "node:assert/strict";
import { test } from "node:test";
import { CredentialsSignin } from "next-auth";
import { ServiceError } from "../lib/shared/errors";

test("custom login maps safe credentials codes without exposing messages and preserves Origin checks", async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  const originalAppUrl = process.env.APP_URL;
  process.env.APP_URL = "http://localhost";
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/unit_test";
  t.after(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalUrl;
    if (originalAppUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = originalAppUrl;
  });
  const { authService } = await import("../lib/modules/auth/auth.service");
  const { POST } = await import("../app/api/auth/login/route");
  let failure: Error | null = null;
  const login = t.mock.method(authService, "login", async () => { if (failure) throw failure; });
  const request = (origin = "http://localhost") => new Request("http://localhost/api/auth/login", { method: "POST", headers: { Origin: origin }, body: new URLSearchParams({ email: "reader@example.test", password: "password" }) });
  assert.equal((await POST(request())).status, 200);
  for (const [code, status] of [["rate_limited", 429], ["login_unavailable", 503], ["credentials", 401]] as const) {
    const error = new CredentialsSignin("private secret message"); error.code = code; failure = error;
    const response = await POST(request());
    assert.equal(response.status, status);
    assert.doesNotMatch(await response.text(), /private secret/);
  }
  failure = new ServiceError(400, "Data login tidak valid.");
  assert.equal((await POST(request())).status, 400);
  const count = login.mock.callCount();
  assert.equal((await POST(request("http://attacker.test"))).status, 403);
  assert.equal(login.mock.callCount(), count);
});
