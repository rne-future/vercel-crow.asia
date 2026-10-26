import { z } from "zod";

const invoiceResponseSchema = z.object({ data: z.object({
  id: z.string().min(1).max(128),
  link: z.url().refine((value) => new URL(value).protocol === "https:"),
  transactionId: z.string().min(1).max(128).optional(),
}) });

export function isMockMode(): boolean {
  const key = process.env.MAYAR_API_KEY ?? "";
  return process.env.NODE_ENV !== "production" && (key === "" || key.startsWith("mock_"));
}

export function baseUrl(): string {
  return (process.env.MAYAR_BASE_URL || "https://api.mayar.id/hl/v2").replace(/\/$/, "");
}

export interface InvoiceResult {
  invoice_id: string;
  payment_link: string;
  transaction_id?: string;
}

export async function createInvoice(order: {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerMobile: string;
  amountIdr: number;
  tierName: string;
  dashboardUrl: string;
  mockPayUrl: string;
}): Promise<InvoiceResult> {
  if (isMockMode()) {
    const rand = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toLowerCase();
    return { invoice_id: `inv_mock_${rand}`, payment_link: order.mockPayUrl };
  }

  const apiKey = process.env.MAYAR_API_KEY!;
  if (!apiKey || apiKey.startsWith("mock_")) throw new Error("Mayar is not configured");
  const res = await fetch(`${baseUrl()}/invoices/create`, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name: order.customerName,
      email: order.customerEmail,
      items: [{ quantity: 1, rate: order.amountIdr, description: order.tierName }],
      description: order.tierName,
      mobile: order.customerMobile,
      extraData: { orderNumber: order.orderNumber },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gagal membuat invoice Mayar (${res.status})`);
  }
  const { data } = invoiceResponseSchema.parse(await res.json());
  return { invoice_id: data.id, payment_link: data.link, transaction_id: data.transactionId };
}
