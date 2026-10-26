'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingBag,
  BookOpen,
  FileText,
  Languages,
  Tag,
  Users,
  Globe,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

const NAV_ITEMS = [
  { slug: "orders", label: "Orders", icon: ShoppingBag },
  { slug: "books", label: "Books", icon: BookOpen },
  { slug: "chapters", label: "Chapters", icon: FileText },
  { slug: "translations", label: "Translations", icon: Languages },
  { slug: "tiers", label: "Pricing Tiers", icon: Tag },
  { slug: "users", label: "Users", icon: Users },
  { slug: "locales", label: "Locales", icon: Globe },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-60 shrink-0 space-y-6">
      {/* Brand & Portal Label */}
      <div className="p-4 rounded-xl border border-[#E5E0D5] bg-[#FFFFFF] shadow-2xs space-y-2">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-base text-[#111113] tracking-tight hover:opacity-80 transition-opacity"
        >
          <span className="text-xl" role="img" aria-label="Crow logo">
            🦅
          </span>
          <span>
            crow<span className="text-[#1D4ED8]">.asia</span>
          </span>
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-purple-900 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
          <span>Control Panel</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="p-2 rounded-xl border border-[#E5E0D5] bg-[#FFFFFF] shadow-2xs space-y-1" aria-label="Admin Navigation">
        <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
          Management
        </div>
        {NAV_ITEMS.map((item) => {
          const href = `/admin/${item.slug}`;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.slug}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-[#111113] text-[#FAF8F5] shadow-2xs"
                  : "text-stone-600 hover:text-[#111113] hover:bg-[#FAF8F5]"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#FAF8F5]" : "text-stone-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-3 border-t border-[#E5E0D5] mt-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-600 hover:text-[#111113] hover:bg-[#FAF8F5] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-stone-400 shrink-0" />
            <span>Dashboard Publik</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
