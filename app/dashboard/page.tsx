import { redirect } from "next/navigation";
import { authService } from "@/lib/modules/auth/auth.service";
import { booksService } from "@/lib/modules/books/books.service";
import { getRequestTranslations } from "@/lib/modules/i18n/request";
import { MarketingFullWidthLayout } from "@/components/layout/MarketingFullWidthLayout";
import { DashboardView } from "@/components/modules/dashboard/DashboardView";

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<{ locale?: string }> }) {
  const user = await authService.sessionUser();
  if (!user) redirect("/login");
  const { locale, translations, locales } = await getRequestTranslations((await searchParams)?.locale);
  const [profile, library] = await Promise.all([authService.getProfile(user.id), booksService.getLibrary(user, locale)]);
  return <MarketingFullWidthLayout locale={locale} translations={translations} locales={locales} user={profile}>
    <DashboardView user={profile} allBooks={library.cards} recentOrders={library.recentOrders} checklistSummary={library.checklistSummary} locale={locale} />
  </MarketingFullWidthLayout>;
}
