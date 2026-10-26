import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { verifyMayarToken, verifyWebhookSignature } from "../lib/integrations/mayar-webhook";
import { checkoutSchema, webhookSchema } from "../lib/modules/orders/orders.schema";
import { credentialsSchema } from "../lib/modules/auth/auth.schema";
import { compileChapter, localizeCompiledHtml } from "../lib/modules/reader/content/compiler";
import { getDict } from "../lib/i18n";
import { mergeDictionaries } from "../lib/modules/i18n/dictionary";

test("webhook tokens fail closed and raw-body HMAC rejects tampering and malformed signatures", () => {
  assert.equal(verifyMayarToken("", ""), false);
  assert.equal(verifyMayarToken("secret", ""), false);
  assert.equal(verifyMayarToken("secret", "different-length"), false);
  assert.equal(verifyMayarToken("secret", "secret"), true);
  const raw = '{"data":{"status":"PAID"}}';
  const signature = `sha256=${createHmac("sha256", "signing-secret").update(raw).digest("hex")}`;
  assert.equal(verifyWebhookSignature(raw, "signing-secret", signature), true);
  assert.equal(verifyWebhookSignature(raw + " ", "signing-secret", signature), false);
  assert.equal(verifyWebhookSignature(raw, "wrong-secret", signature), false);
  assert.equal(verifyWebhookSignature(raw, "signing-secret", "sha256=garbage"), false);
});

test("checkout rejects overlong bcrypt input, client prices, malformed emails and provider identifiers", () => {
  const input = { pricing_tier_id: "tier-book-1", customer_email: "buyer@example.test", customer_mobile: "081234567890", password: "buyer-password" };
  assert.equal(checkoutSchema.safeParse(input).success, true);
  assert.equal(checkoutSchema.safeParse({ ...input, password: "界".repeat(25) }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...input, amount: 1 }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...input, customer_email: "not-an-email" }).success, false);
  assert.equal(credentialsSchema.safeParse({ email: "reader@example.test", password: "a".repeat(1025) }).success, false);
  assert.equal(webhookSchema.safeParse({ data: { invoiceId: {} } }).success, false);
});

test("dynamic compiler labels remain plain text and legacy executable HTML is sanitized before rendering", () => {
  const dict = mergeDictionaries(getDict("en"), { compiler: { mermaid_badge: '<img src=x onerror=alert(1)>', practice_badge: "Updated practice" } });
  const chapter = compileChapter('```mermaid\nflowchart LR\n A-->B\n```\n\n- [ ] Do it', "Test", "en", "standard", "book-1", 0, dict);
  assert.match(chapter.compiledHtml, /&lt;img/);
  assert.doesNotMatch(chapter.compiledHtml, /<img/);
  const localized = localizeCompiledHtml('<script>alert(1)</script><span class="crow-practice-badge">Old</span><p onclick="alert(1)">Safe</p>', dict);
  assert.match(localized, /Updated practice/);
  assert.doesNotMatch(localized, /<script|onclick=/);
});
