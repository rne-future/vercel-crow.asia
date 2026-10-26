import { authService } from "@/lib/modules/auth/auth.service";
import { revalidatePath } from "next/cache";
import { booksService } from "@/lib/modules/books/books.service";
import { tierSchema, jsonField } from "@/lib/modules/books/books.schema";

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
    <main>
      <h1>Pricing Tiers</h1>
      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Harga IDR</th>
            <th>Buku</th>
            <th>Aktif</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td><a href={`/admin/tiers?id=${encodeURIComponent(t.id)}`}>{t.id}</a></td>
              <td>Rp {t.priceIdr.toLocaleString("id-ID")}</td>
              <td>{JSON.stringify(t.includedBookIds)}</td>
              <td>{t.isActive ? "ya" : "tidak"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Tambah / ubah tier (JSON)</h2>
      <p>Pilih ID paket di tabel untuk memuat seluruh data sebelum mengubahnya.</p>
      <form key={selected?.id ?? "new"} action={saveTier} style={{ display: "grid", gap: 8, maxWidth: 640 }}>
        <input aria-label="ID paket" name="id" required defaultValue={selected?.id} readOnly={!!selected} placeholder="tier-book-1" />
        <input aria-label="Harga IDR" name="price_idr" required type="number" min={1} defaultValue={selected?.priceIdr} placeholder="59000" />
        <input aria-label="Harga coret IDR" name="strike_price_idr" type="number" min={0} defaultValue={selected?.strikePriceIdr ?? ""} placeholder="(opsional)" />
        <input aria-label="Harga USD" name="price_usd" required defaultValue={selected?.priceUsd} placeholder="4.99" />
        <input aria-label="Urutan" name="sort_order" required type="number" defaultValue={selected?.sortOrder ?? 1} />
        <textarea aria-label="Nama paket" name="names" required rows={2} defaultValue={JSON.stringify(selected?.names ?? {})} />
        <textarea aria-label="Deskripsi paket" name="descriptions" rows={2} defaultValue={JSON.stringify(selected?.descriptions ?? {})} />
        <textarea aria-label="Fitur paket" name="features" rows={3} defaultValue={JSON.stringify(selected?.features ?? {})} />
        <textarea aria-label="Badges" name="badges" rows={2} defaultValue={selected?.badges ? JSON.stringify(selected.badges) : ""} />
        <textarea aria-label="Buku dalam paket" name="included_book_ids" required rows={1} defaultValue={JSON.stringify(selected?.includedBookIds ?? [])} />
        <label>
          <input type="checkbox" name="is_best_value" defaultChecked={selected?.isBestValue ?? false} /> best value
        </label>
        <label>
          <input type="checkbox" name="is_active" defaultChecked={selected?.isActive ?? true} /> aktif
        </label>
        <button type="submit">Simpan</button>
      </form>
    </main>
  );
}
