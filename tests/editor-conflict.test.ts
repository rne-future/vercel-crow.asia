import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import type { Transaction } from "../lib/db/types";

async function editorFixture(t: TestContext) {
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/unit_test";
  const m = await Promise.all([
    import("../lib/modules/reader/reader.service"),
    import("../lib/modules/reader/reader.repository"),
    import("../lib/modules/auth/auth.service"),
    import("../lib/modules/i18n/i18n.service"),
  ]).finally(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalUrl;
  });
  const [{ readerService }, { readerRepository }, { authService }, { i18nService }] = m;
  const baseDate = new Date("2099-10-01T00:00:00.000Z");
  let currentRow = { id: 1, chapterId: 1, locale: "id", register: "standard", updatedAt: baseDate };
  const tx = {} as Transaction;
  let queue = Promise.resolve();
  t.mock.method(authService, "requireAdmin", async () => {});
  t.mock.method(readerRepository, "getChapterTranslation", async (_id: number, connection?: Transaction, lock?: boolean) => {
    if (connection) { assert.equal(connection, tx); assert.equal(lock, true); }
    return { ...currentRow };
  });
  t.mock.method(readerRepository, "getChapterById", async () => ({ bookId: "book-1", chapterIndex: 0 }));
  t.mock.method(readerRepository, "transaction", async (op: (tx: Transaction) => Promise<unknown>) => {
    const previous = queue;
    const released = Promise.withResolvers<void>();
    queue = released.promise;
    await previous;
    try { return await op(tx); } finally { released.resolve(); }
  });
  const save = t.mock.method(readerRepository, "saveChapterTranslation", async (_id: number, values: { updatedAt: Date }, connection: Transaction) => {
    assert.equal(connection, tx);
    currentRow = { ...currentRow, updatedAt: values.updatedAt };
  });
  t.mock.method(i18nService, "getDictionary", async () => ({}));
  const input = { id: 1, title: "Updated", rawMarkdown: "new content", status: "PUBLISHED", updatedAt: baseDate.toISOString() };
  return { readerService, save, input, baseDate };
}

test("stale editor revision is rejected with 409 without writing", async (t) => {
  const f = await editorFixture(t);
  await assert.rejects(f.readerService.saveChapterTranslation({ ...f.input, updatedAt: "2026-09-30T00:00:00.000Z" }), { status: 409 });
  assert.equal(f.save.mock.callCount(), 0);
});

test("current revision saves and advances its token even when the clock is behind", async (t) => {
  const f = await editorFixture(t);
  await f.readerService.saveChapterTranslation(f.input);
  assert.equal(f.save.mock.callCount(), 1);
  const saved = f.save.mock.calls[0].arguments[1];
  assert.ok(saved?.updatedAt);
  assert.ok(saved.updatedAt.getTime() > f.baseDate.getTime());
});

test("simultaneous editors sharing a baseline cannot both save", async (t) => {
  const f = await editorFixture(t);
  const results = await Promise.allSettled([
    f.readerService.saveChapterTranslation(f.input),
    f.readerService.saveChapterTranslation({ ...f.input, title: "Editor B" }),
  ]);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[1].status, "rejected");
  if (results[1].status === "rejected") assert.equal(results[1].reason.status, 409);
  assert.equal(f.save.mock.callCount(), 1);
});
