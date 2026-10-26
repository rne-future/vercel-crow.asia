import { authService } from "@/lib/modules/auth/auth.service";
import { i18nService } from "@/lib/modules/i18n/i18n.service";
import { AdminMutationForm } from "@/components/modules/admin/AdminMutationForm";
import { saveLocale, setLocaleActive } from "./actions";

export default async function AdminLocalesPage() {
  await authService.requireAdmin();
  const { locales } = await i18nService.listForAdmin("id");

  return (
    <main className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D5]">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111113]">Bahasa Antarmuka (Locales)</h1>
          <p className="text-xs text-stone-500 mt-1">
            Bahasa aktif muncul di menu publik. Jika terjemahan belum lengkap, kamus default akan digunakan.
          </p>
        </div>
        <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5E0D5] text-stone-700 self-start sm:self-auto">
          {locales.length} bahasa
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E5E0D5]">
        <table className="w-full text-left text-xs border-collapse">
          <caption className="sr-only">Bahasa yang tersedia</caption>
          <thead>
            <tr className="bg-[#FAF8F5] border-b border-[#E5E0D5] text-stone-600 font-mono uppercase tracking-wider text-[11px]">
              <th scope="col" className="py-3 px-4 font-bold">Kode</th>
              <th scope="col" className="py-3 px-4 font-bold">Nama / Label</th>
              <th scope="col" className="py-3 px-4 font-bold">Status</th>
              <th scope="col" className="py-3 px-4 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E0D5]">
            {locales.map((locale) => (
              <tr key={locale.code} className="hover:bg-[#FAF8F5]/60 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-[#111113]">{locale.code}</td>
                <td className="py-3 px-4">
                  <span className="font-semibold text-stone-800">
                    {locale.flagEmoji} {locale.label}
                  </span>
                  <span className="text-stone-400 font-mono text-[11px] ml-1.5">({locale.name})</span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      locale.isDefault
                        ? "bg-purple-50 text-purple-800 border border-purple-200"
                        : locale.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-stone-100 text-stone-500 border border-stone-200"
                    }`}
                  >
                    {locale.isDefault ? "Default · Aktif" : locale.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {!locale.isDefault && (
                    <AdminMutationForm
                      action={setLocaleActive}
                      submitLabel={locale.isActive ? "Nonaktifkan" : "Aktifkan"}
                    >
                      <input type="hidden" name="code" value={locale.code} />
                      <input type="hidden" name="isActive" value={String(!locale.isActive)} />
                    </AdminMutationForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Section */}
      <div className="p-6 rounded-xl border border-[#E5E0D5] bg-[#FAF8F5]/50 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#111113]">Tambah atau Ubah Bahasa</h2>
          <p className="text-[11px] text-stone-500">
            Gunakan kode bahasa yang sama (misal `id`, `en`, `ms`) untuk memperbarui label atau memilih default baru.
          </p>
        </div>

        <AdminMutationForm action={saveLocale} submitLabel="Simpan Konfigurasi Bahasa" className="max-w-2xl space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Kode Bahasa (ISO)
              </label>
              <input
                name="code"
                required
                maxLength={16}
                placeholder="ms"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Penanda Bendera / Ikon
              </label>
              <input
                name="flagEmoji"
                maxLength={16}
                defaultValue="🌐"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Nama Asli / Label Lokal
              </label>
              <input
                name="label"
                required
                maxLength={64}
                placeholder="Bahasa Melayu"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Nama Internasional (English)
              </label>
              <input
                name="name"
                required
                maxLength={64}
                placeholder="Malay"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-stone-700">
              <input
                type="checkbox"
                name="hasDualRegister"
                className="rounded border-stone-300 text-[#111113] focus:ring-[#1D4ED8]"
              />
              <span>Memiliki pilihan ragam bahasa (casual/formal)</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-stone-700">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked
                className="rounded border-stone-300 text-[#111113] focus:ring-[#1D4ED8]"
              />
              <span>Aktif</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-stone-700">
              <input
                type="checkbox"
                name="isDefault"
                className="rounded border-stone-300 text-[#111113] focus:ring-[#1D4ED8]"
              />
              <span>Jadikan bahasa default</span>
            </label>
          </div>
        </AdminMutationForm>
      </div>
    </main>
  );
}
