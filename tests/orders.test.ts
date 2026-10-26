import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import type { OrderRow } from "../lib/modules/orders/orders.repository";
import type { Transaction } from "../lib/db/types";

async function modules() {
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://test:test@127.0.0.1:1/unit_test";
  try {
    const [service, orders, books, auth, users, entitlements] = await Promise.all([
      import("../lib/modules/orders/orders.service"),
      import("../lib/modules/orders/orders.repository"),
      import("../lib/modules/books/books.repository"),
      import("../lib/modules/auth/auth.service"),
      import("../lib/modules/auth/auth.repository"),
      import("../lib/modules/reader/entitlements.repository"),
    ]);
    return { ...service, ...orders, ...books, ...auth, ...users, ...entitlements };
  } finally {
    if (originalUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalUrl;
  }
}

const tier = {
  id: "tier-book-1", names: { id: "Buku satu" }, descriptions: {}, features: {}, badges: null,
  priceIdr: 59000, strikePriceIdr: null, priceUsd: "4.99", includedBookIds: ["book-1"],
  sortOrder: 1, isBestValue: false, isActive: true, createdAt: null, updatedAt: null,
};

function orderFixture(): OrderRow {
  return {
    id: "019a22a0-1234-7000-8000-000000000001", orderNumber: "CROW-TEST", userId: "019a22a0-1234-7000-8000-000000000002",
    customerEmail: "buyer@example.test", pricingTierId: tier.id, amountIdr: 59000, includedBookIds: ["book-1"],
    mayarInvoiceId: "invoice-1", mayarTransactionId: null, paymentLink: null, paymentStatus: "PENDING",
    rawWebhookPayload: null, paidAt: null, createdAt: null, updatedAt: null,
  };
}

async function paymentFixture(t: TestContext) {
  const m = await modules();
  let stored = orderFixture();
  const tx = {} as Transaction;
  let queue = Promise.resolve();
  t.mock.method(m.ordersRepository, "transaction", async (operation: (tx: Transaction) => Promise<unknown>) => {
    const previous = queue;
    const released = Promise.withResolvers<void>();
    queue = released.promise;
    await previous;
    try { return await operation(tx); } finally { released.resolve(); }
  });
  t.mock.method(m.ordersRepository, "getById", async (id: string, connection: Transaction, lock: boolean) => {
    assert.equal(id, stored.id);
    assert.equal(connection, tx);
    assert.equal(lock, true);
    return { ...stored };
  });
  const update = t.mock.method(m.ordersRepository, "update", async (_id: string, values: Partial<OrderRow>) => {
    stored = { ...stored, ...Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) };
    return { ...stored };
  });
  t.mock.method(m.booksRepository, "getTier", async () => tier);
  const grant = t.mock.method(m.entitlementsRepository, "grant", async () => {});
  return { ...m, update, grant, get stored() { return stored; }, set stored(value: OrderRow) { stored = value; } };
}

for (const [label, details] of Object.entries({ omitted: {}, undefined: { mayarTransactionId: undefined }, null: { mayarTransactionId: null } })) {
  test(`paid replay preserves stored transaction ID with ${label} ID`, async (t) => {
    const f = await paymentFixture(t);
    f.stored = { ...f.stored, mayarTransactionId: "tx-1", paymentStatus: "PAID" };
    const result = await f.markOrderPaid(f.stored.id, details);
    assert.equal(result.order.mayarTransactionId, "tx-1");
    assert.equal(f.stored.mayarTransactionId, "tx-1");
    assert.equal(result.idempotent, true);
  });
}

test("payment accepts a new transaction ID but rejects a conflicting ID without side effects", async (t) => {
  const f = await paymentFixture(t);
  assert.equal((await f.markOrderPaid(f.stored.id, { mayarTransactionId: "tx-1" })).order.mayarTransactionId, "tx-1");
  const updates = f.update.mock.callCount();
  const grants = f.grant.mock.callCount();
  await assert.rejects(f.markOrderPaid(f.stored.id, { mayarTransactionId: "tx-2" }), { status: 409 });
  assert.equal(f.stored.mayarTransactionId, "tx-1");
  assert.equal(f.update.mock.callCount(), updates);
  assert.equal(f.grant.mock.callCount(), grants);
});

test("concurrent webhook snapshots cannot erase the transaction ID learned by the first callback", async (t) => {
  const f = await paymentFixture(t);
  const snapshot = { ...f.stored };
  const bothLookedUp = Promise.withResolvers<void>();
  const firstCommitted = Promise.withResolvers<void>();
  let lookups = 0;
  t.mock.method(f.ordersRepository, "findWebhookOrders", async (ids: { transactionId?: string }) => {
    if (++lookups === 2) bothLookedUp.resolve();
    await bothLookedUp.promise;
    if (!ids.transactionId) await firstCommitted.promise;
    return [{ ...snapshot }];
  });
  const withoutId = f.ordersService.processWebhook({ data: { orderNumber: snapshot.orderNumber, status: "PAID" } });
  const withId = f.ordersService.processWebhook({ data: { orderNumber: snapshot.orderNumber, status: "PAID", transactionId: "tx-1" } });
  let first;
  try { first = await withId; } finally { firstCommitted.resolve(); }
  const second = await withoutId;
  assert.equal(first.status, "success");
  assert.equal(second.status, "success");
  assert.equal(first.idempotent, false);
  assert.equal(second.idempotent, true);
  assert.equal(f.stored.mayarTransactionId, "tx-1");
});

async function checkoutFixture(t: TestContext, authenticated: boolean) {
  const m = await modules();
  const profile = { id: orderFixture().userId!, email: "buyer@example.test", name: "Buyer", role: "reader" };
  t.mock.method(m.authService, "getProfile", async () => authenticated ? profile : null);
  const attempts = new Map<string, number>();
  const emails: string[] = [];
  t.mock.method(m.authService, "allowCheckoutAttempt", async (email: string) => {
    emails.push(email);
    const count = (attempts.get(email) ?? 0) + 1;
    attempts.set(email, count);
    return count <= 10;
  });
  t.mock.method(m.booksRepository, "getTier", async () => tier);
  t.mock.method(m.authRepository, "findByEmail", async () => null);
  const createUser = t.mock.method(m.authRepository, "createUser", async () => ({ id: profile.id }));
  t.mock.method(m.ordersRepository, "transaction", async (operation: (tx: Transaction) => Promise<unknown>) => operation({} as Transaction));
  const created: OrderRow[] = [];
  t.mock.method(m.ordersRepository, "create", async (input: Partial<OrderRow>) => {
    const order = { ...orderFixture(), ...input };
    created.push(order);
    return order;
  });
  t.mock.method(m.ordersRepository, "update", async () => orderFixture());
  const originalKey = process.env.MAYAR_API_KEY;
  process.env.MAYAR_API_KEY = "test-live-key";
  t.after(() => { if (originalKey === undefined) delete process.env.MAYAR_API_KEY; else process.env.MAYAR_API_KEY = originalKey; });
  const invoiceEmails: string[] = [];
  const fetch = t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    invoiceEmails.push(JSON.parse(String(options.body)).email);
    return Response.json({ data: { id: "invoice-1", link: "https://example.test/pay" } });
  });
  const input = { pricing_tier_id: tier.id, customer_email: "submitted@example.test", customer_mobile: "081234567890", password: "buyer-test-password" };
  return { ...m, profile, emails, created, invoiceEmails, fetch, createUser, input, user: authenticated ? { id: profile.id, role: "reader" } : null };
}

test("authenticated checkout uses the account email for order, invoice and allowance despite rotating input emails", async (t) => {
  const f = await checkoutFixture(t, true);
  for (let i = 0; i < 10; i++) {
    const result = await f.ordersService.checkout({ ...f.input, customer_email: `rotating-${i}@example.test` }, f.user, "http://localhost:4051");
    assert.equal(result.payment_link, "https://example.test/pay");
  }
  await assert.rejects(f.ordersService.checkout({ ...f.input, customer_email: "another@example.test" }, f.user, "http://localhost:4051"), { status: 429 });
  assert.deepEqual(f.emails, Array(11).fill("buyer@example.test"));
  assert.deepEqual(f.created.map((order) => order.customerEmail), Array(10).fill("buyer@example.test"));
  assert.deepEqual(f.invoiceEmails, Array(10).fill("buyer@example.test"));
  assert.equal(f.createUser.mock.callCount(), 0);
  assert.equal(f.fetch.mock.callCount(), 10);
});

test("guest checkout shares normalized email across allowance, order and invoice", async (t) => {
  const f = await checkoutFixture(t, false);
  await f.ordersService.checkout({ ...f.input, customer_email: "  Guest@Example.Test  " }, null, "http://localhost:4051");
  assert.deepEqual(f.emails, ["guest@example.test"]);
  assert.equal(f.created[0].customerEmail, "guest@example.test");
  assert.deepEqual(f.invoiceEmails, ["guest@example.test"]);
  assert.equal(f.createUser.mock.callCount(), 1);
});

test("guest checkout still requires a password and rejects an existing account before creating an order", async (t) => {
  const f = await checkoutFixture(t, false);
  await assert.rejects(f.ordersService.checkout({ ...f.input, password: undefined }, null, "http://localhost:4051"), { status: 400 });
  t.mock.method(f.authRepository, "findByEmail", async () => ({ id: f.profile.id }));
  await assert.rejects(f.ordersService.checkout(f.input, null, "http://localhost:4051"), { status: 409 });
  assert.equal(f.created.length, 0);
  assert.equal(f.fetch.mock.callCount(), 0);
});
