import assert from "node:assert/strict";
import { test } from "node:test";

async function modules() {
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://test:test@127.0.0.1:1/unit_test";
  try {
    const [compiler, service, reader, books, auth, entitlements, i18n] = await Promise.all([
      import("../lib/modules/reader/content/compiler"),
      import("../lib/modules/reader/reader.service"),
      import("../lib/modules/reader/reader.repository"),
      import("../lib/modules/books/books.repository"),
      import("../lib/modules/auth/auth.service"),
      import("../lib/modules/reader/entitlements.service"),
      import("../lib/modules/i18n/i18n.service"),
    ]);
    return { ...compiler, ...service, ...reader, ...books, ...auth, ...entitlements, ...i18n };
  } finally {
    if (originalUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalUrl;
  }
}

test("stableItemId is deterministic and position-independent", async () => {
  const m = await modules();
  const id1 = m.stableItemId("Review daily priorities");
  const id2 = m.stableItemId("Review daily priorities");
  assert.equal(id1, id2);
  assert.notEqual(m.stableItemId("Task A"), m.stableItemId("Task B"));
  assert.equal(id1.length, 12);
  assert.match(id1, /^[0-9a-f]{12}$/);
});

test("extractChecklists assigns stable itemId from label text", async () => {
  const m = await modules();
  const forward = m.compileChapter("- [ ] Alpha task\n- [ ] Beta task", "Test", "id");
  assert.equal(forward.extractedChecklists.length, 2);
  for (const item of forward.extractedChecklists) {
    assert.equal(item.itemId, m.stableItemId(item.labelHtml));
  }
  const reversed = m.compileChapter("- [ ] Beta task\n- [ ] Alpha task", "Test", "id");
  const alphaForward = forward.extractedChecklists.find((i) => i.labelHtml.includes("Alpha"));
  const alphaReversed = reversed.extractedChecklists.find((i) => i.labelHtml.includes("Alpha"));
  assert.ok(alphaForward && alphaReversed);
  assert.equal(alphaForward.itemId, alphaReversed.itemId);
  assert.notEqual(alphaForward.itemIndex, alphaReversed.itemIndex);
});

test("toggleChecklist validates item_id against published content", async (t) => {
  const m = await modules();
  const itemId = m.stableItemId("Do the thing");
  t.mock.method(m.readerRepository, "getActiveChapter", async () => ({ id: 1, isFreeSample: true }));
  t.mock.method(m.readerRepository, "getPublishedTranslations", async () => [{
    extractedChecklists: [{ itemId, labelHtml: "Do the thing", itemIndex: 0, isCompleted: false }],
  }]);
  t.mock.method(m.readerRepository, "saveProgress", async () => {});
  const user = { id: "u1", role: "reader" };
  const result = await m.readerService.toggleChecklist({ book_id: "book-1", chapter_slug: "ch-0", item_id: itemId, is_completed: true }, user);
  assert.equal(result.success, true);
  await assert.rejects(
    m.readerService.toggleChecklist({ book_id: "book-1", chapter_slug: "ch-0", item_id: "aaaa00000000", is_completed: true }, user),
    { status: 404 },
  );
});

test("resolveReader maps progress by itemId", async (t) => {
  const m = await modules();
  const itemId = m.stableItemId("Check inventory");
  t.mock.method(m.booksRepository, "getBook", async () => ({ id: "book-1", isActive: true, volumeCode: "VOL-1", accentHex: "#1D4ED8", titles: {}, subtitles: {}, priceSingleIdr: 59000, priceSingleUsd: "4.99", pdfKeys: null }));
  t.mock.method(m.i18nService, "getActiveLocales", async () => [{ code: "id", isDefault: true, name: "Indonesian", nativeName: "Bahasa Indonesia", flagEmoji: "🇮🇩", isLlmTranslated: false }]);
  t.mock.method(m.i18nService, "getDictionary", async () => ({}));
  t.mock.method(m.readerRepository, "getChapter", async () => ({ id: 1, chapterIndex: 0, slug: "ch-0", bookId: "book-1", isFreeSample: true, motifIcon: "compass", illustrationPath: null, remotionCompositionId: "C", remotionDurationFrames: 540, remotionFps: 30, isYoutubeEnabled: false, youtubeUnlistedId: null }));
  t.mock.method(m.entitlementsService, "canAccessBook", async () => true);
  t.mock.method(m.readerRepository, "getPublishedTranslations", async () => [{
    locale: "id", register: "standard", title: "Test", compiledHtml: "<p>OK</p>", safePreviewHtml: "<p>OK</p>",
    hasScripts: false, illustrationCaption: null, remotionSceneProps: {},
    extractedChecklists: [{ labelHtml: "Check inventory", itemIndex: 2, isCompleted: false }],
  }]);
  t.mock.method(m.readerRepository, "getProgress", async () => [{ itemId, isCompleted: true }]);
  t.mock.method(m.readerRepository, "listChapters", async () => []);
  t.mock.method(m.readerRepository, "getSidebarTranslations", async () => []);

  const result = await m.readerService.resolveReader("book-1", "id", "ch-0", "standard", { id: "u1", role: "reader" });
  assert.ok(!("error" in result));
  const item = result.currentChapter.checklists.find((c: { itemId: string }) => c.itemId === itemId);
  assert.ok(item);
  assert.equal(item.isCompleted, true);
});
