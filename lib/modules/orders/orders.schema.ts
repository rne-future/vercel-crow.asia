import { z } from "zod";
import { resourceIdSchema } from "@/lib/modules/books/books.schema";
import { emailSchema } from "@/lib/modules/auth/auth.schema";

export const checkoutSchema = z.object({
  pricing_tier_id: resourceIdSchema,
  customer_email: emailSchema,
  customer_name: z.string().trim().max(120).nullable().optional(),
  customer_mobile: z.string().trim().regex(/^\+?[0-9]{8,15}$/),
  password: z.string().min(8).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72).optional(),
}).strict();

export const webhookSchema = z.object({
  event: z.string().max(128).optional(),
  data: z.object({
    invoiceId: z.string().min(1).max(128).optional(), id: z.string().min(1).max(128).optional(),
    orderNumber: z.string().min(1).max(64).optional(), orderId: z.string().min(1).max(64).optional(),
    externalId: z.string().min(1).max(64).optional(), status: z.string().max(128).optional(),
    transactionId: z.string().min(1).max(128).optional(), productId: z.string().min(1).max(128).optional(),
    extraData: z.object({ orderNumber: z.string().min(1).max(64).optional() }).passthrough().optional(),
  }).passthrough(),
}).passthrough();
export const orderIdSchema = z.uuid();
export const paymentStatusSchema = z.enum(["PENDING", "PAID", "CLOSED", "EXPIRED"]);
export const orderNumberSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9-]+$/);
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type WebhookPayload = z.infer<typeof webhookSchema>;
