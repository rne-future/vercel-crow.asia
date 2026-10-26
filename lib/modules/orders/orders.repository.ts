import { and, desc, eq, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, pricingTiers } from "@/lib/db/schema";
import type { Connection, Transaction } from "@/lib/db/types";

export type OrderRow = typeof orders.$inferSelect;
export const ordersRepository = {
  transaction: <T>(operation: (tx: Transaction) => Promise<T>) => db.transaction(operation),
  async getById(id: string, connection: Connection = db, lock = false) {
    const query = connection.select().from(orders).where(eq(orders.id, id)).limit(1);
    return (await (lock ? query.for("update") : query))[0] ?? null;
  },
  async getByNumber(orderNumber: string) { return (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0] ?? null; },
  async findWebhookOrders(ids: { orderNumber?: string; invoiceId?: string; transactionId?: string }) {
    const predicates = [ids.orderNumber ? eq(orders.orderNumber, ids.orderNumber) : undefined,
      ids.invoiceId ? eq(orders.mayarInvoiceId, ids.invoiceId) : undefined,
      ids.transactionId ? eq(orders.mayarTransactionId, ids.transactionId) : undefined].filter((value) => value !== undefined);
    return predicates.length ? db.select().from(orders).where(or(...predicates)).limit(3) : [];
  },
  async create(input: typeof orders.$inferInsert, tx: Transaction) { return (await tx.insert(orders).values(input).returning())[0]; },
  async update(id: string, values: Partial<typeof orders.$inferInsert>, connection: Connection = db) {
    return (await connection.update(orders).set({ ...values, updatedAt: new Date() }).where(eq(orders.id, id)).returning())[0];
  },
  async closeUnpaid(id: string) {
    await db.update(orders).set({ paymentStatus: "CLOSED", updatedAt: new Date() }).where(and(eq(orders.id, id), eq(orders.paymentStatus, "PENDING")));
  },
  async expireUnpaid(id: string, payload: unknown) {
    return (await db.update(orders).set({ paymentStatus: "EXPIRED", rawWebhookPayload: payload, updatedAt: new Date() })
      .where(and(eq(orders.id, id), ne(orders.paymentStatus, "PAID"))).returning())[0] ?? null;
  },
  listForAdmin: (status?: string) => db.select().from(orders).where(status ? eq(orders.paymentStatus, status) : undefined).orderBy(desc(orders.createdAt)).limit(100),
  listRecentForUser: (userId: string) => db.select({ order: orders, names: pricingTiers.names }).from(orders)
    .innerJoin(pricingTiers, eq(pricingTiers.id, orders.pricingTierId)).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)).limit(5),
};
