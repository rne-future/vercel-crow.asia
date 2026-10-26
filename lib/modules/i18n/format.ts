export type LocaleCode = string;
export type ContentRegister = "casual" | "standard";
export type BookId = "book-1" | "book-2" | "book-3";

type Dict = Record<string, unknown>;

type Replacements = Record<string, string | number>;

export function translate(dict: Dict, key: string, replacements?: Replacements): unknown {
  let current: unknown = dict;
  for (const segment of key.split(".")) {
    if (current && typeof current === "object" && Object.hasOwn(current, segment) && !["__proto__", "constructor", "prototype"].includes(segment)) {
      current = (current as Dict)[segment];
    } else {
      return key;
    }
  }
  if (typeof current !== "string") return current;
  let result = current;
  if (replacements) {
    for (const [k, v] of Object.entries(replacements)) {
      result = result.replaceAll(`:${k}`, String(v)).replaceAll(`{${k}}`, String(v));
    }
  }
  return result;
}

export function formatPrice(locale: string, amountIdr: number, amountUsd?: number | null): string {
  const currency = locale === "id" ? "IDR" : "USD";
  if (currency === "USD" && amountUsd !== undefined && amountUsd !== null) {
    return `$${amountUsd.toFixed(2)}`;
  }
  return `Rp${amountIdr.toLocaleString("id-ID")}`;
}

export function bookTitle(
  titles: unknown,
  locale: string,
  register: string,
): string {
  const t = (titles ?? {}) as Record<string, string>;
  const keys = Object.keys(t);
  return t[`${locale}:${register}`] ?? t[`${locale}:standard`] ?? (keys.length > 0 ? t[keys[0]] : "");
}

export function bookSubtitle(
  subtitles: unknown,
  locale: string,
  register: string,
): string {
  const t = (subtitles ?? {}) as Record<string, string>;
  const keys = Object.keys(t);
  return t[`${locale}:${register}`] ?? t[`${locale}:standard`] ?? (keys.length > 0 ? t[keys[0]] : "");
}
