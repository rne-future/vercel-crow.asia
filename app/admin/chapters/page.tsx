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

  return (
    <main>
      <h1>Chapters</h1>
      <p>
        Filter: <a href="/admin/chapters">semua</a> · <a href="/admin/chapters?book_id=book-1">book-1</a> ·{" "}
        <a href="/admin/chapters?book_id=book-2">book-2</a> · <a href="/admin/chapters?book_id=book-3">book-3</a>
      </p>
      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>Buku</th>
            <th>Index</th>
            <th>Slug</th>
            <th>Free</th>
            <th>YouTube</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.bookId}</td>
              <td>{c.chapterIndex}</td>
              <td><a href={`/admin/chapters?book_id=${encodeURIComponent(c.bookId)}&slug=${encodeURIComponent(c.slug)}`}>{c.slug}</a></td>
              <td>{c.isFreeSample ? "ya" : "-"}</td>
              <td>{c.isYoutubeEnabled ? c.youtubeUnlistedId ?? "on" : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Tambah / ubah chapter</h2>
      <p>Pilih slug di tabel untuk memuat data chapter.</p>
      <form key={selected?.id ?? "new"} action={saveChapter} style={{ display: "grid", gap: 8, maxWidth: 480 }}>
        <input aria-label="ID buku" name="book_id" required readOnly={!!selected} defaultValue={selected?.bookId ?? sp.book_id} placeholder="book-1" />
        <input aria-label="Slug chapter" name="slug" required readOnly={!!selected} defaultValue={selected?.slug} placeholder="ch-0" />
        <input aria-label="Index chapter" name="chapter_index" required type="number" min={0} defaultValue={selected?.chapterIndex ?? 0} />
        <input aria-label="Motif icon" name="motif_icon" required defaultValue={selected?.motifIcon ?? "compass"} />
        <input aria-label="Ilustrasi" name="illustration_path" defaultValue={selected?.illustrationPath ?? ""} placeholder="/illustrations/..." />
        <input aria-label="Remotion composition" name="remotion_composition_id" required defaultValue={selected?.remotionCompositionId ?? "ChapterInteractiveStory16x9"} />
        <input aria-label="Durasi dalam frame" name="remotion_duration_frames" type="number" required min={1} defaultValue={selected?.remotionDurationFrames ?? 540} />
        <input aria-label="Frame per detik" name="remotion_fps" type="number" required min={1} max={120} defaultValue={selected?.remotionFps ?? 30} />
        <label>
          <input type="checkbox" name="is_free_sample" defaultChecked={selected?.isFreeSample ?? false} /> free sample
        </label>
        <label>
          <input type="checkbox" name="is_youtube_enabled" defaultChecked={selected?.isYoutubeEnabled ?? false} /> youtube enabled
        </label>
        <input aria-label="YouTube ID" name="youtube_unlisted_id" defaultValue={selected?.youtubeUnlistedId ?? ""} placeholder="youtube id (bila enabled)" />
        <button type="submit">Simpan</button>
      </form>
    </main>
  );
}
