import id from "@/lang-id.json";
import en from "@/lang-en.json";

export * from "./modules/i18n/format";

// Synchronous baseline for scripts and callers outside the Next.js cache runtime.
export function getDict(locale: string): Record<string, unknown> {
  return locale === "en" ? en : id;
}
