import { booksRepository } from "./books.repository";
import { bookSchema, resourceIdSchema, tierSchema } from "./books.schema";
import { authService } from "@/lib/modules/auth/auth.service";
import { bookSubtitle, bookTitle } from "@/lib/modules/i18n/format";
import { isAdminRole, type SessionUser } from "@/lib/modules/auth/auth.service";
import { entitlementsService } from "@/lib/modules/reader/entitlements.service";
import { readerRepository } from "@/lib/modules/reader/reader.repository";
import { ordersRepository } from "@/lib/modules/orders/orders.repository";

function tierCard(tier: Awaited<ReturnType<typeof booksRepository.getTier>> & {}, locale: string) {
  const names = tier.names as Record<string, string>;
  const descriptions = tier.descriptions as Record<string, string>;
  const features = tier.features as Record<string, string[]>;
  return { id: tier.id, name: names[locale] ?? names.id ?? tier.id,
    description: descriptions[locale] ?? descriptions.id ?? "", features: features[locale] ?? features.id ?? [],
    priceIdr: tier.priceIdr, strikePriceIdr: tier.strikePriceIdr, priceUsd: Number(tier.priceUsd),
    includedBookIds: tier.includedBookIds as string[], isBestValue: tier.isBestValue };
}

export const booksService = {
  async getLibrary(user: SessionUser, locale: string) {
    const [allBooks, owned, myOrders, progress] = await Promise.all([
      booksRepository.listBooks(true), entitlementsService.accessSet(user), ordersRepository.listRecentForUser(user.id), readerRepository.getProgress(user.id),
    ]);
    const register = locale === "id" ? "casual" : "standard";
    const checklistSummary: Record<string, number> = {};
    for (const row of progress) if (row.isCompleted) checklistSummary[row.bookId] = (checklistSummary[row.bookId] ?? 0) + 1;
    return {
      cards: allBooks.map((book) => ({ id: book.id, volumeCode: book.volumeCode, title: bookTitle(book.titles, locale, register),
        subtitle: bookSubtitle(book.subtitles, locale, register), accentHex: book.accentHex, priceSingleIdr: book.priceSingleIdr,
        isUnlocked: isAdminRole(user.role) || owned.has(book.id) })),
      recentOrders: myOrders.map(({ order, names }) => ({ orderNumber: order.orderNumber,
        tierName: (names as Record<string, string>)[locale] ?? (names as Record<string, string>).id ?? order.pricingTierId,
        amountIdr: order.amountIdr, status: order.paymentStatus, paidAt: order.paidAt ? new Date(order.paidAt).toLocaleString(locale) : null })),
      checklistSummary,
    };
  },
  async getCatalog(locale: string) {
    const [books, tiers] = await Promise.all([booksRepository.listBooks(true), booksRepository.listTiers(true)]);
    return {
      books: books.map((book) => ({ id: book.id, volumeNumber: book.volumeNumber, volumeCode: book.volumeCode,
        title: bookTitle(book.titles, locale, "standard"), subtitle: bookSubtitle(book.subtitles, locale, "standard"), accentHex: book.accentHex,
        priceSingleIdr: book.priceSingleIdr, priceSingleUsd: Number(book.priceSingleUsd), targetRoles: book.targetRoles as string[], keyFrameworks: book.keyFrameworks as string[] })),
      tiers: tiers.map((tier) => tierCard(tier, locale)),
    };
  },
  async getCheckoutTier(id: string, locale: string) {
    if (!resourceIdSchema.safeParse(id).success) return null;
    const tier = await booksRepository.getTier(id);
    return tier?.isActive ? tierCard(tier, locale) : null;
  },
  async listBooksForAdmin() { await authService.requireAdmin(); return booksRepository.listBooks(); },
  async listTiersForAdmin() { await authService.requireAdmin(); return booksRepository.listTiers(); },
  async saveBook(input: unknown) { await authService.requireAdmin(); await booksRepository.saveBook(bookSchema.parse(input)); },
  async saveTier(input: unknown) {
    await authService.requireAdmin();
    const parsed = tierSchema.parse(input);
    const ids = [...new Set(parsed.includedBookIds)];
    if ((await booksRepository.findBookIds(ids)).length !== ids.length) throw new Error("Tier contains an unknown book");
    await booksRepository.saveTier(parsed);
  },
};
