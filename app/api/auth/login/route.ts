import { NextResponse } from "next/server";
import { AuthError, CredentialsSignin } from "next-auth";
import { checkRequestOrigin } from "@/lib/http";
import { authService } from "@/lib/modules/auth/auth.service";
import { ServiceError } from "@/lib/shared/errors";

export async function POST(req: Request) {
  const rejected = checkRequestOrigin(req);
  if (rejected) return rejected;
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  try {
    await authService.login({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ServiceError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof CredentialsSignin && err.code === "rate_limited") return NextResponse.json({ error: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." }, { status: 429 });
    if (err instanceof CredentialsSignin && err.code === "login_unavailable") return NextResponse.json({ error: "Login sementara tidak tersedia." }, { status: 503 });
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Alamat email atau password tidak sesuai." }, { status: 401 });
    }
    throw err;
  }
}
