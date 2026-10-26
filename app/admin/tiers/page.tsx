import Link from "next/link";
import { authService } from "@/lib/modules/auth/auth.service";
import { revalidatePath } from "next/cache";
import { booksService } from "@/lib/modules/books/books.service";
import { jsonField } from "@/lib/modules/books/books.schema";

export default async function AdminTiersPage({ searchParams }: { searchParams?: Promise<{ id?: string }> }) {
  await authService.requireAdmin();
  const rows = await booksService.listTiersForAdmin();
  const params = await searchParams;
  const selected = rows.find((row) => row.id === params?.id);

  async function saveTier(formData: FormData) {
    "use server";
    await authService.requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const getJson = (key: string, fallback: unknown) => jsonField(formData, key, fallback);
    const values = {
      names: getJson("names", {}),
      descriptions: getJson("descriptions", {}),
      features: getJson("features", {}),
      badges: getJson("badges", null),
      priceIdr: Number(formData.get("price_idr") ?? 0),
      strikePriceIdr: formData.get("strike_price_idr") ? Number(formData.get("strike_price_idr")) : null,
      priceUsd: String(formData.get("price_usd") ?? "0"),
      includedBookIds: getJson("included_book_ids", []),
      sortOrder: Number(formData.get("sort_order") ?? 1),
      isBestValue: formData.get("is_best_value") === "on",
      isActive: formData.get("is_active") === "on",
    };
    await booksService.saveTier({ id, ...values });
    revalidatePath("/admin/tiers");
    revalidatePath("/", "layout");
  }

  return (
    <main className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D5]">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111113]">Paket Harga (Pricing Tiers)</h1>
          <p className="text-xs text-stone-500 mt-1">
            Konfigurasi paket pembelian, diskon / strike price, bundling buku, dan badge penawaran.
          </p>
        </div>
        <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5E0D5] text-stone-700 self-start sm:self-auto">
          {rows.length} paket
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E5E0D5]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAF8F5] border-b border-[#E5E0D5] text-stone-600 font-mono uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 font-bold">ID Paket</th>
              <th className="py-3 px-4 font-bold">Harga IDR</th>
              <th className="py-3 px-4 font-bold">Harga Coret</th>
              <th className="py-3 px-4 font-bold">Buku Termasuk</th>
              <th className="py-3 px-4 font-bold">Best Value</th>
              <th className="py-3 px-4 font-bold">Status</th>
              <th className="py-3 px-4 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E0D5]">
            {rows.map((t) => {
              const isSelected = selected?.id === t.id;

              return (
                <tr
                  key={t.id}
                  className={`transition-colors ${
                    isSelected ? "bg-blue-50/50" : "hover:bg-[#FAF8F5]/60"
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-bold text-[#111113]">{t.id}</td>
                  <td className="py-3 px-4 font-mono font-bold text-[#111113]">
                    Rp {t.priceIdr.toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-4 font-mono text-stone-400 line-through">
                    {t.strikePriceIdr ? `Rp ${t.strikePriceIdr.toLocaleString("id-ID")}` : "-"}
                  </td>
                  <td className="py-3 px-4 font-mono text-stone-600">
                    {Array.isArray(t.includedBookIds) ? t.includedBookIds.join(", ") : JSON.stringify(t.includedBookIds)}
                  </td>
                  <td className="py-3 px-4">
                    {t.isBestValue ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                        Best Value
                      </span>
                    ) : (
                      <span className="text-stone-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        t.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-stone-100 text-stone-500 border border-stone-200"
                      }`}
                    >
                      {t.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/tiers?id=${encodeURIComponent(t.id)}`}
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
              {selected ? `Edit Paket: ${selected.id}` : "Tambah Paket Baru"}
            </h2>
            <p className="text-[11px] text-stone-500">
              Pilih baris pada tabel di atas untuk memuat data paket yang akan diubah.
            </p>
          </div>
          {selected && (
            <Link
              href="/admin/tiers"
              className="text-xs font-mono text-stone-500 hover:text-[#111113] underline"
            >
              Reset ke Form Baru
            </Link>
          )}
        </div>

        <form key={selected?.id ?? "new"} action={saveTier} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                ID Paket
              </label>
              <input
                aria-label="ID paket"
                name="id"
                required
                defaultValue={selected?.id}
                readOnly={!!selected}
                placeholder="tier-book-1"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8] read-only:bg-stone-100 read-only:text-stone-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Harga IDR
              </label>
              <input
                aria-label="Harga IDR"
                name="price_idr"
                required
                type="number"
                min={1}
                defaultValue={selected?.priceIdr}
                placeholder="59000"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Harga Coret IDR (Opsional)
              </label>
              <input
                aria-label="Harga coret IDR"
                name="strike_price_idr"
                type="number"
                min={0}
                defaultValue={selected?.strikePriceIdr ?? ""}
                placeholder="99000"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Harga USD
              </label>
              <input
                aria-label="Harga USD"
                name="price_usd"
                required
                defaultValue={selected?.priceUsd}
                placeholder="4.99"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Urutan Tampilan
              </label>
              <input
                aria-label="Urutan"
                name="sort_order"
                required
                type="number"
                defaultValue={selected?.sortOrder ?? 1}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Buku Termasuk (JSON array ID buku)
              </label>
              <input
                aria-label="Buku dalam paket"
                name="included_book_ids"
                required
                defaultValue={JSON.stringify(selected?.includedBookIds ?? ["book-1"])}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Nama Paket (JSON per locale)
              </label>
              <textarea
                aria-label="Nama paket"
                name="names"
                required
                rows={2}
                defaultValue={JSON.stringify(selected?.names ?? { id: "", en: "" })}
                className="w-full p-2.5 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Deskripsi Paket (JSON per locale)
              </label>
              <textarea
                aria-label="Deskripsi paket"
                name="descriptions"
                rows={2}
                defaultValue={JSON.stringify(selected?.descriptions ?? { id: "", en: "" })}
                className="w-full p-2.5 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Fitur Paket (JSON per locale array string)
              </label>
              <textarea
                aria-label="Fitur paket"
                name="features"
                rows={3}
                defaultValue={JSON.stringify(selected?.features ?? { id: [], en: [] })}
                className="w-full p-2.5 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono font-bold text-stone-700 uppercase text-[10px]">
                Badges (JSON per locale, opsional)
              </label>
              <textarea
                aria-label="Badges"
                name="badges"
                rows={3}
                defaultValue={selected?.badges ? JSON.stringify(selected.badges) : ""}
                placeholder='{"id": "TERLARIS", "en": "BEST SELLER"}'
                className="w-full p-2.5 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                <input
                  type="checkbox"
                  name="is_best_value"
                  defaultChecked={selected?.isBestValue ?? false}
                  className="rounded border-stone-300 text-[#111113] focus:ring-[#1D4ED8]"
                />
                <span>Sorot sebagai Best Value</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={selected?.isActive ?? true}
                  className="rounded border-stone-300 text-[#111113] focus:ring-[#1D4ED8]"
                />
                <span>Paket aktif dan tampil di halaman publik</span>
              </label>
            </div>

            <button
              type="submit"
              className="px-5 py-2 rounded-lg font-bold text-xs bg-[#111113] text-[#FAF8F5] hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer self-end sm:self-auto"
            >
              Simpan Data Paket
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
