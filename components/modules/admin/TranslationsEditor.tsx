import Link from "next/link";
import type { i18nService } from "@/lib/modules/i18n/i18n.service";
import { localeCodeSchema } from "@/lib/modules/i18n/i18n.schema";
import { AdminMutationForm } from "./AdminMutationForm";
import { saveTranslation, deleteTranslation } from "@/app/admin/translations/actions";

export function TranslationsEditor({ params, data }: { params: { locale?: string; q?: string; group?: string; p?: string }; data: Awaited<ReturnType<typeof i18nService.listForAdmin>> }) {
  const code = localeCodeSchema.safeParse(params.locale ?? "id");
  const locale = code.success ? code.data : "id";
  const query = (params.q ?? "").slice(0, 255).toLowerCase();
  const group = (params.group ?? "").slice(0, 64);
  const filtered = data.translations.filter((row) => (!group || row.group === group) && (!query || row.key.toLowerCase().includes(query) || row.value.toLowerCase().includes(query)));
  const page = Math.max(1, Math.min(Math.ceil(filtered.length / 25) || 1, Number.parseInt(params.p ?? "1", 10) || 1));
  const pageHref = (p: number) => `/admin/translations?${new URLSearchParams({ locale, q: query, group, p: String(p) })}`;
  return <section className="space-y-6" aria-labelledby="ui-translations-title">
    <h1 id="ui-translations-title" className="text-2xl font-bold">Terjemahan antarmuka</h1>
    <form method="get" className="flex flex-wrap items-end gap-3">
      <label>Bahasa<select name="locale" defaultValue={locale} className="block min-h-11 border border-stone-500 p-2">{data.locales.map((row) => <option key={row.code} value={row.code}>{row.label} ({row.code})</option>)}</select></label>
      <label>Grup<select name="group" defaultValue={group} className="block min-h-11 border border-stone-500 p-2"><option value="">Semua grup</option>{[...new Set(data.translations.map((row) => row.group))].sort().map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Cari key atau nilai<input name="q" maxLength={255} defaultValue={params.q} className="block min-h-11 border border-stone-500 p-2" /></label>
      <button className="min-h-11 rounded border border-stone-500 px-4 py-2" type="submit">Cari terjemahan</button>
    </form>
    <p role="status">{filtered.length} terjemahan · halaman {page}</p>
    {filtered.length === 0 && <p>Belum ada terjemahan yang cocok. Tambahkan key di bawah atau jalankan seed baseline.</p>}
    {filtered.slice((page - 1) * 25, page * 25).map((row) => <article key={row.id} className="space-y-3 border-b border-stone-300 pb-5">
      <AdminMutationForm action={saveTranslation} submitLabel="Simpan terjemahan">
        <input type="hidden" name="localeCode" value={locale} /><input type="hidden" name="key" value={row.key} />
        <input type="hidden" name="group" value={row.group} /><input type="hidden" name="valueType" value={row.valueType} />
        <label className="break-words font-semibold">{row.key} <span className="font-normal text-stone-600">({row.valueType})</span>
          <textarea name="value" defaultValue={row.value} maxLength={100000} rows={row.valueType === "json" ? 8 : 2} className="mt-2 block w-full border border-stone-500 p-2 font-normal" />
        </label>
      </AdminMutationForm>
      <AdminMutationForm action={deleteTranslation} submitLabel="Hapus override; gunakan fallback">
        <input type="hidden" name="localeCode" value={locale} /><input type="hidden" name="key" value={row.key} />
      </AdminMutationForm>
    </article>)}
    <nav aria-label="Halaman terjemahan" className="flex gap-4">{page > 1 && <Link href={pageHref(page - 1)} className="p-2 underline">Sebelumnya</Link>}{page * 25 < filtered.length && <Link href={pageHref(page + 1)} className="p-2 underline">Berikutnya</Link>}</nav>
    <h2 className="text-xl font-bold">Tambah key</h2>
    <p className="text-sm">Grup harus sama dengan bagian pertama key, misalnya landing.hero.title. Pertahankan placeholder seperti :name atau &#123;name&#125;. Tipe JSON digunakan untuk daftar FAQ, carousel, dan tabel.</p>
    <AdminMutationForm action={saveTranslation} submitLabel="Tambah terjemahan" className="max-w-3xl">
      <input type="hidden" name="localeCode" value={locale} />
      <label>Key<input name="key" required maxLength={255} placeholder="landing.hero.title" className="block w-full border border-stone-500 p-2" /></label>
      <label>Grup<input name="group" required maxLength={64} placeholder="landing" className="block w-full border border-stone-500 p-2" /></label>
      <label>Tipe nilai<select name="valueType" className="block min-h-11 border border-stone-500 p-2"><option value="string">Teks</option><option value="json">Daftar JSON</option></select></label>
      <label>Nilai<textarea name="value" rows={4} maxLength={100000} className="block w-full border border-stone-500 p-2" /></label>
    </AdminMutationForm>
  </section>;
}
