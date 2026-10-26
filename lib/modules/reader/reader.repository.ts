import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { books, chapters, chapterTranslations, checklistProgress } from "@/lib/db/schema";
import { uuidv7 } from "@/lib/db/uuid";
import type { Transaction } from "@/lib/db/types";

export interface SearchRow extends Record<string, unknown> {
  book_id: string; volume_code: string; accent_hex: string; chapter_index: number;
  chapter_slug: string; chapter_title: string; is_free_sample: boolean; rank: string | null; snippet: string | null;
}

export const readerRepository = {
  transaction: <T>(operation: (tx: Transaction) => Promise<T>) => db.transaction(operation),
  async getChapter(bookId: string, slug: string) {
    return (await db.select().from(chapters).where(and(eq(chapters.bookId, bookId), eq(chapters.slug, slug))).limit(1))[0] ?? null;
  },
  async getActiveChapter(bookId: string, slug: string) {
    const [row] = await db.select({ chapter: chapters }).from(chapters).innerJoin(books, eq(books.id, chapters.bookId))
      .where(and(eq(chapters.bookId, bookId), eq(chapters.slug, slug), eq(books.isActive, true))).limit(1);
    return row?.chapter ?? null;
  },
  listChapters: (bookId?: string) => db.select().from(chapters).where(bookId ? eq(chapters.bookId, bookId) : undefined).orderBy(chapters.chapterIndex).limit(1000),
  getPublishedTranslations: (chapterId: number) => db.select().from(chapterTranslations).where(and(eq(chapterTranslations.chapterId, chapterId), eq(chapterTranslations.translationStatus, "PUBLISHED"))),
  getProgress: (userId: string, bookId?: string, slug?: string) => db.select().from(checklistProgress).where(and(
    eq(checklistProgress.userId, userId), bookId ? eq(checklistProgress.bookId, bookId) : undefined, slug ? eq(checklistProgress.chapterSlug, slug) : undefined,
  )),
  async getSidebarTranslations(chapterIds: number[], locales: string[]) {
    return chapterIds.length && locales.length ? db.select({ chapterId: chapterTranslations.chapterId, title: chapterTranslations.title, locale: chapterTranslations.locale, register: chapterTranslations.register })
      .from(chapterTranslations).where(and(inArray(chapterTranslations.chapterId, chapterIds), inArray(chapterTranslations.locale, locales), eq(chapterTranslations.translationStatus, "PUBLISHED"))) : [];
  },
  async saveProgress(userId: string, input: { book_id: string; chapter_slug: string; item_id: string; is_completed: boolean }) {
    await db.insert(checklistProgress).values({ id: uuidv7(), userId, bookId: input.book_id, chapterSlug: input.chapter_slug,
      itemId: input.item_id, isCompleted: input.is_completed, updatedAt: new Date() })
      .onConflictDoUpdate({ target: [checklistProgress.userId, checklistProgress.bookId, checklistProgress.chapterSlug, checklistProgress.itemId], set: { isCompleted: input.is_completed, updatedAt: new Date() } });
  },
  async saveChapter(bookId: string, slug: string, values: Omit<typeof chapters.$inferInsert, "bookId" | "slug" | "id">) {
    await db.insert(chapters).values({ bookId, slug, ...values }).onConflictDoUpdate({ target: [chapters.bookId, chapters.slug], set: { ...values, updatedAt: new Date() } });
  },
  listChapterTranslations: () => db.select({ id: chapterTranslations.id, bookId: chapters.bookId, slug: chapters.slug, title: chapterTranslations.title, locale: chapterTranslations.locale, register: chapterTranslations.register, status: chapterTranslations.translationStatus })
    .from(chapterTranslations).innerJoin(chapters, eq(chapters.id, chapterTranslations.chapterId)).orderBy(chapters.bookId, chapters.chapterIndex, chapterTranslations.locale, chapterTranslations.register),
  async getChapterTranslation(id: number, tx?: Transaction, lock = false) {
    const query = (tx ?? db).select().from(chapterTranslations).where(eq(chapterTranslations.id, id)).limit(1);
    return (await (lock ? query.for("update") : query))[0] ?? null;
  },
  async getChapterById(id: number, tx: Transaction) { return (await tx.select().from(chapters).where(eq(chapters.id, id)).limit(1))[0] ?? null; },
  async saveChapterTranslation(id: number, values: Partial<typeof chapterTranslations.$inferInsert>, tx: Transaction) {
    await tx.update(chapterTranslations).set({ ...values, searchVector: sql`setweight(to_tsvector('simple', ${values.title ?? ""}), 'A') || setweight(to_tsvector('simple', ${values.rawMarkdown ?? ""}), 'B')` }).where(eq(chapterTranslations.id, id));
  },
  async search(q: string, locale: string, register: string, ownedBooks: string[], isStaff: boolean) {
    const wildcard = `%${q.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const allowed = ownedBooks.length ? sql`c.book_id IN (${sql.join(ownedBooks.map((id) => sql`${id}`), sql`, `)})` : sql`false`;
    return db.execute<SearchRow>(sql`
      SELECT c.book_id, b.volume_code, b.accent_hex, c.chapter_index, c.slug AS chapter_slug,
        ct.title AS chapter_title, c.is_free_sample,
        round(ts_rank_cd(ct.search_vector, websearch_to_tsquery('simple', ${q}))::numeric, 4) AS rank,
        CASE WHEN c.is_free_sample OR ${isStaff} OR ${allowed}
          THEN ts_headline('simple', ct.raw_markdown, websearch_to_tsquery('simple', ${q}), 'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, ShortWord=3, HighlightAll=FALSE, MaxFragments=1')
          ELSE '' END AS snippet
      FROM chapter_translations ct JOIN chapters c ON c.id = ct.chapter_id JOIN books b ON b.id = c.book_id
      WHERE ct.translation_status = 'PUBLISHED' AND b.is_active = true
        AND EXISTS (SELECT 1 FROM supported_locales sl WHERE sl.code = ct.locale AND sl.is_active = true)
        AND ct.locale = ${locale} AND ct.register = ${register}
        AND (ct.search_vector @@ websearch_to_tsquery('simple', ${q}) OR ct.title ILIKE ${wildcard})
      ORDER BY rank DESC, c.chapter_index ASC LIMIT 8
    `);
  },
};
