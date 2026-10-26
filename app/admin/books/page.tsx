import { authService } from "@/lib/modules/auth/auth.service";
import { revalidatePath } from "next/cache";
import { booksService } from "@/lib/modules/books/books.service";
import { bookSchema, jsonField } from "@/lib/modules/books/books.schema";

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
    <main>
      <h1>Books</h1>
      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Vol</th>
            <th>Harga IDR</th>
            <th>Aktif</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td><a href={`/admin/books?id=${encodeURIComponent(b.id)}`}>{b.id}</a></td>
              <td>{b.volumeCode}</td>
              <td>Rp {b.priceSingleIdr.toLocaleString("id-ID")}</td>
              <td>{b.isActive ? "ya" : "tidak"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Tambah / ubah buku (JSON untuk titles/subtitles/roles/frameworks/pdf keys)</h2>
      <p>Pilih ID buku di tabel untuk memuat seluruh data sebelum mengubahnya.</p>
      <form key={selected?.id ?? "new"} action={saveBook} style={{ display: "grid", gap: 8, maxWidth: 640 }}>
        <input aria-label="ID buku" name="id" required defaultValue={selected?.id} readOnly={!!selected} placeholder="book-1" />
        <input aria-label="Nomor volume" name="volume_number" required type="number" min={1} defaultValue={selected?.volumeNumber} placeholder="1" />
        <input aria-label="Kode volume" name="volume_code" required defaultValue={selected?.volumeCode} placeholder="VOL. 01" />
        <input aria-label="Harga IDR" name="price_single_idr" required type="number" min={0} defaultValue={selected?.priceSingleIdr} placeholder="59000" />
        <input aria-label="Harga USD" name="price_single_usd" required defaultValue={selected?.priceSingleUsd} placeholder="4.99" />
        <input aria-label="Warna aksen" name="accent_hex" required defaultValue={selected?.accentHex ?? "#1D4ED8"} placeholder="#1D4ED8" />
        <textarea aria-label="Judul" name="titles" required rows={2} defaultValue={JSON.stringify(selected?.titles ?? {})} />
        <textarea aria-label="Subjudul" name="subtitles" rows={2} defaultValue={JSON.stringify(selected?.subtitles ?? {})} />
        <textarea aria-label="Target roles" name="target_roles" rows={2} defaultValue={JSON.stringify(selected?.targetRoles ?? [])} />
        <textarea aria-label="Frameworks" name="key_frameworks" rows={2} defaultValue={JSON.stringify(selected?.keyFrameworks ?? [])} />
        <textarea aria-label="PDF storage keys" name="pdf_keys" rows={1} defaultValue={JSON.stringify(selected?.pdfKeys ?? {})} />
        <label>
          <input type="checkbox" name="is_active" defaultChecked={selected?.isActive ?? true} /> aktif
        </label>
        <button type="submit">Simpan</button>
      </form>
    </main>
  );
}
