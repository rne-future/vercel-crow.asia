const assert = require('node:assert/strict');
const { AsyncLocalStorage } = require('node:async_hooks');
const { test } = require('node:test');

globalThis.AsyncLocalStorage = AsyncLocalStorage;
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/unit_test';
process.env.AUTH_SECRET = 'isolated-login-action-secret-long-enough';
process.env.AUTH_URL = 'http://localhost/api/auth';
process.env.VERCEL = '1';

test('custom login action uses real Auth.js, charges each budget once, and writes a session only on success', async (t) => {
  const { NextRequest } = require('next/server');
  const { createRequestStoreForAPI } = require('next/dist/server/async-storage/request-store');
  const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external');
  const { workUnitAsyncStorage } = require('next/dist/server/app-render/work-unit-async-storage.external');
  const { authService } = await import('../lib/modules/auth/auth.service.ts');
  const { authRepository } = await import('../lib/modules/auth/auth.repository.ts');
  const bcrypt = require('bcryptjs');
  const password = await bcrypt.hash('valid-password', 4);
  t.mock.method(authRepository, 'findByEmail', async () => ({ id: 'user-1', email: 'reader@example.test', password, role: 'reader', name: 'Reader' }));
  let permitted = true;
  const allowance = t.mock.method(authRepository, 'allowAttempt', async () => permitted);
  const input = { email: 'reader@example.test', password: 'valid-password' };
  const run = async () => {
    const req = new NextRequest('http://localhost/api/auth/login', { headers: { host: 'localhost', 'x-vercel-forwarded-for': '203.0.113.1' } });
    const store = createRequestStoreForAPI(req, new URL(req.url), { tags: [], expirationsByCacheKind: new Map() }, undefined, undefined);
    await workAsyncStorage.run({ route: '/api/auth/login' }, () => workUnitAsyncStorage.run(store, () => authService.login(input)));
    return store.mutableCookies.getAll();
  };
  const cookies = await run();
  assert.ok(cookies.some(cookie => cookie.name.endsWith('authjs.session-token') && cookie.value));
  assert.deepEqual(allowance.mock.calls.map(call => call.arguments.slice(0, 4)), [
    ['login-ip', '203.0.113.1', 100, 15],
    ['login-pair', JSON.stringify(['203.0.113.1', input.email]), 10, 15],
  ]);
  permitted = false;
  await assert.rejects(run(), error => error.code === 'rate_limited');
  assert.equal(allowance.mock.callCount(), 3);
});
