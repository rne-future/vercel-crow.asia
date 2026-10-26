import Link from "next/link";
import { authService } from "@/lib/modules/auth/auth.service";
import { revalidatePath } from "next/cache";
import { readerService } from "@/lib/modules/reader/reader.service";
import { chapterSchema, resourceIdSchema } from "@/lib/modules/books/books.schema";

export default async function AdminChaptersPage({
  searchParams,
}: {
  searchParams?: Promise<{ book_id?: string; slug?: string }>;
}) {
  await authService.requireAdmin();
  const sp = (await searchParams) ?? {};
  const rows = await readerService.listChaptersForAdmin(sp.book_id);
  const selected = rows.find((row) => row.bookId === sp.book_id && row.slug === sp.slug);

  async function saveChapter(formData: FormData) {
    "use server";
    await authService.requireAdmin();
    const bookId = String(formData.get("book_id") ?? "");
    const slug = String(formData.get("slug") ?? "");
    if (!bookId || !slug) return;
    resourceIdSchema.parse(bookId);
    resourceIdSchema.parse(slug);
    const values = chapterSchema.parse({
      chapterIndex: Number(formData.get("chapter_index") ?? 0),
      isFreeSample: formData.get("is_free_sample") === "on",
      motifIcon: String(formData.get("motif_icon") || "compass"),
      illustrationPath: String(formData.get("illustration_path") ?? "") || null,
      remotionCompositionId: String(formData.get("remotion_composition_id") ?? "ChapterInteractiveStory16x9"),
      remotionDurationFrames: Number(formData.get("remotion_duration_frames") ?? 540),
      remotionFps: Number(formData.get("remotion_fps") ?? 30),
      isYoutubeEnabled: formData.get("is_youtube_enabled") === "on",
      youtubeUnlistedId: (String(formData.get("youtube_unlisted_id") ?? "") || null) as string | null,
    });
    await readerService.saveChapter({ bookId, slug, values });
    revalidatePath("/admin/chapters");
    revalidatePath("/read", "layout");
  }

  const BOOKS = [
    { label: "Semua", id: undefined },
    { label: "Vol 1 (book-1)", id: "book-1" },
    { label: "Vol 2 (book-2)", id: "book-2" },
    { label: "Vol 3 (book-3)", id: "book-3" },
  ];

  return (
    <main className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D5]">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111113]">Manajemen Bab (Chapters)</h1>
          <p className="text-xs text-stone-500 mt-1">
            Pengaturan metadata bab, free sample paywall, animasi Remotion, dan proteksi YouTube Shield.
          </p>
        </div>
        <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5E0D5] text-stone-700 self-start sm:self-auto">
          {rows.length} bab
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-xs font-mono font-semibold text-stone-400 mr-2 shrink-0">Buku:</span>
        {BOOKS.map((b) => {
          const isActive = (!sp.book_id && !b.id) || sp.book_id === b.id;
          const href = b.id ? `/admin/chapters?book_id=${b.id}` : "/admin/chapters";

          return (
            <Link
              key={b.label}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors shrink-0 ${
                isActive
                  ? "bg-[#111113] text-[#FAF8F5] shadow-2xs"
                  : "bg-[#FAF8F5] text-stone-600 hover:text-[#111113] border border-[#E5E0D5]"
              }`}
            >
              {b.label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E5E0D5] max-h-96">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#FAF8F5] border-b border-[#E5E0D5] text-stone-600 font-mono uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 font-bold">Buku</th>
              <th className="py-3 px-4 font-bold">Index</th>
              <th className="py-3 px-4 font-bold">Slug Bab</th>
              <th className="py-3 px-4 font-bold">Free Sample</th>
              <th className="py-3 px-4 font-bold">YouTube Shield</th>
              <th className="py-3 px-4 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E0D5]">
            {rows.map((c) => {
              const isSelected = selected?.id === c.id;

              return (
                <tr
                  key={c.id}
                  className={`transition-colors ${
                    isSelected ? "bg-blue-50/50" : "hover:bg-[#FAF8F5]/60"
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-semibold text-stone-700">{c.bookId}</td>
                  <td className="py-3 px-4 font-mono text-stone-500">{c.chapterIndex}</td>
                  <td className="py-3 px-4 font-mono font-bold text-[#111113]">{c.slug}</td>
                  <td className="py-3 px-4">
                    {c.isFreeSample ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Free
                      </span>
                    ) : (
                      <span className="text-stone-400 font-mono text-[11px]">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    {c.isYoutubeEnabled ? (
                      <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-mono">
                        {c.youtubeUnlistedId || "Aktif"}
                      </span>
                    ) : (
                      <span className="text-stone-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/chapters?book_id=${encodeURIComponent(c.bookId)}&slug=${encodeURIComponent(c.slug)}`}
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                        isSelected
                          ? "bg-[#111113] text-[#FAF8F5]"
                          : "border border-[#E5E0D5] bg-[#FFFFFF] text-stone-700 hover:bg-[#FAF8F5]"
                      }`}
                    >
                      {isSelected ? "Sedang Diedit" : "Pilih Edit"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Form Section */}
      <div className="p-6 rounded-xl border border-[#E5E0D5] bg-[#FAF8F5]/50 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
          <div>
            <h2 className="text-sm font-bold text-[#111113]">
              {selected ? `Edit Bab: ${selected.bookId} / ${selected.slug}` : "Pilih Bab untuk Mengedit"}
            </h2>
            <p className="text-[11px] text-stone-500">
              Pilih baris pada tabel di atas untuk memuat konfigurasi bab.
            </p>
          </div>
          {selected && (
            <Link
              href="/admin/chapters"
              className="text-xs font-mono text-stone-500 hover:text-[#111113] underline"
            >
              Batal Edit
            </Link>
          )}
        </div>

        <form key={selected?.id ?? "new"} action={saveChapter} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                ID Buku
              </label>
              <input
                aria-label="ID buku"
                name="book_id"
                required
                readOnly={!!selected}
                defaultValue={selected?.bookId ?? sp.book_id}
                placeholder="book-1"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8] read-only:bg-stone-100 read-only:text-stone-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Slug Bab
              </label>
              <input
                aria-label="Slug chapter"
                name="slug"
                required
                readOnly={!!selected}
                defaultValue={selected?.slug}
                placeholder="ch-0"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8] read-only:bg-stone-100 read-only:text-stone-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Urutan Index Bab
              </label>
              <input
                aria-label="Index chapter"
                name="chapter_index"
                required
                type="number"
                min={0}
                defaultValue={selected?.chapterIndex ?? 0}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Motif Icon (Lucide name)
              </label>
              <input
                aria-label="Motif icon"
                name="motif_icon"
                required
                defaultValue={selected?.motifIcon ?? "compass"}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Path File Ilustrasi
              </label>
              <input
                aria-label="Ilustrasi"
                name="illustration_path"
                defaultValue={selected?.illustrationPath ?? ""}
                placeholder="/illustrations/book-1/ch-0.svg"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Remotion Composition ID
              </label>
              <input
                aria-label="Remotion composition"
                name="remotion_composition_id"
                required
                defaultValue={selected?.remotionCompositionId ?? "ChapterInteractiveStory16x9"}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Durasi Video (Frames)
              </label>
              <input
                aria-label="Durasi dalam frame"
                name="remotion_duration_frames"
                type="number"
                required
                min={1}
                defaultValue={selected?.remotionDurationFrames ?? 540}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                FPS
              </label>
              <input
                aria-label="Frame per detik"
                name="remotion_fps"
                type="number"
                required
                min={1}
                max={120}
                defaultValue={selected?.remotionFps ?? 30}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E5E0D5]">
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                <input
                  type="checkbox"
                  name="is_free_sample"
                  defaultChecked={selected?.isFreeSample ?? false}
                  className="rounded border-stone-300 text-[#111113] focus:ring-[#1D4ED8]"
                />
                <span>Free Sample (dapat dibaca tanpa paywall)</span>
              </label>

              <div>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    name="is_youtube_enabled"
                    defaultChecked={selected?.isYoutubeEnabled ?? false}
                    className="rounded border-stone-300 text-[#111113] focus:ring-[#1D4ED8]"
                  />
                  <span>Aktifkan YouTube Shield Player</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                YouTube Unlisted ID
              </label>
              <input
                aria-label="YouTube ID"
                name="youtube_unlisted_id"
                defaultValue={selected?.youtubeUnlistedId ?? ""}
                placeholder="dQw4w9WgXcQ"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-5 py-2 rounded-lg font-bold text-xs bg-[#111113] text-[#FAF8F5] hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
            >
              Simpan Konfigurasi Bab
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
