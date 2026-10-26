import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { readerRepository } from "./reader.repository";
import { entitlementsService } from "./entitlements.service";
import { authService, isAdminRole, type SessionUser } from "@/lib/modules/auth/auth.service";
import { booksRepository } from "@/lib/modules/books/books.repository";
import { i18nService } from "@/lib/modules/i18n/i18n.service";
import { bookTitle, bookSubtitle } from "@/lib/modules/i18n/format";
import { chapterSchema, resourceIdSchema } from "@/lib/modules/books/books.schema";
import { toggleSchema, searchSchema, chapterTranslationSchema } from "./reader.schema";
import { compileChapter, localizeCompiledHtml, localizeSceneLabels } from "./content/compiler";
import { ServiceError } from "@/lib/shared/errors";
import { signedPdfUrl, storageObjectPath } from "@/lib/integrations/storage";

export const readerService = {
  resolveReader,
  async toggleChecklist(input: unknown, user: SessionUser | null) {
    const parsed = toggleSchema.parse(input);
    const chapter = await readerRepository.getActiveChapter(parsed.book_id, parsed.chapter_slug);
    if (!chapter) throw new ServiceError(404, "Chapter not found");
    if (!chapter.isFreeSample && !await entitlementsService.canAccessBook(user, parsed.book_id)) throw new ServiceError(403, "Access denied");
    const translations = await readerRepository.getPublishedTranslations(chapter.id);
    if (!translations.some((row) => Array.isArray(row.extractedChecklists) && row.extractedChecklists.some((item, index) => (item.itemIndex ?? index) === parsed.item_index))) throw new ServiceError(404, "Checklist item not found");
    if (user) await readerRepository.saveProgress(user.id, parsed);
    return { success: true, is_completed: parsed.is_completed, authenticated: !!user };
  },
  async search(input: unknown, user: SessionUser | null) {
    const parsed = searchSchema.parse(input);
    if (parsed.q.length < 2) return [];
    const register = parsed.locale === "id" ? parsed.register ?? parsed.reg ?? "standard" : "standard";
    const owned = await entitlementsService.accessSet(user);
    const isStaff = isAdminRole(user?.role);
    const rows = await readerRepository.search(parsed.q, parsed.locale, register, [...owned], isStaff);
    return rows.map((row) => ({ ...row,
      chapter_index: Number(row.chapter_index),
      snippet: sanitizeHtml(row.snippet ?? "", { allowedTags: ["mark"], allowedAttributes: {} }),
      is_unlocked: row.is_free_sample || isStaff || owned.has(row.book_id),
      url: `/read/${row.book_id}/${parsed.locale}/${row.chapter_slug}${parsed.locale === "id" ? `?reg=${register}` : ""}`,
    }));
  },
  async getPdfUrl(bookId: string, user: SessionUser | null) {
    if (!user) throw new ServiceError(401, "Silakan login terlebih dahulu untuk mengunduh master PDF.");
    resourceIdSchema.parse(bookId);
    const book = await booksRepository.getBook(bookId);
    if (!book?.isActive) throw new ServiceError(404, "Not found");
    if (!await entitlementsService.canAccessBook(user, bookId)) throw new ServiceError(403, "Anda belum memiliki hak akses resmi untuk mengunduh PDF playbook ini.");
    const url = await signedPdfUrl(storageObjectPath(book.pdfKeys, bookId));
    if (!url) throw new ServiceError(503, "PDF belum tersedia.");
    return url;
  },
  async listChaptersForAdmin(bookId?: string) {
    await authService.requireAdmin();
    return readerRepository.listChapters(bookId ? resourceIdSchema.parse(bookId) : undefined);
  },
  async saveChapter(input: { bookId: unknown; slug: unknown; values: unknown }) {
    await authService.requireAdmin();
    const bookId = resourceIdSchema.parse(input.bookId);
    const slug = resourceIdSchema.parse(input.slug);
    await readerRepository.saveChapter(bookId, slug, chapterSchema.parse(input.values));
  },
  async getChapterTranslationsForAdmin(id?: string) {
    await authService.requireAdmin();
    const rows = await readerRepository.listChapterTranslations();
    const selectedId = id ? z.coerce.number().int().positive().parse(id) : rows[0]?.id;
    const selected = selectedId ? await readerRepository.getChapterTranslation(selectedId) : null;
    return { rows, selectedId, selected };
  },
  async saveChapterTranslation(input: unknown) {
    await authService.requireAdmin();
    const parsed = chapterTranslationSchema.parse(input);
    const translation = await readerRepository.getChapterTranslation(parsed.id);
    if (!translation) throw new ServiceError(404, "Translation not found");
    const dictionary = await i18nService.getDictionary(translation.locale);
    await readerRepository.transaction(async (tx) => {
      const row = await readerRepository.getChapterTranslation(parsed.id, tx, true);
      if (!row) throw new ServiceError(404, "Translation not found");
      const chapter = await readerRepository.getChapterById(row.chapterId, tx);
      if (!chapter) throw new ServiceError(404, "Chapter not found");
      const compiled = compileChapter(parsed.rawMarkdown, parsed.title, row.locale, row.register, chapter.bookId, chapter.chapterIndex, dictionary);
      await readerRepository.saveChapterTranslation(row.id, { ...compiled, title: parsed.title, rawMarkdown: parsed.rawMarkdown, translationStatus: parsed.status, compiledAt: new Date(), updatedAt: new Date() }, tx);
    });
  },
};

export { bookTitle, bookSubtitle } from "@/lib/modules/i18n/format";

export async function resolveReader(
  bookId: string,
  localeParam: string,
  slug: string,
  regParam: string | undefined,
  user: { id: string; role: string } | null,
) {
  if (!resourceIdSchema.safeParse(bookId).success || !resourceIdSchema.safeParse(slug).success) return { error: "not-found" as const };
  const book = await booksRepository.getBook(bookId);
  if (!book || !book.isActive) return { error: "not-found" as const };

  const locales = await i18nService.getActiveLocales();
  const activeCodes = locales.map((l) => l.code);
  const defaultCode = locales.find((row) => row.isDefault)?.code ?? "id";
  const locale = activeCodes.includes(localeParam) ? localeParam : defaultCode;
  const register = locale === "id" ? (regParam === "casual" ? "casual" : "standard") : "standard";

  const chapter = await readerRepository.getChapter(bookId, slug);
  if (!chapter) return { error: "not-found" as const };

  const bookAccess = await entitlementsService.canAccessBook(user, bookId);
  const hasAccess = chapter.isFreeSample || bookAccess;
  const dictionary = await i18nService.getDictionary(locale);

  const candidates = await readerRepository.getPublishedTranslations(chapter.id);
  const contentLocales = [...new Set([locale, defaultCode, "id", "en"])].filter((code) => activeCodes.includes(code));
  const translation = contentLocales.map((code) => candidates.find((row) => row.locale === code && row.register === (code === "id" ? register : "standard"))
    ?? candidates.find((row) => row.locale === code && row.register === "standard")
    ?? candidates.find((row) => row.locale === code)).find((row) => !!row);
  if (!translation) return { error: "not-found" as const };

  const sceneProps = (translation.remotionSceneProps ?? {}) as {
    steps?: unknown[];
    [k: string]: unknown;
  };
  const maskedSceneProps = hasAccess
    ? localizeSceneLabels(sceneProps, dictionary)
    : { bookId, chapterIndex: chapter.chapterIndex, chapterTitle: translation.title, locale, register,
      motifIcon: chapter.motifIcon, accentHex: book.accentHex, steps: [] };

  const progressMap: Record<number, boolean> = {};
  if (user) {
    const rows = await readerRepository.getProgress(user.id, bookId, slug);
    for (const r of rows) progressMap[r.itemIndex] = r.isCompleted;
  }
  const extracted = (translation.extractedChecklists ?? []) as Array<{
    itemIndex?: number;
    labelHtml?: string;
  }>;
  const checklists = (hasAccess ? extracted : []).map((item, i) => ({
    itemIndex: item.itemIndex ?? i,
    labelHtml: sanitizeHtml(item.labelHtml ?? ""),
    isCompleted: progressMap[item.itemIndex ?? i] ?? false,
  }));

  const allChapters = await readerRepository.listChapters(bookId);
  const sidebarTranslations = await readerRepository.getSidebarTranslations(allChapters.map((row) => row.id), contentLocales);
  const sidebar = [];
  for (const ch of allChapters) {
    const candidates = sidebarTranslations.filter((translation) => translation.chapterId === ch.id);
    const title = contentLocales.map((code) => candidates.find((row) => row.locale === code && row.register === (code === "id" ? register : "standard"))?.title
      ?? candidates.find((row) => row.locale === code)?.title).find((value) => !!value);
    if (!title) continue;
    sidebar.push({
      index: ch.chapterIndex,
      slug: ch.slug,
      title,
      isFreeSample: ch.isFreeSample,
      isUnlocked: ch.isFreeSample || bookAccess,
    });
  }

  return {
    book: {
      id: book.id,
      volumeCode: book.volumeCode,
      accentHex: book.accentHex,
      title: bookTitle(book.titles, locale, register),
      subtitle: bookSubtitle(book.subtitles, locale, register),
      priceSingleIdr: book.priceSingleIdr,
      priceSingleUsd: Number(book.priceSingleUsd),
    },
    locale,
    contentLocale: translation.locale,
    activeRegister: register,
    showRegisterSwitcher: locale === "id",
    supportedLocales: locales.map((l) => ({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      flagEmoji: l.flagEmoji,
      isLlmTranslated: l.isLlmTranslated,
    })),
    currentChapter: {
      index: chapter.chapterIndex,
      slug: chapter.slug,
      title: translation.title,
      isFreeSample: chapter.isFreeSample,
      hasAccess,
      hasScripts: translation.hasScripts,
      illustrationPath: chapter.illustrationPath,
      illustrationCaption: translation.illustrationCaption,
      displayHtml: localizeCompiledHtml(hasAccess ? translation.compiledHtml : translation.safePreviewHtml, dictionary),
      checklists,
      remotionConfig: {
        compositionId: chapter.remotionCompositionId,
        width: 1280,
        height: 720,
        fps: chapter.remotionFps,
        durationInFrames: chapter.remotionDurationFrames,
        sceneProps: maskedSceneProps,
      },
      optionalYoutube: {
        isEnabled: chapter.isYoutubeEnabled,
        videoId:
          hasAccess && chapter.isYoutubeEnabled ? chapter.youtubeUnlistedId : null,
      },
    },
    allChapters: sidebar,
  };
}
