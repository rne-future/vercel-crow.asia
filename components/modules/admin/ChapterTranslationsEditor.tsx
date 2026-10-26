import type { readerService } from "@/lib/modules/reader/reader.service";
import { saveChapterTranslation } from "@/app/admin/translations/chapter-actions";

export default function ChapterTranslationsEditor({
  data,
}: {
  data: Awaited<ReturnType<typeof readerService.getChapterTranslationsForAdmin>>;
}) {
  const { rows, selectedId, selected } = data;

  return (
    <section className="space-y-6">
      {/* Selector */}
      <form method="get" className="p-4 rounded-xl border border-[#E5E0D5] bg-[#FAF8F5]/60 flex flex-wrap items-end gap-3 text-xs">
        <div className="flex-1 min-w-[280px] space-y-1">
          <label htmlFor="translation-id" className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
            Pilih Naskah Bab & Ragam Bahasa
          </label>
          <select
            id="translation-id"
            name="id"
            defaultValue={selectedId}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
          >
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.bookId} / {row.slug} · [{row.locale.toUpperCase()}-{row.register}] · {row.status}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg font-bold text-xs bg-[#111113] text-[#FAF8F5] hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
        >
          Buka Naskah
        </button>
      </form>

      {/* Editor */}
      {selected ? (
        <form key={`${selected.id}:${selected.updatedAt.toISOString()}`} action={saveChapterTranslation} className="space-y-4 text-xs">
          <input type="hidden" name="id" value={selected.id} />
          <input type="hidden" name="updated_at" value={selected.updatedAt.toISOString()} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Judul Bab
              </label>
              <input
                name="title"
                required
                maxLength={255}
                defaultValue={selected.title}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white text-xs font-bold text-[#111113] focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Status Publikasi
              </label>
              <select
                name="status"
                defaultValue={selected.translationStatus}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="REVIEW">REVIEW</option>
                <option value="PUBLISHED">PUBLISHED</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Manuskrip Markdown (Footnotes, callouts, checklist syntax didukung)
              </label>
              <span className="font-mono text-[10px] text-stone-400">
                {selected.rawMarkdown.length.toLocaleString()} karakter
              </span>
            </div>
            <textarea
              name="raw_markdown"
              required
              rows={24}
              defaultValue={selected.rawMarkdown}
              className="w-full p-3 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs text-stone-800 leading-relaxed focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg font-bold text-xs bg-[#111113] text-[#FAF8F5] hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
            >
              Simpan dan Kompilasi HTML
            </button>
          </div>
        </form>
      ) : (
        <div className="p-8 text-center rounded-xl border border-[#E5E0D5] text-stone-500 font-mono text-xs">
          Belum ada terjemahan. Jalankan seed manuskrip terlebih dahulu.
        </div>
      )}
    </section>
  );
}
