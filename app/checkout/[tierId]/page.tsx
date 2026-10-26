import { notFound } from "next/navigation";
import { authService } from "@/lib/modules/auth/auth.service";
import { booksService } from "@/lib/modules/books/books.service";
import { getRequestTranslations } from "@/lib/modules/i18n/request";
import { MarketingFullWidthLayout } from "@/components/layout/MarketingFullWidthLayout";
import { CheckoutView } from "@/components/modules/checkout/CheckoutView";

export default async function CheckoutPage({ params, searchParams }: {
  params: Promise<{ tierId: string }>; searchParams?: Promise<{ locale?: string }>;
}) {
  const { locale, translations, locales } = await getRequestTranslations((await searchParams)?.locale);
  const tier = await booksService.getCheckoutTier((await params).tierId, locale);
  if (!tier) notFound();
  const profile = await authService.getProfile((await authService.sessionUser())?.id);
  return <MarketingFullWidthLayout locale={locale} translations={translations} locales={locales} user={profile}>
    <CheckoutView tier={tier} locale={locale} user={profile} />
  </MarketingFullWidthLayout>;
}
