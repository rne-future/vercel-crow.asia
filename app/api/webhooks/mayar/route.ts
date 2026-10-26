import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ordersService } from "@/lib/modules/orders/orders.service";
import { verifyMayarToken, verifyWebhookSignature } from "@/lib/integrations/mayar-webhook";
import { ServiceError } from "@/lib/shared/errors";

export async function POST(req: Request) {
  if (!verifyMayarToken(process.env.MAYAR_WEBHOOK_TOKEN ?? "", req.headers.get("x-callback-token") ?? "")) {
    return NextResponse.json({ error: "Unauthorized: Invalid callback token" }, { status: 401 });
  }
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > 1000000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const signingSecret = process.env.MAYAR_WEBHOOK_SIGNING_SECRET;
  if (signingSecret && !verifyWebhookSignature(raw, signingSecret, req.headers.get("x-webhook-signature") ?? "")) {
    return NextResponse.json({ error: "Unauthorized: Invalid signature" }, { status: 401 });
  }
  try {
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid payload" }, { status: 400 }); }
    return NextResponse.json(await ordersService.processWebhook(payload));
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    if (error instanceof ServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

export const dynamic = "force-dynamic";
