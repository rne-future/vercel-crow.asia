"use client";
import { createContext, useContext, useCallback, useEffect } from "react";
import { formatPrice as formatPriceLib, translate } from "@/lib/modules/i18n/format";

export type LocaleCode = string;

interface Ctx {
  t: (key: string, replacements?: Record<string, string | number>) => string;
  get: (key: string) => unknown;
  locale: LocaleCode;
  currency: "IDR" | "USD";
  formatPrice: (amountIdr: number, amountUsd?: number | null) => string;
}

const TranslationContext = createContext<Ctx>({
  t: (k) => k,
  get: (k) => k,
  locale: "id",
  currency: "IDR",
  formatPrice: (a, u) => formatPriceLib("id", a, u),
});

export function TranslationProvider({
  locale,
  translations,
  children,
}: {
  locale: LocaleCode;
  translations: Record<string, unknown>;
  children: React.ReactNode;
}) {
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const t = useCallback((key: string, replacements?: Record<string, string | number>) =>
    String(translate(translations, key, replacements) ?? key), [translations]);
  const currency = (locale === "id" ? "IDR" : "USD") as "IDR" | "USD";
  return (
    <TranslationContext.Provider
      value={{ t, get: (key) => translate(translations, key), locale, currency, formatPrice: (a, u) => formatPriceLib(locale, a, u) }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
