'use client';

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Search, User as UserIcon } from "lucide-react";
import { GlobalLocaleMenu, SupportedLocaleItem } from "./GlobalLocaleMenu";
import { useTranslation } from "@/components/TranslationProvider";

export function TopNavbarFullWidth({
  currentLocale,
  supportedLocales,
  onLocaleChange,
  currentBookId = "book-1",
  paperTheme = "ivory",
  onTogglePaperTheme,
  onOpenSearch,
  user,
  extraActions,
}: {
  currentLocale: string;
  supportedLocales?: SupportedLocaleItem[];
  onLocaleChange?: (locale: string) => void;
  currentBookId?: string;
  paperTheme?: string;
  onTogglePaperTheme?: (theme: string) => void;
  onOpenSearch?: () => void;
  user?: { name: string; email: string; role?: string } | null;
  extraActions?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  const BOOKS = [
    { id: "book-1", label: "VOL. 01", accent: "#1D4ED8" },
    { id: "book-2", label: "VOL. 02", accent: "#EA580C" },
    { id: "book-3", label: "VOL. 03", accent: "#0F766E" },
  ];

  const nextTheme: string = paperTheme === "ivory" ? "sepia" : paperTheme === "sepia" ? "obsidian" : "ivory";
  const themeLabel = paperTheme === "ivory" ? "Ivory" : paperTheme === "sepia" ? "Sepia" : "Obsidian";

  return (
    <div className="w-full flex items-center justify-between gap-3 min-w-0">
      <div className="flex items-center gap-4 sm:gap-6 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-base sm:text-lg text-[#111113] tracking-tight shrink-0 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] rounded-md px-1"
        >
          <span className="text-xl" role="img" aria-label="Crow logo">
            🦅
          </span>
          <span>
            crow<span className="text-[#1D4ED8]">.asia</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1.5 font-mono text-xs" aria-label={t('nav.playbooks_catalog')}>
          {BOOKS.map((b) => {
            const isActive = b.id === currentBookId;
            const bookTitle = String(t(`nav.book_titles.${b.id}`));
            return (
              <Link
                key={b.id}
                href={`/read/${b.id}/${currentLocale}/ch-0`}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#111113] text-[#FAF8F5] font-bold shadow-2xs"
                    : "bg-[#FAF8F5] text-stone-600 hover:text-[#111113] border border-[#E5E0D5]"
                }`}
                title={bookTitle}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: b.accent }} aria-hidden="true" />
                <span>{b.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 max-w-xs hidden sm:flex items-center justify-center">
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs rounded-lg border border-[#E5E0D5] bg-[#FFFFFF] text-stone-500 hover:text-[#111113] hover:border-stone-400 transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4ED8] min-h-[38px]"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">{t("nav.search_placeholder")}</span>
            </span>
            <kbd className="hidden md:inline-block font-mono text-[10px] bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded text-stone-600">
              Ctrl+K
            </kbd>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {extraActions}
        {onTogglePaperTheme && (
          <button
            type="button"
            onClick={() => onTogglePaperTheme(nextTheme)}
            title={`${t("nav.change_theme")} (${themeLabel})`}
            aria-label={`${t("nav.change_theme")}, ${themeLabel}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E0D5] bg-[#FFFFFF] text-xs font-mono text-stone-700 hover:bg-[#FAF8F5] focus-visible:outline-2 focus-visible:outline-[#1D4ED8] transition-colors min-h-[38px]"
          >
            <span className="text-xs">🎨</span>
            <span className="hidden sm:inline">{themeLabel}</span>
          </button>
        )}
        <GlobalLocaleMenu currentLocale={currentLocale} supportedLocales={supportedLocales} onLocaleChange={onLocaleChange} />
        {user ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-[#111113] text-[#FAF8F5] hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] transition-colors min-h-[38px]"
            title={`${t("nav.dashboard")} (${user.email})`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t("nav.dashboard")}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-[#E5E0D5] bg-[#FFFFFF] text-[#111113] hover:bg-[#FAF8F5] focus-visible:outline-2 focus-visible:outline-[#1D4ED8] transition-colors min-h-[38px]"
          >
            <LogIn className="w-3.5 h-3.5 text-stone-500" />
            <span>{t("nav.login")}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
