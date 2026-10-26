import assert from "node:assert/strict";
import { test } from "node:test";
import { createInvoice } from "../lib/integrations/mayar";

test("Mayar v2 uses invoice items, customer details, and order correlation", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.MAYAR_API_KEY;
  process.env.MAYAR_API_KEY = "test-live-key";
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.mayar.id/hl/v2/invoices/create");
    const body = JSON.parse(String(options?.body));
    assert.deepEqual(body.items, [{ quantity: 1, rate: 59000, description: "Test tier" }]);
    assert.equal(body.mobile, "+628123456789");
    assert.equal(body.name, "Buyer");
    assert.equal(body.extraData.orderNumber, "CROW-TEST");
    return Response.json({ data: { id: "invoice-1", transactionId: "transaction-1", link: "https://example.myr.id/invoices/1" } });
  };
  try {
    const result = await createInvoice({ orderNumber: "CROW-TEST", customerEmail: "buyer@example.com", customerName: "Buyer", customerMobile: "+628123456789", amountIdr: 59000, tierName: "Test tier", dashboardUrl: "https://crow.example/dashboard", mockPayUrl: "https://crow.example/mock" });
    assert.equal(result.transaction_id, "transaction-1");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.MAYAR_API_KEY; else process.env.MAYAR_API_KEY = originalKey;
  }
});

test("Mayar rejects HTTP failures, missing links, and insecure payment URLs", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.MAYAR_API_KEY;
  process.env.MAYAR_API_KEY = "test-live-key";
  const input = { orderNumber: "CROW-FAILURE", customerEmail: "buyer@example.test", customerName: "Buyer", customerMobile: "+628123456789", amountIdr: 59000, tierName: "Test tier", dashboardUrl: "https://crow.example/dashboard", mockPayUrl: "https://crow.example/mock" };
  try {
    for (const response of [new Response(null, { status: 503 }), Response.json({ data: { id: "invoice" } }), Response.json({ data: { id: {}, link: "https://example.test/pay" } }), Response.json({ data: { id: "invoice", link: "http://example.test/pay" } })]) {
      globalThis.fetch = async () => response;
      await assert.rejects(createInvoice(input));
    }
    globalThis.fetch = async () => { throw new DOMException("Timed out", "TimeoutError"); };
    await assert.rejects(createInvoice(input), { name: "TimeoutError" });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.MAYAR_API_KEY; else process.env.MAYAR_API_KEY = originalKey;
  }
});
