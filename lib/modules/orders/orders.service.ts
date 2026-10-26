import bcrypt from "bcryptjs";
import { ordersRepository, type OrderRow } from "./orders.repository";
import { checkoutSchema, orderIdSchema, orderNumberSchema, paymentStatusSchema, webhookSchema } from "./orders.schema";
import { booksRepository } from "@/lib/modules/books/books.repository";
import { authRepository } from "@/lib/modules/auth/auth.repository";
import { authService, type SessionUser } from "@/lib/modules/auth/auth.service";
import { entitlementsRepository } from "@/lib/modules/reader/entitlements.repository";
import type { Connection } from "@/lib/db/types";
import { uuidv7 } from "@/lib/db/uuid";
import { createInvoice, isMockMode } from "@/lib/integrations/mayar";
import { ServiceError } from "@/lib/shared/errors";

function orderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `CROW-${date}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

export async function syncEntitlements(order: OrderRow, connection?: Connection, reactivate = true): Promise<string[]> {
  if (!connection) return ordersRepository.transaction((tx) => syncEntitlements(order, tx, reactivate));
  if (order.paymentStatus !== "PAID") throw new Error("Cannot grant access for an unpaid order");
  let userId = order.userId;
  if (!userId) {
    const email = order.customerEmail.toLowerCase().trim();
    const existing = await authRepository.findByEmail(email, connection);
    userId = existing?.id ?? (await authRepository.createUser({ id: uuidv7(), email, name: email.split("@")[0],
      password: await bcrypt.hash(crypto.randomUUID(), 10), role: "reader" }, connection))?.id
      ?? (await authRepository.findByEmail(email, connection))?.id ?? null;
    if (!userId) throw new Error("Order user could not be created");
    await ordersRepository.update(order.id, { userId }, connection);
  }
  const tier = await booksRepository.getTier(order.pricingTierId, connection);
  if (!tier) throw new Error("Order tier not found");
  const snapshot = order.includedBookIds ?? tier.includedBookIds;
  const includedBookIds = Array.isArray(snapshot) ? snapshot as string[] : [];
  for (const bookId of [...includedBookIds].sort()) await entitlementsRepository.grant(userId, bookId, order.id, reactivate, connection);
  return includedBookIds;
}

export async function markOrderPaid(orderId: string, details: { mayarTransactionId?: string | null; rawWebhookPayload?: unknown } = {}) {
  orderIdSchema.parse(orderId);
  return ordersRepository.transaction(async (tx) => {
    const order = await ordersRepository.getById(orderId, tx, true);
    if (!order) throw new ServiceError(404, "Order not found");
    if (details.mayarTransactionId && order.mayarTransactionId && details.mayarTransactionId !== order.mayarTransactionId) throw new ServiceError(409, "Conflicting transaction identifier");
    const idempotent = order.paymentStatus === "PAID";
    const tier = await booksRepository.getTier(order.pricingTierId, tx);
    if (!tier) throw new Error("Order tier not found");
    const paid = await ordersRepository.update(orderId, { ...details, mayarTransactionId: details.mayarTransactionId ?? order.mayarTransactionId, paymentStatus: "PAID", paidAt: order.paidAt ?? new Date(), includedBookIds: order.includedBookIds ?? tier.includedBookIds }, tx);
    const grantedBooks = await syncEntitlements(paid, tx, !idempotent);
    return { order: paid, grantedBooks, idempotent };
  });
}

export const ordersService = {
  markOrderPaid,
  async checkout(input: unknown, user: SessionUser | null, appUrl: string) {
    const parsed = checkoutSchema.parse(input);
    const profile = await authService.getProfile(user?.id);
    const customerEmail = profile?.email ?? parsed.customer_email;
    if (!await authService.allowCheckoutAttempt(customerEmail)) throw new ServiceError(429, "Terlalu banyak percobaan checkout. Coba lagi dalam 15 menit.");
    const tier = await booksRepository.getTier(parsed.pricing_tier_id);
    if (!tier?.isActive) throw new ServiceError(404, "Paket tidak ditemukan.");
    const order = await ordersRepository.transaction(async (tx) => {
      let buyerId = profile?.id;
      if (!buyerId) {
        if (!parsed.password) throw new ServiceError(400, "Buat password untuk mengakses pembelian Anda, atau login terlebih dahulu.");
        if (await authRepository.findByEmail(customerEmail, tx)) throw new ServiceError(409, "Silakan login untuk melanjutkan checkout dengan email ini.");
        const created = await authRepository.createUser({ id: uuidv7(), email: customerEmail,
          name: parsed.customer_name || customerEmail.split("@")[0], password: await bcrypt.hash(parsed.password, 12) }, tx);
        if (!created) throw new ServiceError(409, "Silakan login untuk melanjutkan checkout.");
        buyerId = created.id;
      }
      return ordersRepository.create({ id: uuidv7(), orderNumber: orderNumber(), userId: buyerId,
        customerEmail, pricingTierId: tier.id, amountIdr: tier.priceIdr,
        includedBookIds: tier.includedBookIds, paymentStatus: "PENDING" }, tx);
    });
    try {
      const invoice = await createInvoice({ orderNumber: order.orderNumber, customerEmail: order.customerEmail,
        customerName: parsed.customer_name || profile?.name || order.customerEmail.split("@")[0], customerMobile: parsed.customer_mobile,
        amountIdr: order.amountIdr, tierName: (tier.names as Record<string, string>).id ?? tier.id,
        dashboardUrl: `${appUrl}/dashboard`, mockPayUrl: `${appUrl}/checkout/mock-pay/${order.orderNumber}` });
      await ordersRepository.update(order.id, { mayarInvoiceId: invoice.invoice_id, mayarTransactionId: invoice.transaction_id, paymentLink: invoice.payment_link });
      return { payment_link: invoice.payment_link };
    } catch (error) {
      console.error("Invoice creation failed", error instanceof Error ? error.name : "Unknown error");
      await ordersRepository.closeUnpaid(order.id);
      throw new ServiceError(502, "Pembayaran belum dapat disiapkan. Silakan coba lagi.");
    }
  },
  async processWebhook(input: unknown) {
    const payload = webhookSchema.parse(input);
    const data = payload.data;
    const numbers = [data.orderNumber, data.orderId, data.externalId, data.extraData?.orderNumber].filter((value) => value !== undefined);
    if (new Set(numbers).size > 1) throw new ServiceError(409, "Conflicting order identifiers");
    const invoiceId = data.invoiceId ?? data.id;
    const number = numbers[0];
    let candidates = await ordersRepository.findWebhookOrders({ orderNumber: number, invoiceId, transactionId: data.transactionId });
    if (!candidates.length && !invoiceId && data.productId) candidates = await ordersRepository.findWebhookOrders({ invoiceId: data.productId });
    if (candidates.length > 1) throw new ServiceError(409, "Conflicting payment identifiers");
    const order = candidates[0];
    if (!order) throw new ServiceError(404, "Order not found");
    if ((number && order.orderNumber !== number)
      || (invoiceId && order.mayarInvoiceId !== invoiceId)
      || (data.transactionId && order.mayarTransactionId && data.transactionId !== order.mayarTransactionId)) throw new ServiceError(409, "Conflicting payment identifiers");
    const status = String(data.status ?? payload.event ?? "").toUpperCase();
    if (["PAID", "SETTLED", "SUCCESS", "PAYMENT.RECEIVED", "PAYMENT_SUCCESS"].includes(status)) {
      const result = await markOrderPaid(order.id, { mayarTransactionId: data.transactionId, rawWebhookPayload: payload });
      return { status: "success", order_number: order.orderNumber, granted_books: result.grantedBooks, idempotent: result.idempotent };
    }
    if (["EXPIRED", "FAILED", "CANCELLED"].includes(status)) {
      const expired = await ordersRepository.expireUnpaid(order.id, payload);
      return { status: "received", order_number: order.orderNumber, payment_status: expired?.paymentStatus ?? "PAID" };
    }
    return { status: "received", order_number: order.orderNumber, payment_status: order.paymentStatus };
  },
  async listForAdmin(status?: string) { await authService.requireAdmin(); return ordersRepository.listForAdmin(status ? paymentStatusSchema.parse(status) : undefined); },
  async markPaidForAdmin(id: string) { await authService.requireAdmin(); return markOrderPaid(orderIdSchema.parse(id)); },
  async confirmMockPayment(number: string) {
    if (!isMockMode()) throw new ServiceError(404, "Not found");
    const order = await ordersRepository.getByNumber(orderNumberSchema.parse(number));
    if (!order) throw new ServiceError(404, "Order not found");
    return markOrderPaid(order.id);
  },
};
