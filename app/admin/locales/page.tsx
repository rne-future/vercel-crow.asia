import { authService } from "@/lib/modules/auth/auth.service";
import { i18nService } from "@/lib/modules/i18n/i18n.service";
import { AdminMutationForm } from "@/components/modules/admin/AdminMutationForm";
import { saveLocale, setLocaleActive } from "./actions";

export default async function AdminLocalesPage() {
  await authService.requireAdmin();
  const { locales } = await i18nService.listForAdmin("id");
  return <main className="space-y-6 text-stone-900">
    <h1 className="text-2xl font-bold">Bahasa antarmuka</h1>
    <p>Bahasa aktif muncul di menu publik. Jika terjemahan belum lengkap, kamus bahasa default akan digunakan. Naskah bab dikelola terpisah.</p>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Bahasa yang tersedia</caption>
        <thead><tr>{["Kode", "Nama", "Status", "Aksi"].map((heading) => <th scope="col" key={heading} className="border-b p-3">{heading}</th>)}</tr></thead>
        <tbody>{locales.map((locale) => <tr key={locale.code}>
          <td className="border-b p-3">{locale.code}</td>
          <td className="border-b p-3">{locale.flagEmoji} {locale.label}</td>
          <td className="border-b p-3">{locale.isDefault ? "Default · aktif" : locale.isActive ? "Aktif" : "Nonaktif"}</td>
          <td className="border-b p-3">{!locale.isDefault && <AdminMutationForm action={setLocaleActive} submitLabel={locale.isActive ? "Nonaktifkan" : "Aktifkan"}>
            <input type="hidden" name="code" value={locale.code} />
            <input type="hidden" name="isActive" value={String(!locale.isActive)} />
          </AdminMutationForm>}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <h2 className="text-xl font-bold">Tambah atau ubah bahasa</h2>
    <p className="text-sm">Gunakan kode bahasa yang sama untuk memperbarui label atau memilih default baru. Default lama tetap aktif.</p>
    <AdminMutationForm action={saveLocale} submitLabel="Simpan bahasa" className="max-w-xl">
      <label>Kode bahasa<input name="code" required maxLength={16} placeholder="ms" className="block w-full border border-stone-500 p-2" /></label>
      <label>Nama asli / label<input name="label" required maxLength={64} placeholder="Bahasa Melayu" className="block w-full border border-stone-500 p-2" /></label>
      <label>Nama internasional<input name="name" required maxLength={64} placeholder="Malay" className="block w-full border border-stone-500 p-2" /></label>
      <label>Penanda bahasa<input name="flagEmoji" maxLength={16} defaultValue="🌐" className="block w-full border border-stone-500 p-2" /></label>
      <label><input type="checkbox" name="hasDualRegister" /> Memiliki pilihan ragam bahasa</label>
      <label><input type="checkbox" name="isActive" defaultChecked /> Aktif</label>
      <label><input type="checkbox" name="isDefault" /> Jadikan bahasa default</label>
    </AdminMutationForm>
  </main>;
}
