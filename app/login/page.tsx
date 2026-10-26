import { getRequestTranslations } from "@/lib/modules/i18n/request";
import { translate } from "@/lib/modules/i18n/format";
import { MarketingFullWidthLayout } from "@/components/layout/MarketingFullWidthLayout";
import { LoginView } from "@/components/modules/auth/LoginView";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ locale?: string; error?: string }> }) {
  const params = (await searchParams) ?? {};
  const { locale, translations, locales } = await getRequestTranslations(params.locale);
  return <MarketingFullWidthLayout locale={locale} translations={translations} locales={locales} user={null}>
    <LoginView error={params.error ? String(translate(translations, "auth.invalid_credentials")) : undefined} />
  </MarketingFullWidthLayout>;
}
