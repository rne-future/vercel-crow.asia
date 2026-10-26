import { authService } from "@/lib/modules/auth/auth.service";
import { booksService } from "@/lib/modules/books/books.service";
import { entitlementsService } from "@/lib/modules/reader/entitlements.service";
import { revalidatePath } from "next/cache";

export default async function AdminUsersPage() {
  await authService.requireAdmin();
  const [rows, allBooks, entRows] = await Promise.all([
    authService.listUsersForAdmin(), booksService.listBooksForAdmin(), entitlementsService.listForAdmin(),
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

  return (
    <main>
      <h1>Users</h1>
      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>Nama</th>
            <th>Email</th>
            <th>Role</th>
            <th>Entitlements</th>
            <th>Grant akses</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                {entRows
                  .filter((e) => e.userId === u.id && e.isActive)
                  .map((e) => e.bookId)
                  .join(", ") || "-"}
              </td>
              <td>
                <form action={grantAction}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <select name="book_id" defaultValue="">
                    <option value="" disabled>
                      pilih buku
                    </option>
                    {allBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id}
                      </option>
                    ))}
                  </select>{" "}
                  <button type="submit">Grant</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Tambah / ubah role</h2>
      <form action={updateUser}>
        <input name="email" type="email" required placeholder="email user" />{" "}
        <select name="role" defaultValue="reader">
          <option value="reader">reader</option>
          <option value="editor">editor</option>
          <option value="admin">admin</option>
        </select>{" "}
        <button type="submit">Simpan</button>
      </form>
    </main>
  );
}

async function updateUser(formData: FormData) {
  "use server";
  await authService.requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "reader");
  await authService.updateRole({ email, role });
  revalidatePath("/admin/users");
}
