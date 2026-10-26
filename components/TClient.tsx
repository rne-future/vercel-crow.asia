"use client";
import { useTranslation } from "./TranslationProvider";

export function TClient({ k }: { k: string }) {
  const { t } = useTranslation();
  return <>{t(k)}</>;
}
