import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userEntitlements } from "@/lib/db/schema";
import type { Connection } from "@/lib/db/types";
import { uuidv7 } from "@/lib/db/uuid";

export const entitlementsRepository = {
  async hasBook(userId: string, bookId: string) {
    return (await db.select({ id: userEntitlements.id }).from(userEntitlements).where(and(
      eq(userEntitlements.userId, userId), eq(userEntitlements.bookId, bookId), eq(userEntitlements.isActive, true),
    )).limit(1)).length > 0;
  },
  listForUser: (userId: string) => db.select().from(userEntitlements).where(eq(userEntitlements.userId, userId)),
  listAll: () => db.select().from(userEntitlements),
  async grant(userId: string, bookId: string, orderId: string | null, reactivate: boolean, connection: Connection = db) {
    const insert = connection.insert(userEntitlements).values({ id: uuidv7(), userId, bookId, orderId, isActive: true, grantedAt: new Date() });
    if (reactivate) await insert.onConflictDoUpdate({ target: [userEntitlements.userId, userEntitlements.bookId], set: { isActive: true, orderId, grantedAt: new Date() } });
    else await insert.onConflictDoNothing();
  },
};
