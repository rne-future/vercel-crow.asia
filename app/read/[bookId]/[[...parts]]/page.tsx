import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { i18nService } from "@/lib/modules/i18n/i18n.service";
import { getRequestTranslations } from "@/lib/modules/i18n/request";
import { authService } from "@/lib/modules/auth/auth.service";
import { resolveReader } from "@/lib/modules/reader/reader.service";
import { TranslationProvider } from "@/components/TranslationProvider";
import { ChapterView } from "@/components/modules/reader/ChapterView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bookId: string; parts?: string[] }>;
}): Promise<Metadata> {
  const { bookId, parts } = await params;
  if (parts && parts.length > 2) notFound();
  const slug = parts?.[1] ?? "ch-0";
  return { title: `${slug} — ${bookId} — crow.asia` };
}

export default async function ReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string; parts?: string[] }>;
  searchParams?: Promise<{ reg?: string }>;
}) {
  const { bookId, parts } = await params;
  if (parts && parts.length > 2) notFound();
  const sp = (await searchParams) ?? {};
  const localeParam = parts?.[0] ?? (await getRequestTranslations()).locale;
  const slug = parts?.[1] ?? "ch-0";
  const user = await authService.sessionUser();
  const data = await resolveReader(bookId, localeParam, slug, sp.reg, user);
  if ("error" in data) notFound();

  const translations = await i18nService.getDictionary(data.locale);
  const me = await authService.getProfile(user?.id);

  return (
    <TranslationProvider locale={data.locale} translations={translations}>
      <ChapterView
        key={`${data.book.id}:${data.locale}:${data.activeRegister}:${data.currentChapter.slug}`}
        book={{
          id: data.book.id,
          volumeCode: data.book.volumeCode,
          accentHex: data.book.accentHex,
          title: data.book.title,
          subtitle: data.book.subtitle,
          priceSingleIdr: data.book.priceSingleIdr,
          priceSingleUsd: data.book.priceSingleUsd,
        }}
        locale={data.locale}
        activeRegister={data.activeRegister}
        supportedLocales={data.supportedLocales}
        currentChapter={{
          index: data.currentChapter.index,
          slug: data.currentChapter.slug,
          title: data.currentChapter.title,
          isFreeSample: data.currentChapter.isFreeSample,
          hasAccess: data.currentChapter.hasAccess,
          hasScripts: data.currentChapter.hasScripts,
          illustrationPath: data.currentChapter.illustrationPath,
          illustrationCaption: data.currentChapter.illustrationCaption,
          displayHtml: data.currentChapter.displayHtml,
          checklists: data.currentChapter.checklists,
          remotionConfig: {
            compositionId: data.currentChapter.remotionConfig.compositionId,
            width: 1280,
            height: 720,
            fps: data.currentChapter.remotionConfig.fps,
            durationInFrames: data.currentChapter.remotionConfig.durationInFrames,
            sceneProps: data.currentChapter.remotionConfig.sceneProps as Record<string, unknown> & {
              steps?: unknown[];
              teammateName?: string;
            },
          },
          optionalYoutube: {
            isEnabled: data.currentChapter.optionalYoutube.isEnabled,
            videoId: data.currentChapter.optionalYoutube.videoId,
          },
        }}
        allChapters={data.allChapters}
        user={me}
      />
    </TranslationProvider>
  );
}
