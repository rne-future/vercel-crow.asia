import type { readerService } from "@/lib/modules/reader/reader.service";
import { saveChapterTranslation } from "@/app/admin/translations/chapter-actions";

export default function ChapterTranslationsEditor({ data }: { data: Awaited<ReturnType<typeof readerService.getChapterTranslationsForAdmin>> }) {
  const { rows, selectedId, selected } = data;

  return <section className="space-y-6">
    <h1>Chapter translations</h1>
    <form method="get" className="flex flex-wrap gap-2">
      <label htmlFor="translation-id">Terjemahan</label>
      <select id="translation-id" name="id" defaultValue={selectedId} className="max-w-full">
        {rows.map((row) => <option key={row.id} value={row.id}>{row.bookId}/{row.slug} · {row.locale}/{row.register} · {row.status}</option>)}
      </select>
      <button type="submit">Buka</button>
    </form>
    {selected ? <form key={selected.id} action={saveChapterTranslation} className="grid gap-3 max-w-4xl">
      <input type="hidden" name="id" value={selected.id} />
      <label>Judul<input name="title" required maxLength={255} defaultValue={selected.title} className="block w-full border p-2" /></label>
      <label>Status<select name="status" defaultValue={selected.translationStatus} className="block border p-2"><option>DRAFT</option><option>REVIEW</option><option>PUBLISHED</option></select></label>
      <label>Manuskrip Markdown<textarea name="raw_markdown" required rows={24} defaultValue={selected.rawMarkdown} className="block w-full border p-2 font-mono text-sm" /></label>
      <button type="submit" className="border p-2">Simpan dan kompilasi</button>
    </form> : <p>Belum ada terjemahan. Jalankan seed manuskrip terlebih dahulu.</p>}
  </section>;
}
