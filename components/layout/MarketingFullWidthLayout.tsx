import Link from "next/link";
import { BookOpen, Compass, LogIn, ShieldCheck, User as UserIcon } from "lucide-react";
import { GlobalLocaleMenu, SupportedLocaleItem } from "@/components/layout/GlobalLocaleMenu";
import { TranslationProvider } from "@/components/TranslationProvider";

export async function MarketingFullWidthLayout({
  locale = "id",
  translations,
  locales,
  user,
  children,
}: {
  locale?: string;
  translations: Record<string, unknown>;
  locales: SupportedLocaleItem[];
  user?: { name: string; email: string; role?: string } | null;
  children: React.ReactNode;
}) {
  return (
    <TranslationProvider locale={locale} translations={translations}>
      <div className="min-h-screen w-full flex flex-col bg-[#FAF8F5] text-[#111113] font-sans antialiased selection:bg-[#FFE66D] selection:text-[#111113]">
        <header className="sticky top-0 z-40 w-full border-b border-[#E5E0D5] bg-[#FAF8F5]/95 backdrop-blur-sm">
          <div className="w-full px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="flex items-center gap-2 font-bold text-lg tracking-tight text-[#111113] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] rounded-md px-1"
              >
                <span className="text-xl">🦅</span>
                <span>
                  crow<span className="text-[#1D4ED8]">.asia</span>
                </span>
              </Link>
              <NavLinks translations={translations} />
            </div>
            <div className="flex items-center gap-3">
              <GlobalLocaleMenu currentLocale={locale} supportedLocales={locales} />
              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-[#111113] text-[#FAF8F5] hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] transition-colors min-h-[38px]"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>
                    <T k="nav.dashboard" />
                  </span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-[#E5E0D5] bg-[#FFFFFF] text-[#111113] hover:bg-[#FAF8F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] transition-colors min-h-[38px]"
                >
                  <LogIn className="w-3.5 h-3.5 text-stone-500" />
                  <span>
                    <T k="nav.login" />
                  </span>
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="w-full flex-1">{children}</main>

        <footer className="w-full border-t border-[#E5E0D5] bg-[#FFFFFF] py-12 px-4 sm:px-6 lg:px-10 text-xs sm:text-sm text-stone-600">
          <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-base text-[#111113]">
                <span>🦅 crow.asia</span>
                <span className="font-normal text-xs text-stone-500">
                  — <T k="footer.tagline" />
                </span>
              </div>
              <p className="max-w-xl text-stone-500 text-xs leading-relaxed">
                <T k="footer.description" />
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-mono text-stone-600">
              <FooterBook k="nav.book_titles.book-1" icon="compass" color="#1D4ED8" />
              <FooterBook k="nav.book_titles.book-2" icon="shield" color="#EA580C" />
              <FooterBook k="nav.book_titles.book-3" icon="book" color="#0F766E" />
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-[#E5E0D5]/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-stone-400">
            <p>
              <T k="footer.copyright" />
            </p>
            <p className="font-mono text-[11px]">
              <T k="footer.tech_specs" />
            </p>
          </div>
        </footer>
      </div>
    </TranslationProvider>
  );
}

function NavLinks({ translations }: { translations: Record<string, unknown> }) {
  void translations;
  return (
    <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-stone-700">
      <Link href="/#diagnosis" className="hover:text-[#111113] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] rounded px-1 py-0.5 transition-colors">
        <T k="nav.leadership_diagnosis" />
      </Link>
      <Link href="/#katalog" className="hover:text-[#111113] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] rounded px-1 py-0.5 transition-colors">
        <T k="nav.playbooks_catalog" />
      </Link>
      <Link href="/#harga" className="hover:text-[#111113] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] rounded px-1 py-0.5 transition-colors">
        <T k="nav.pricing" />
      </Link>
    </nav>
  );
}

function FooterBook({ k, icon, color }: { k: string; icon: string; color: string }) {
  const Icon = icon === "compass" ? Compass : icon === "shield" ? ShieldCheck : BookOpen;
  return (
    <span className="inline-flex items-center gap-1 bg-[#FAF8F5] px-2.5 py-1 rounded border border-[#E5E0D5]">
      <Icon className="w-3.5 h-3.5" style={{ color }} /> <T k={k} />
    </span>
  );
}

function T({ k }: { k: string }) {
  return <TClient k={k} />;
}
import { TClient } from "@/components/TClient";
