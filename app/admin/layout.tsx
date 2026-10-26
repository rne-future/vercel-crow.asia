import { authService } from "@/lib/modules/auth/auth.service";
import Link from "next/link";


const NAV = [
  ["books", "Books"],
  ["chapters", "Chapters"],
  ["translations", "Translations"],
  ["tiers", "Pricing Tiers"],
  ["orders", "Orders"],
  ["users", "Users"],
  ["locales", "Locales"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await authService.requireAdmin();
  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-6 p-6">
      <nav>
        <h2>Admin</h2>
        <ul>
          {NAV.map(([slug, label]) => (
            <li key={slug}>
              <Link href={`/admin/${slug}`}>{label}</Link>
            </li>
          ))}
        </ul>
        <p>
          <Link href="/dashboard">← Dashboard</Link>
        </p>
      </nav>
      <div className="min-w-0 overflow-x-auto">{children}</div>
    </div>
  );
}
