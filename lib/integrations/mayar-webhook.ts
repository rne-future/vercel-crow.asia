import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function verifyMayarToken(configured: string, incoming: string): boolean {
  if (!configured || !incoming) return false;
  return timingSafeEqual(createHash("sha256").update(configured).digest(), createHash("sha256").update(incoming).digest());
}

// Optional signing contract for a trusted forwarding gateway, not an assumed Mayar header.
export function verifyWebhookSignature(raw: string, secret: string, signature: string): boolean {
  if (!secret || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac("sha256", secret).update(raw).digest(), Buffer.from(signature.slice(7), "hex"));
}
