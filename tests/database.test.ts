import assert from "node:assert/strict";
import { test } from "node:test";

test("payments are atomic, concurrent callbacks are idempotent, and reader access is isolated", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const url = process.env.TEST_DATABASE_URL!;
  assert.match(new URL(url).pathname, /(?:_test|crow_audit)$/);
  process.env.DATABASE_URL = url;
  const { db } = await import("../lib/db");
  const { orders, pricingTiers, users, userEntitlements, chapterTranslations, chapters } = await import("../lib/db/schema");
  const { markOrderPaid } = await import("../lib/modules/orders/orders.service");
  const { resolveReader } = await import("../lib/modules/reader/reader.service");
  const { eq, and } = await import("drizzle-orm");
  const id = crypto.randomUUID();
  const tierId = `audit-${id.slice(0, 8)}`;
  const userId = crypto.randomUUID();
  await db.insert(users).values({ id: userId, email: `${id}@example.test` });
  await db.insert(pricingTiers).values({ id: tierId, names: {}, descriptions: {}, features: {}, priceIdr: 1000, priceUsd: "1", includedBookIds: ["missing-book"] });
  const [order] = await db.insert(orders).values({ id, orderNumber: `AUDIT-${id}`, userId, customerEmail: `${id}@example.test`, pricingTierId: tierId, amountIdr: 1000 }).returning();
  try {
    await assert.rejects(markOrderPaid(order.id));
    assert.equal((await db.select().from(orders).where(eq(orders.id, id)))[0].paymentStatus, "PENDING");
    await db.update(pricingTiers).set({ includedBookIds: ["book-1"] }).where(eq(pricingTiers.id, tierId));
    const callbacks = await Promise.all([markOrderPaid(id), markOrderPaid(id), markOrderPaid(id)]);
    assert.equal(callbacks.filter((item) => !item.idempotent).length, 1);
    assert.equal((await db.select().from(userEntitlements).where(eq(userEntitlements.userId, userId))).length, 1);
    await db.update(pricingTiers).set({ includedBookIds: ["book-2"] }).where(eq(pricingTiers.id, tierId));
    assert.deepEqual((await markOrderPaid(id)).grantedBooks, ["book-1"]);
    const free = await resolveReader("book-1", "id", "ch-0", "standard", null);
    assert.ok(!("error" in free));
    assert.equal(free.allChapters.find((chapter) => chapter.slug === "ch-2")?.isUnlocked, false);
    const locked = await resolveReader("book-1", "id", "ch-7", "standard", null);
    assert.ok(!("error" in locked));
    assert.deepEqual(locked.currentChapter.checklists, []);
    assert.deepEqual(locked.currentChapter.remotionConfig.sceneProps.steps, []);
    assert.equal(locked.currentChapter.optionalYoutube.videoId, null);
    assert.equal("rawMarkdown" in locked.currentChapter, false);
    assert.equal(locked.currentChapter.hasAccess, false);
    const unlocked = await resolveReader("book-1", "id", "ch-7", "standard", { id: userId, role: "reader" });
    assert.ok(!("error" in unlocked));
    assert.equal(unlocked.currentChapter.hasAccess, true);
    assert.ok(unlocked.currentChapter.checklists.length > 0);
    const [chapter] = await db.select().from(chapters).where(and(eq(chapters.bookId, "book-1"), eq(chapters.slug, "ch-7")));
    await db.update(chapterTranslations).set({ translationStatus: "DRAFT" }).where(eq(chapterTranslations.chapterId, chapter.id));
    try {
      const draft = await resolveReader("book-1", "id", "ch-7", "standard", null);
      assert.ok("error" in draft);
    } finally {
      await db.update(chapterTranslations).set({ translationStatus: "PUBLISHED" }).where(eq(chapterTranslations.chapterId, chapter.id));
    }
    await db.update(userEntitlements).set({ isActive: false }).where(eq(userEntitlements.userId, userId));
    await markOrderPaid(id);
    assert.equal((await db.select().from(userEntitlements).where(eq(userEntitlements.userId, userId)))[0].isActive, false);
    const { authService } = await import("../lib/modules/auth/auth.service");
    const attempts = await Promise.all(Array.from({ length: 11 }, () => authService.allowLoginAttempt(`${id}@example.test`, `test-source-${id}`)));
    assert.equal(attempts.filter(Boolean).length, 10);
    const checkoutAttempts = await Promise.all(Array.from({ length: 11 }, () => authService.allowCheckoutAttempt(`${id}@example.test`)));
    assert.equal(checkoutAttempts.filter(Boolean).length, 10);
    const { readerService } = await import("../lib/modules/reader/reader.service");
    const search = await readerService.search({ q: "kalibrasi", locale: "id" }, null);
    for (const result of search.filter((row) => !row.is_unlocked)) assert.equal(result.snippet, "");
    await assert.rejects(readerService.getPdfUrl("book-1", null), { status: 401 });
    await assert.rejects(readerService.getPdfUrl("book-1", { id: userId, role: "reader" }), { status: 403 });
    await assert.rejects(readerService.toggleChecklist({ book_id: "book-1", chapter_slug: "ch-7", item_id: "000000000000", is_completed: true }, null), { status: 403 });

    const { ordersService } = await import("../lib/modules/orders/orders.service");
    const otherId = crypto.randomUUID();
    await db.insert(orders).values({ id: otherId, orderNumber: `AUDIT-${otherId}`, userId, customerEmail: `${id}@example.test`, pricingTierId: tierId, amountIdr: 1000, mayarInvoiceId: `invoice-${otherId}` });
    try {
      await assert.rejects(ordersService.processWebhook({ data: { orderNumber: order.orderNumber, invoiceId: `invoice-${otherId}`, status: "PAID" } }), { status: 409 });
      await assert.rejects(ordersService.processWebhook({ data: { orderNumber: order.orderNumber, externalId: "wrong-order", status: "PAID" } }), { status: 409 });
      await ordersService.processWebhook({ data: { orderNumber: order.orderNumber, status: "EXPIRED" } });
      assert.equal((await db.select().from(orders).where(eq(orders.id, id)))[0].paymentStatus, "PAID");
    } finally { await db.delete(orders).where(eq(orders.id, otherId)); }

    const { i18nRepository } = await import("../lib/modules/i18n/i18n.repository");
    const { createI18nService } = await import("../lib/modules/i18n/i18n.service");
    const { locales, supportedLocales, translations } = await import("../lib/db/schema");
    const locale = { code: "fr", name: "French", label: "Français", flagEmoji: "🌐", hasDualRegister: false, isActive: true, isDefault: false };
    const key = `audit.key-${id}`;
    let invalidations = 0;
    const service = createI18nService(i18nRepository, () => { invalidations++; }, async () => {});
    const originalDefault = (await i18nRepository.getLocales()).find((row) => row.isDefault)!;
    try {
      await service.saveLocale(locale);
      assert.ok((await service.getActiveLocales()).some((row) => row.code === "fr"));
      await service.upsertTranslation({ localeCode: "id", group: "audit", key, value: "Default from DB" });
      assert.equal(((await service.getDictionary("fr")).audit as Record<string, string>)[`key-${id}`], "Default from DB");
      await service.upsertTranslation({ localeCode: "fr", group: "audit", key, value: "Target from DB" });
      assert.equal(((await service.getDictionary("fr")).audit as Record<string, string>)[`key-${id}`], "Target from DB");
      await service.deleteTranslation({ localeCode: "fr", key });
      assert.equal(((await service.getDictionary("fr")).audit as Record<string, string>)[`key-${id}`], "Default from DB");
      await assert.rejects(service.setLocaleActive({ code: "id", isActive: false }), /Default/);
      await service.setLocaleActive({ code: "fr", isActive: false });
      assert.equal(await service.resolveLocale("fr"), "id");
      assert.equal(invalidations, 5);
      await Promise.all([
        i18nRepository.saveLocale({ ...locale, isDefault: true }),
        i18nRepository.saveLocale({ code: "en", name: "English", label: "English", flagEmoji: "🌐", hasDualRegister: false, isActive: true, isDefault: true }),
      ]);
      assert.equal((await i18nRepository.getLocales()).filter((row) => row.isDefault).length, 1);
    } finally {
      await i18nRepository.saveLocale({ code: originalDefault.code, name: originalDefault.name, label: originalDefault.label, flagEmoji: originalDefault.flagEmoji,
        hasDualRegister: originalDefault.hasDualRegister, isActive: true, isDefault: true });
      await db.delete(translations).where(eq(translations.key, key));
      await db.delete(locales).where(eq(locales.code, "fr"));
      await db.delete(supportedLocales).where(eq(supportedLocales.code, "fr"));
    }

    const originalFetch = globalThis.fetch;
    const originalKey = process.env.MAYAR_API_KEY;
    const failedEmail = `failed-${id}@example.test`;
    process.env.MAYAR_API_KEY = "test-live-key";
    globalThis.fetch = async () => new Response(null, { status: 503 });
    try {
      await assert.rejects(ordersService.checkout({ pricing_tier_id: tierId, customer_email: failedEmail, customer_mobile: "081234567890", password: "buyer-test-password" }, null, "http://localhost:4051"), { status: 502 });
      const [failed] = await db.select().from(orders).where(eq(orders.customerEmail, failedEmail));
      assert.equal(failed.paymentStatus, "CLOSED");
      assert.equal(failed.amountIdr, 1000);
      assert.deepEqual(failed.includedBookIds, ["book-2"]);
      assert.equal((await db.select().from(userEntitlements).where(eq(userEntitlements.orderId, failed.id))).length, 0);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey === undefined) delete process.env.MAYAR_API_KEY; else process.env.MAYAR_API_KEY = originalKey;
      await db.delete(orders).where(eq(orders.customerEmail, failedEmail));
      await db.delete(users).where(eq(users.email, failedEmail));
    }
  } finally {
    await db.delete(orders).where(eq(orders.id, id));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(pricingTiers).where(eq(pricingTiers.id, tierId));
    await db.$client.end();
  }
});
