import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import type { Transaction } from "../lib/db/types";

async function modules() {
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://test:test@127.0.0.1:1/unit_test";
  try {
    const [service, reader, books, auth, i18n] = await Promise.all([
      import("../lib/modules/reader/reader.service"),
      import("../lib/modules/reader/reader.repository"),
      import("../lib/modules/books/books.repository"),
      import("../lib/modules/auth/auth.service"),
      import("../lib/modules/i18n/i18n.service"),
    ]);
    return { ...service, ...reader, ...books, ...auth, ...i18n };
  } finally {
    if (originalUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalUrl;
  }
}

function translationRow(updatedAt: Date) {
  return {
    id: 1, chapterId: 1, locale: "id", register: "standard",
    title: "Test Chapter", rawMarkdown: "# Test\n\nContent",
    compiledHtml: "<p>Content</p>", safePreviewHtml: "<p>Content</p>",
    hasScripts: false, extractedChecklists: [], remotionSceneProps: {},
    translationStatus: "PUBLISHED", compiledAt: new Date(), updatedAt,
    searchVector: null, embedding: null, illustrationCaption: null,
  };
}

async function editorFixture(t: TestContext) {
  const m = await modules();
  const baseDate = new Date("2026-10-01T00:00:00.000Z");
  let currentRow = translationRow(baseDate);
  const tx = {} as Transaction;

  t.mock.method(m.authService, "requireAdmin", async () => {});
  t.mock.method(m.readerRepository, "getChapterTranslation", async (_id: number, _tx?: Transaction, _lock?: boolean) => ({ ...currentRow }));
  t.mock.method(m.readerRepository, "getChapterById", async () => ({ id: 1, bookId: "book-1", chapterIndex: 0, slug: "ch-0", isFreeSample: true, motifIcon: "compass", illustrationPath: null, remotionCompositionId: "C", remotionDurationFrames: 540, remotionFps: 30, isYoutubeEnabled: false, youtubeUnlistedId: null, createdAt: null, updatedAt: null }));
  t.mock.method(m.readerRepository, "transaction", async (op: (tx: Transaction) => Promise<unknown>) => op(tx));
  const save = t.mock.method(m.readerRepository, "saveChapterTranslation", async (_id: number, _values: unknown, _tx: Transaction) => {
    currentRow = { ...currentRow, updatedAt: new Date() };
  });
  t.mock.method(m.i18nService, "getDictionary", async () => ({}));

  return { ...m, save, get currentRow() { return currentRow; }, set currentRow(v) { currentRow = v; }, baseDate };
}

test("stale editor revision is rejected with 409 without writing", async (t) => {
  const f = await editorFixture(t);
  await assert.rejects(
    f.readerService.saveChapterTranslation({
      id: 1, title: "Updated", rawMarkdown: "new content", status: "PUBLISHED",
      updatedAt: new Date("2026-09-30T00:00:00.000Z"),
    }),
    { status: 409 },
  );
  assert.equal(f.save.mock.callCount(), 0);
});

test("current revision saves successfully", async (t) => {
  const f = await editorFixture(t);
  await f.readerService.saveChapterTranslation({
    id: 1, title: "Updated", rawMarkdown: "new content", status: "PUBLISHED",
    updatedAt: f.baseDate,
  });
  assert.equal(f.save.mock.callCount(), 1);
});

test("concurrent editors — second save rejected", async (t) => {
  const f = await editorFixture(t);
  // First save with matching timestamp succeeds
  await f.readerService.saveChapterTranslation({
    id: 1, title: "Editor A", rawMarkdown: "content A", status: "PUBLISHED",
    updatedAt: f.baseDate,
  });
  assert.equal(f.save.mock.callCount(), 1);
  // Second save with the original (now stale) timestamp is rejected
  await assert.rejects(
    f.readerService.saveChapterTranslation({
      id: 1, title: "Editor B", rawMarkdown: "content B", status: "PUBLISHED",
      updatedAt: f.baseDate,
    }),
    { status: 409 },
  );
  assert.equal(f.save.mock.callCount(), 1);
});
