import type { Metadata } from "next";
import { booksService } from "@/lib/modules/books/books.service";
import { authService } from "@/lib/modules/auth/auth.service";
import { getRequestTranslations } from "@/lib/modules/i18n/request";
import { translate } from "@/lib/modules/i18n/format";
import { MarketingFullWidthLayout } from "@/components/layout/MarketingFullWidthLayout";
import { LandingSections } from "@/components/landing/LandingSections";

type Props = { searchParams?: Promise<{ locale?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { translations } = await getRequestTranslations((await searchParams)?.locale);
  return { title: `${String(translate(translations, "landing.meta_title"))} · crow.asia` };
}

export default async function LandingPage({ searchParams }: Props) {
  const { locale, translations, locales } = await getRequestTranslations((await searchParams)?.locale);
  const [catalog, user] = await Promise.all([booksService.getCatalog(locale), authService.sessionUser()]);
  const profile = await authService.getProfile(user?.id);
  return <MarketingFullWidthLayout locale={locale} translations={translations} locales={locales} user={profile}>
    <LandingSections locale={locale} books={catalog.books} pricingTiers={catalog.tiers} />
  </MarketingFullWidthLayout>;
}
