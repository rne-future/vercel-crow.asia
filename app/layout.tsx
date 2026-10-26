import type { Metadata } from "next";
import "./globals.css";
import "../public/fonts/crow/fonts.css";
import { crowSans, crowSerif, crowMono, crowHand } from "@/lib/shared/fonts";
import { headers } from "next/headers";
import { i18nService } from "@/lib/modules/i18n/i18n.service";

export const metadata: Metadata = {
  title: "crow.asia",
  description: "Playbook kepemimpinan tim: kerangka kerja, skrip percakapan, dan checklist praktik untuk pemimpin tim.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await i18nService.resolveLocale((await headers()).get("x-crow-locale") ?? undefined);
  return (
    <html lang={locale}>
      <body className={`${crowSans.variable} ${crowSerif.variable} ${crowMono.variable} ${crowHand.variable}`}>{children}</body>
    </html>
  );
}
