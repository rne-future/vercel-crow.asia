import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { books, pricingTiers } from "@/lib/db/schema";
import type { Connection } from "@/lib/db/types";

export const booksRepository = {
  listBooks: (activeOnly = false) => db.select().from(books).where(activeOnly ? eq(books.isActive, true) : undefined).orderBy(books.volumeNumber),
  listTiers: (activeOnly = false) => db.select().from(pricingTiers).where(activeOnly ? eq(pricingTiers.isActive, true) : undefined).orderBy(pricingTiers.sortOrder),
  async getBook(id: string, connection: Connection = db) { return (await connection.select().from(books).where(eq(books.id, id)).limit(1))[0] ?? null; },
  async getTier(id: string, connection: Connection = db) { return (await connection.select().from(pricingTiers).where(eq(pricingTiers.id, id)).limit(1))[0] ?? null; },
  async findBookIds(ids: string[]) { return ids.length ? db.select({ id: books.id }).from(books).where(inArray(books.id, ids)) : []; },
  async saveBook(input: typeof books.$inferInsert) {
    await db.insert(books).values(input).onConflictDoUpdate({ target: books.id, set: { ...input, updatedAt: new Date() } });
  },
  async saveTier(input: typeof pricingTiers.$inferInsert) {
    await db.insert(pricingTiers).values(input).onConflictDoUpdate({ target: pricingTiers.id, set: { ...input, updatedAt: new Date() } });
  },
};
