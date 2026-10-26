import { authService } from "@/lib/modules/auth/auth.service";
import { TranslationsEditor } from "@/components/modules/admin/TranslationsEditor";
import ChapterTranslationsEditor from "@/components/modules/admin/ChapterTranslationsEditor";
import { i18nService } from "@/lib/modules/i18n/i18n.service";
import { readerService } from "@/lib/modules/reader/reader.service";
import { localeCodeSchema } from "@/lib/modules/i18n/i18n.schema";
import { notFound } from "next/navigation";

export default async function TranslationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string; locale?: string; q?: string; group?: string; p?: string }>;
}) {
  await authService.requireAdmin();
  const params = (await searchParams) ?? {};
  const code = localeCodeSchema.safeParse(params.locale ?? "id");
  const [data, chapters] = await Promise.all([
    i18nService.listForAdmin(code.success ? code.data : "id"),
    readerService.getChapterTranslationsForAdmin(params.id),
  ]);
  if (params.id && !chapters.selected) notFound();

  return (
    <main className="space-y-10 text-[#111113]">
      <TranslationsEditor params={params} data={data} />
      <details open={!!params.id} className="border-t border-[#E5E0D5] pt-6 group">
        <summary className="cursor-pointer py-3 text-base font-bold text-[#111113] hover:text-[#1D4ED8] transition-colors flex items-center justify-between">
          <span>Editor Manuskrip Bab (Markdown & Pre-compiled HTML)</span>
          <span className="text-xs font-mono text-stone-400 group-open:rotate-90 transition-transform">
            ▶
          </span>
        </summary>
        <div className="pt-4">
          <ChapterTranslationsEditor data={chapters} />
        </div>
      </details>
    </main>
  );
}
