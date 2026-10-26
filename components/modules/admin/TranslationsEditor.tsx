import Link from "next/link";
import type { i18nService } from "@/lib/modules/i18n/i18n.service";
import { localeCodeSchema } from "@/lib/modules/i18n/i18n.schema";
import { AdminMutationForm } from "./AdminMutationForm";
import { saveTranslation, deleteTranslation } from "@/app/admin/translations/actions";

export function TranslationsEditor({
  params,
  data,
}: {
  params: { locale?: string; q?: string; group?: string; p?: string };
  data: Awaited<ReturnType<typeof i18nService.listForAdmin>>;
}) {
  const code = localeCodeSchema.safeParse(params.locale ?? "id");
  const locale = code.success ? code.data : "id";
  const query = (params.q ?? "").slice(0, 255).toLowerCase();
  const group = (params.group ?? "").slice(0, 64);
  const filtered = data.translations.filter(
    (row) =>
      (!group || row.group === group) &&
      (!query || row.key.toLowerCase().includes(query) || row.value.toLowerCase().includes(query))
  );
  const page = Math.max(1, Math.min(Math.ceil(filtered.length / 25) || 1, Number.parseInt(params.p ?? "1", 10) || 1));
  const pageHref = (p: number) =>
    `/admin/translations?${new URLSearchParams({ locale, q: query, group, p: String(p) })}`;

  return (
    <section className="space-y-6" aria-labelledby="ui-translations-title">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D5]">
        <div>
          <h1 id="ui-translations-title" className="text-xl sm:text-2xl font-black text-[#111113]">
            Terjemahan UI & Kamus Dinamis
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Override teks antarmuka, label landing page, dan daftar FAQ per bahasa tanpa redeploy.
          </p>
        </div>
        <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5E0D5] text-stone-700 self-start sm:self-auto">
          {filtered.length} keys (Hal. {page})
        </div>
      </div>

      {/* Filter Toolbar */}
      <form method="get" className="p-4 rounded-xl border border-[#E5E0D5] bg-[#FAF8F5]/60 flex flex-wrap items-end gap-3 text-xs">
        <div className="space-y-1">
          <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
            Bahasa
          </label>
          <select
            name="locale"
            defaultValue={locale}
            className="px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
          >
            {data.locales.map((row) => (
              <option key={row.code} value={row.code}>
                {row.flagEmoji} {row.label} ({row.code})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
            Grup Key
          </label>
          <select
            name="group"
            defaultValue={group}
            className="px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
          >
            <option value="">Semua Grup</option>
            {[...new Set(data.translations.map((row) => row.group))].sort().map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
            Cari Key atau Teks
          </label>
          <input
            name="q"
            maxLength={255}
            defaultValue={params.q}
            placeholder="misal: hero, buy_now, harga..."
            className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white text-xs focus:outline-none focus:border-[#1D4ED8]"
          />
        </div>

        <button
          className="px-4 py-2 rounded-lg font-bold text-xs bg-[#111113] text-[#FAF8F5] hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
          type="submit"
        >
          Terapkan Filter
        </button>
      </form>

      {/* Translations List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-[#E5E0D5] text-stone-500 font-mono text-xs">
          Belum ada terjemahan yang cocok. Tambahkan key baru di bawah atau jalankan seed database.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.slice((page - 1) * 25, page * 25).map((row) => (
            <article
              key={row.id}
              className="p-4 rounded-xl border border-[#E5E0D5] bg-[#FFFFFF] hover:border-stone-400 transition-colors space-y-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#E5E0D5] pb-2">
                <span className="font-mono font-bold text-[#111113] text-sm">{row.key}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-100 text-stone-600 uppercase">
                  {row.valueType}
                </span>
              </div>

              <AdminMutationForm action={saveTranslation} submitLabel="Simpan Perubahan">
                <input type="hidden" name="localeCode" value={locale} />
                <input type="hidden" name="key" value={row.key} />
                <input type="hidden" name="group" value={row.group} />
                <input type="hidden" name="valueType" value={row.valueType} />
                <textarea
                  name="value"
                  defaultValue={row.value}
                  maxLength={100000}
                  rows={row.valueType === "json" ? 6 : 2}
                  className="w-full p-2.5 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
                />
              </AdminMutationForm>

              <div className="flex justify-end pt-1">
                <AdminMutationForm action={deleteTranslation} submitLabel="Reset Override (Hapus)">
                  <input type="hidden" name="localeCode" value={locale} />
                  <input type="hidden" name="key" value={row.key} />
                </AdminMutationForm>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      <nav aria-label="Halaman terjemahan" className="flex items-center justify-between pt-2">
        <div>
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs text-stone-700 hover:bg-[#FAF8F5] transition-colors"
            >
              ← Halaman Sebelumnya
            </Link>
          ) : (
            <span className="text-stone-300 font-mono text-xs">← Halaman Sebelumnya</span>
          )}
        </div>

        <span className="text-xs font-mono text-stone-500">
          Hal. {page} dari {Math.ceil(filtered.length / 25) || 1}
        </span>

        <div>
          {page * 25 < filtered.length ? (
            <Link
              href={pageHref(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs text-stone-700 hover:bg-[#FAF8F5] transition-colors"
            >
              Halaman Berikutnya →
            </Link>
          ) : (
            <span className="text-stone-300 font-mono text-xs">Halaman Berikutnya →</span>
          )}
        </div>
      </nav>

      {/* Add New Key Form */}
      <div className="p-6 rounded-xl border border-[#E5E0D5] bg-[#FAF8F5]/50 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#111113]">Tambah Key Terjemahan Baru</h2>
          <p className="text-[11px] text-stone-500">
            Grup harus sesuai awalan key (contoh `landing.hero.title`). Pertahankan tag placeholder seperti `:name` atau `{"{name}"}`.
          </p>
        </div>

        <AdminMutationForm action={saveTranslation} submitLabel="Tambah Key Terjemahan" className="max-w-3xl space-y-3 text-xs">
          <input type="hidden" name="localeCode" value={locale} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Key Lengkap
              </label>
              <input
                name="key"
                required
                maxLength={255}
                placeholder="landing.hero.title"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Nama Grup
              </label>
              <input
                name="group"
                required
                maxLength={64}
                placeholder="landing"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Tipe Nilai
              </label>
              <select
                name="valueType"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="string">String (Teks)</option>
                <option value="json">JSON Array / Object</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
              Nilai Teks atau JSON
            </label>
            <textarea
              name="value"
              rows={4}
              maxLength={100000}
              className="w-full p-2.5 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>
        </AdminMutationForm>
      </div>
    </section>
  );
}
