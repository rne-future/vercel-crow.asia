import { isIP } from "node:net";
import { ServiceError } from "@/lib/shared/errors";

export function resolveLoginSource(headers: Pick<Headers, "get">): string {
  if (process.env.VERCEL !== "1") {
    if (process.env.NODE_ENV !== "production") return "local-development";
    throw new ServiceError(503, "Login sementara tidak tersedia.", "login_unavailable");
  }
  const ip = headers.get("x-vercel-forwarded-for")?.trim() ?? "";
  if (ip.includes("%") || !isIP(ip)) throw new ServiceError(503, "Login sementara tidak tersedia.", "login_unavailable");
  return isIP(ip) === 6 ? new URL(`http://[${ip}]`).hostname.slice(1, -1) : ip;
}
