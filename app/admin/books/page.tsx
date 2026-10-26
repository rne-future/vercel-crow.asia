import Link from "next/link";
import { authService } from "@/lib/modules/auth/auth.service";
import { revalidatePath } from "next/cache";
import { booksService } from "@/lib/modules/books/books.service";
import { jsonField } from "@/lib/modules/books/books.schema";

export default async function AdminBooksPage({ searchParams }: { searchParams?: Promise<{ id?: string }> }) {
  await authService.requireAdmin();
  const rows = await booksService.listBooksForAdmin();
  const params = await searchParams;
  const selected = rows.find((row) => row.id === params?.id);

  async function saveBook(formData: FormData) {
    "use server";
    await authService.requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const getJson = (key: string, fallback: unknown) => jsonField(formData, key, fallback);
    const values = {
      volumeNumber: Number(formData.get("volume_number") ?? 0),
      volumeCode: String(formData.get("volume_code") ?? ""),
      priceSingleIdr: Number(formData.get("price_single_idr") ?? 0),
      priceSingleUsd: String(formData.get("price_single_usd") ?? "0"),
      accentHex: String(formData.get("accent_hex") ?? "#1D4ED8"),
      titles: getJson("titles", {}),
      subtitles: getJson("subtitles", {}),
      targetRoles: getJson("target_roles", []),
      keyFrameworks: getJson("key_frameworks", []),
      pdfKeys: getJson("pdf_keys", {}),
      isActive: formData.get("is_active") === "on",
    };
    await booksService.saveBook({ id, ...values });
    revalidatePath("/admin/books");
    revalidatePath("/", "layout");
  }

  return (
    <main className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D5]">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111113]">Katalog Playbook (Books)</h1>
          <p className="text-xs text-stone-500 mt-1">
            Daftar buku induk, kode volume, harga satuan, dan konfigurasi aset PDF.
          </p>
        </div>
        <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5E0D5] text-stone-700 self-start sm:self-auto">
          {rows.length} volume
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E5E0D5]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAF8F5] border-b border-[#E5E0D5] text-stone-600 font-mono uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 font-bold">ID Buku</th>
              <th className="py-3 px-4 font-bold">Volume</th>
              <th className="py-3 px-4 font-bold">Harga IDR</th>
              <th className="py-3 px-4 font-bold">Harga USD</th>
              <th className="py-3 px-4 font-bold">Aksen</th>
              <th className="py-3 px-4 font-bold">Status</th>
              <th className="py-3 px-4 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E0D5]">
            {rows.map((b) => {
              const isSelected = selected?.id === b.id;
              return (
                <tr
                  key={b.id}
                  className={`transition-colors ${
                    isSelected ? "bg-blue-50/50" : "hover:bg-[#FAF8F5]/60"
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-bold text-[#111113]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.accentHex }} />
                      {b.id}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-stone-700">{b.volumeCode}</td>
                  <td className="py-3 px-4 font-mono text-[#111113]">
                    Rp {b.priceSingleIdr.toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-4 font-mono text-stone-600">${b.priceSingleUsd}</td>
                  <td className="py-3 px-4 font-mono text-stone-500">{b.accentHex}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        b.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-stone-100 text-stone-500 border border-stone-200"
                      }`}
                    >
                      {b.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/books?id=${encodeURIComponent(b.id)}`}
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
              {selected ? `Edit Buku: ${selected.id}` : "Tambah Buku Baru"}
            </h2>
            <p className="text-[11px] text-stone-500">
              Pilih baris pada tabel di atas untuk memuat data buku yang akan diubah.
            </p>
          </div>
          {selected && (
            <Link
              href="/admin/books"
              className="text-xs font-mono text-stone-500 hover:text-[#111113] underline"
            >
              Reset ke Form Baru
            </Link>
          )}
        </div>

        <form key={selected?.id ?? "new"} action={saveBook} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                ID Buku
              </label>
              <input
                aria-label="ID buku"
                name="id"
                required
                defaultValue={selected?.id}
                readOnly={!!selected}
                placeholder="book-1"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8] read-only:bg-stone-100 read-only:text-stone-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Nomor Volume
              </label>
              <input
                aria-label="Nomor volume"
                name="volume_number"
                required
                type="number"
                min={1}
                defaultValue={selected?.volumeNumber}
                placeholder="1"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Kode Volume
              </label>
              <input
                aria-label="Kode volume"
                name="volume_code"
                required
                defaultValue={selected?.volumeCode}
                placeholder="VOL. 01"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Harga IDR
              </label>
              <input
                aria-label="Harga IDR"
                name="price_single_idr"
                required
                type="number"
                min={0}
                defaultValue={selected?.priceSingleIdr}
                placeholder="59000"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Harga USD
              </label>
              <input
                aria-label="Harga USD"
                name="price_single_usd"
                required
                defaultValue={selected?.priceSingleUsd}
                placeholder="4.99"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Warna Aksen Hex
              </label>
              <div className="flex items-center gap-2">
                <input
                  aria-label="Warna aksen"
                  name="accent_hex"
                  required
                  defaultValue={selected?.accentHex ?? "#1D4ED8"}
                  placeholder="#1D4ED8"
                  className="flex-1 px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
            </div>
          </div>

          {/* JSON Textareas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Judul (JSON per locale)
              </label>
              <textarea
                aria-label="Judul"
                name="titles"
                required
                rows={2}
                defaultValue={JSON.stringify(selected?.titles ?? { id: "", en: "" })}
                className="w-full p-2.5 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Subjudul (JSON per locale)
              </label>
              <textarea
                aria-label="Subjudul"
                name="subtitles"
                rows={2}
                defaultValue={JSON.stringify(selected?.subtitles ?? { id: "", en: "" })}
                className="w-full p-2.5 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Target Roles (JSON array)
              </label>
              <textarea
                aria-label="Target roles"
                name="target_roles"
                rows={2}
                defaultValue={JSON.stringify(selected?.targetRoles ?? [])}
                className="w-full p-2.5 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Key Frameworks (JSON array)
              </label>
              <textarea
                aria-label="Frameworks"
                name="key_frameworks"
                rows={2}
                defaultValue={JSON.stringify(selected?.keyFrameworks ?? [])}
                className="w-full p-2.5 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                PDF Storage Keys (JSON)
              </label>
              <textarea
                aria-label="PDF storage keys"
                name="pdf_keys"
                rows={2}
                defaultValue={JSON.stringify(selected?.pdfKeys ?? {})}
                className="w-full p-2.5 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={selected?.isActive ?? true}
                className="rounded border-stone-300 text-[#111113] focus:ring-[#1D4ED8]"
              />
              <span>Volume buku aktif dan dapat dibeli / diakses</span>
            </label>

            <button
              type="submit"
              className="px-5 py-2 rounded-lg font-bold text-xs bg-[#111113] text-[#FAF8F5] hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
            >
              Simpan Data Buku
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
