"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Globe, Sparkles } from "lucide-react";
import { useTranslation } from "@/components/TranslationProvider";

export interface SupportedLocaleItem {
  code: string;
  name: string;
  nativeName: string;
  flagEmoji: string;
  isLlmTranslated?: boolean;
}

const DEFAULT_LOCALES: SupportedLocaleItem[] = [
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flagEmoji: "🇮🇩", isLlmTranslated: false },
  { code: "en", name: "English", nativeName: "English", flagEmoji: "🌐", isLlmTranslated: false },
];

export function GlobalLocaleMenu({
  currentLocale,
  supportedLocales = DEFAULT_LOCALES,
  onLocaleChange,
  currentPathResolver,
}: {
  currentLocale: string;
  supportedLocales?: SupportedLocaleItem[];
  onLocaleChange?: (locale: string) => void;
  currentPathResolver?: (locale: string) => string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLocale =
    supportedLocales.find((l) => l.code === currentLocale) ||
    DEFAULT_LOCALES.find((l) => l.code === currentLocale) ||
    DEFAULT_LOCALES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelectLocale = (code: string) => {
    setIsOpen(false);
    if (code === currentLocale) return;
    try {
      document.cookie = `crow:locale=${encodeURIComponent(code)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore
    }
    if (onLocaleChange) {
      onLocaleChange(code);
      return;
    }
    if (currentPathResolver) {
      router.push(currentPathResolver(code));
      return;
    }
    const currentPath = window.location.pathname;
    const readMatch = currentPath.match(/^\/read\/([^/]+)(?:\/([^/]+))?(\/.*)?$/);
    if (readMatch) {
      const rest = readMatch[3] || "/ch-0";
      const query = new URLSearchParams(window.location.search);
      if (code !== "id") query.delete("reg");
      const suffix = query.size ? `?${query}` : "";
      router.push(`/read/${readMatch[1]}/${code}${rest}${suffix}`);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set("locale", code);
      router.push(url.pathname + url.search);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t("nav.select_language", { lang: activeLocale.nativeName })}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-[#E5E0D5] bg-[#FFFFFF] text-[#111113] hover:bg-[#FAF8F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] transition-colors min-h-[38px]"
      >
        <span className="text-sm leading-none" role="img" aria-hidden="true">
          {activeLocale.flagEmoji}
        </span>
        <span className="uppercase tracking-wide font-mono font-bold text-xs">{activeLocale.code}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div role="menu" aria-orientation="vertical" className="absolute right-0 mt-1.5 w-60 rounded-xl bg-[#FFFFFF] border border-[#E5E0D5] shadow-lg py-1.5 z-50">
          <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-stone-400 border-b border-[#E5E0D5]/60 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-stone-400" />
            <span>{t("nav.language_region")}</span>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {supportedLocales.map((locale) => {
              const isSelected = locale.code === currentLocale;
              return (
                <button
                  key={locale.code}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectLocale(locale.code)}
                  className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex items-center justify-between gap-2 hover:bg-[#FAF8F5] transition-colors ${
                    isSelected ? "bg-[#FAF8F5] font-bold text-[#1D4ED8]" : "text-[#111113]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base" role="img" aria-hidden="true">
                      {locale.flagEmoji}
                    </span>
                    <div className="min-w-0 flex flex-col">
                      <span className="truncate leading-tight">{locale.nativeName}</span>
                      <span className="text-[11px] text-stone-500 font-mono uppercase">
                        {locale.code} — {locale.name}
                      </span>
                    </div>
                  </div>
                  {locale.isLlmTranslated && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#FFE66D]/40 text-[#111113] border border-[#FFE66D]">
                      <Sparkles className="w-2.5 h-2.5 text-amber-600" /> AI
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
