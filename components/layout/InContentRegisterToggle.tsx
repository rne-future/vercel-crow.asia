"use client";
import { useRouter } from "next/navigation";
import { useTranslation } from '@/components/TranslationProvider';

export function InContentRegisterToggle({
  locale,
  register,
  onRegisterChange,
  className = "",
  size = "md",
}: {
  locale: string;
  register: string;
  onRegisterChange?: (register: string) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const { t } = useTranslation();
  if (locale !== "id") return null;

  const handleSelect = (selected: string) => {
    if (selected === register) return;
    try {
      localStorage.setItem("crow:id-register", selected);
      document.cookie = `crow:id-register=${selected}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore
    }
    if (onRegisterChange) {
      onRegisterChange(selected);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("reg", selected);
    router.push(url.pathname + url.search);
  };

  const isCasual = register === "casual";
  const isStandard = register === "standard";
  const paddingClass = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm";

  return (
    <div role="group" aria-label={t('reader.register_title')} className={`inline-flex items-center p-1 rounded-xl border border-[#E5E0D5] bg-[#FFFFFF] shadow-2xs ${className}`}>
      <button
        type="button"
        onClick={() => handleSelect("casual")}
        aria-pressed={isCasual}
        className={`inline-flex items-center gap-1.5 font-semibold rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] min-h-[38px] ${paddingClass} ${
          isCasual ? "bg-[#FAF8F5] text-[#111113] shadow-xs border border-[#E5E0D5]" : "text-stone-600 hover:text-[#111113] border border-transparent"
        }`}
      >
        <span className={`w-2 h-2 rounded-full transition-colors ${isCasual ? "bg-[#F59E0B]" : "bg-stone-300"}`} aria-hidden="true" />
        <span>
          {t('reader.register_casual')} <span className="hidden sm:inline font-normal text-stone-500">{t('reader.register_casual_hint')}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => handleSelect("standard")}
        aria-pressed={isStandard}
        className={`inline-flex items-center gap-1.5 font-semibold rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] min-h-[38px] ${paddingClass} ${
          isStandard ? "bg-[#FAF8F5] text-[#111113] shadow-xs border border-[#E5E0D5]" : "text-stone-600 hover:text-[#111113] border border-transparent"
        }`}
      >
        <span className={`w-2 h-2 rounded-full transition-colors ${isStandard ? "bg-[#2563EB]" : "bg-stone-300"}`} aria-hidden="true" />
        <span>
          {t('reader.register_standard')} <span className="hidden sm:inline font-normal text-stone-500">{t('reader.register_standard_hint')}</span>
        </span>
      </button>
    </div>
  );
}
