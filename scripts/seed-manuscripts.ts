import "./load-env";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  books,
  chapters,
  chapterTranslations,
  pricingTiers,
  supportedLocales,
  locales,
} from "../lib/db/schema";
import { compileChapter } from "../lib/modules/reader/content/compiler";
import { parseManuscript } from "../lib/modules/reader/content/parser";
import {
  BOOKS,
  MANUSCRIPTS,
  PRICING_TIERS,
  SUPPORTED_LOCALES,
  resolveMotifIcon,
} from "../lib/content/seed-data";

const SOURCE_DIR = resolve(
  process.cwd(),
  process.env.MANUSCRIPT_SOURCE_DIR ?? "../crow.asia",
);

async function seedStatic() {
  for (const l of SUPPORTED_LOCALES) {
    await db
      .insert(supportedLocales)
      .values({ ...l })
      .onConflictDoNothing({ target: supportedLocales.code });
    await db.insert(locales).values({ code: l.code, label: l.nativeName, isActive: l.isActive }).onConflictDoNothing({ target: locales.code });
  }
  for (const b of BOOKS) {
    await db
      .insert(books)
      .values({ ...b })
      .onConflictDoUpdate({ target: books.id, set: { ...b } });
  }
  for (const t of PRICING_TIERS) {
    await db
      .insert(pricingTiers)
      .values({ ...t })
      .onConflictDoUpdate({ target: pricingTiers.id, set: { ...t } });
  }
}

async function findOrCreateChapter(bookId: string, slug: string, index: number) {
  const existing = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(sql`${chapters.bookId} = ${bookId} AND ${chapters.slug} = ${slug}`)
    .limit(1);
  if (existing.length > 0) return Number(existing[0].id);

  const inserted = await db
    .insert(chapters)
    .values({
      bookId,
      slug,
      chapterIndex: index,
      isFreeSample: index <= 1,
      motifIcon: resolveMotifIcon(index),
      remotionCompositionId: "ChapterInteractiveStory16x9",
      remotionDurationFrames: 540,
      remotionFps: 30,
      isYoutubeEnabled: false,
    })
    .onConflictDoNothing()
    .returning({ id: chapters.id });
  if (inserted.length > 0) return Number(inserted[0].id);

  const retry = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(sql`${chapters.bookId} = ${bookId} AND ${chapters.slug} = ${slug}`)
    .limit(1);
  return Number(retry[0].id);
}

async function main() {
  const missing = MANUSCRIPTS.filter((item) => !existsSync(resolve(SOURCE_DIR, item.path)));
  if (missing.length) throw new Error(`Missing manuscripts: ${missing.map((item) => item.path).join(", ")}`);
  console.log(`Source dir: ${SOURCE_DIR}`);
  await seedStatic();
  console.log("Static seed OK: locales/books/tiers");

  let total = 0;
  for (const item of MANUSCRIPTS) {
    const fullPath = resolve(SOURCE_DIR, item.path);
    const content = readFileSync(fullPath, "utf8");
    const parsed = parseManuscript(content);
    console.log(`Processing ${item.path} (${parsed.length} chapters)...`);

    for (const c of parsed) {
      const chapterId = await findOrCreateChapter(item.bookId, c.slug, c.index);
      const illustration = ["webp", "svg"].map((extension) => `/illustrations/${item.bookId}/${c.slug}.${extension}`)
        .find((path) => existsSync(resolve(process.cwd(), `public${path}`)));
      if (illustration) await db.update(chapters).set({ illustrationPath: illustration }).where(eq(chapters.id, chapterId));
      const compiled = compileChapter(
        c.rawMarkdown,
        c.title,
        item.locale,
        item.register,
        item.bookId,
        c.index,
      );

      const upserted = await db
        .insert(chapterTranslations)
        .values({
          chapterId,
          locale: item.locale,
          register: item.register,
          title: c.title,
          rawMarkdown: c.rawMarkdown,
          compiledHtml: compiled.compiledHtml,
          safePreviewHtml: compiled.safePreviewHtml,
          hasScripts: compiled.hasScripts,
          extractedChecklists: compiled.extractedChecklists,
          remotionSceneProps: compiled.remotionSceneProps,
          translationStatus: "PUBLISHED",
          compiledAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            chapterTranslations.chapterId,
            chapterTranslations.locale,
            chapterTranslations.register,
          ],
          set: {
            title: c.title,
            rawMarkdown: c.rawMarkdown,
            compiledHtml: compiled.compiledHtml,
            safePreviewHtml: compiled.safePreviewHtml,
            hasScripts: compiled.hasScripts,
            extractedChecklists: compiled.extractedChecklists,
            remotionSceneProps: compiled.remotionSceneProps,
            translationStatus: "PUBLISHED",
            compiledAt: new Date(),
            updatedAt: new Date(),
          },
        })
        .returning({ id: chapterTranslations.id });

      const translationId = Number(upserted[0].id);
      await db.execute(sql`
        UPDATE chapter_translations
        SET search_vector = setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
                            setweight(to_tsvector('simple', coalesce(raw_markdown, '')), 'B')
        WHERE id = ${translationId}
      `);
      total++;
    }
  }

  const [{ count }] = await db.execute<{ count: number }>(
    sql`SELECT count(*)::int AS count FROM chapter_translations`,
  );
  console.log(`✓ Ingestion complete! Total processed: ${total}, translations in DB: ${count}`);
  if (count === 0) process.exit(1);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("Seed FAILED:", err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
