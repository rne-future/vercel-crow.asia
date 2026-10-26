import { authService } from "@/lib/modules/auth/auth.service";
import { booksService } from "@/lib/modules/books/books.service";
import { entitlementsService } from "@/lib/modules/reader/entitlements.service";
import { revalidatePath } from "next/cache";

export default async function AdminUsersPage() {
  await authService.requireAdmin();
  const [rows, allBooks, entRows] = await Promise.all([
    authService.listUsersForAdmin(),
    booksService.listBooksForAdmin(),
    entitlementsService.listForAdmin(),
  ]);

  async function grantAction(formData: FormData) {
    "use server";
    await authService.requireAdmin();
    const userId = String(formData.get("user_id") ?? "");
    const bookId = String(formData.get("book_id") ?? "");
    if (!userId || !bookId) return;
    await entitlementsService.grantForAdmin({ userId, bookId });
    revalidatePath("/admin/users");
    revalidatePath("/dashboard");
    revalidatePath("/read", "layout");
  }

  async function updateUser(formData: FormData) {
    "use server";
    await authService.requireAdmin();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const role = String(formData.get("role") ?? "reader");
    await authService.updateRole({ email, role });
    revalidatePath("/admin/users");
  }

  return (
    <main className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D5]">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111113]">Pengguna & Hak Akses (Users)</h1>
          <p className="text-xs text-stone-500 mt-1">
            Daftar akun terdaftar, pengelolaan role akses (admin/editor/reader), dan manual grant akses buku.
          </p>
        </div>
        <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5E0D5] text-stone-700 self-start sm:self-auto">
          {rows.length} pengguna
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E5E0D5]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAF8F5] border-b border-[#E5E0D5] text-stone-600 font-mono uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 font-bold">Nama</th>
              <th className="py-3 px-4 font-bold">Email</th>
              <th className="py-3 px-4 font-bold">Role</th>
              <th className="py-3 px-4 font-bold">Buku Terbuka (Entitlements)</th>
              <th className="py-3 px-4 font-bold text-right">Manual Grant Akses</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E0D5]">
            {rows.map((u) => {
              const activeBooks = entRows
                .filter((e) => e.userId === u.id && e.isActive)
                .map((e) => e.bookId);

              const isAdmin = u.role === "admin";
              const isEditor = u.role === "editor";

              return (
                <tr key={u.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#111113]">{u.name || "-"}</td>
                  <td className="py-3 px-4 font-mono text-stone-700">{u.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        isAdmin
                          ? "bg-purple-50 text-purple-800 border border-purple-200"
                          : isEditor
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-stone-100 text-stone-600 border border-stone-200"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {activeBooks.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {activeBooks.map((bid) => (
                          <span
                            key={bid}
                            className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold"
                          >
                            {bid}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-stone-400 font-mono text-[11px]">Belum ada akses</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <form action={grantAction} className="inline-flex items-center gap-1.5 justify-end">
                      <input type="hidden" name="user_id" value={u.id} />
                      <select
                        name="book_id"
                        defaultValue=""
                        className="px-2.5 py-1 rounded-md border border-[#E5E0D5] bg-white font-mono text-[11px] text-stone-700 focus:outline-none focus:border-[#1D4ED8]"
                      >
                        <option value="" disabled>
                          Pilih Buku
                        </option>
                        {allBooks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.id} ({b.volumeCode})
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#111113] text-[#FAF8F5] hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
                      >
                        Grant
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Update Role Section */}
      <div className="p-6 rounded-xl border border-[#E5E0D5] bg-[#FAF8F5]/50 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#111113]">Ubah Role Pengguna</h2>
          <p className="text-[11px] text-stone-500">
            Hanya administrator yang berhak mengubah hak istimewa pengguna.
          </p>
        </div>

        <form action={updateUser} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="email.user@example.com"
            className="flex-1 px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white text-xs focus:outline-none focus:border-[#1D4ED8]"
          />
          <select
            name="role"
            defaultValue="reader"
            className="px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white font-mono text-xs text-stone-700 focus:outline-none focus:border-[#1D4ED8]"
          >
            <option value="reader">reader (pembaca biasa)</option>
            <option value="editor">editor (akses konten/naskah)</option>
            <option value="admin">admin (kontrol penuh)</option>
          </select>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg font-bold text-xs bg-[#111113] text-[#FAF8F5] hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            Simpan Perubahan Role
          </button>
        </form>
      </div>
    </main>
  );
}
