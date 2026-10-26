import { NextResponse } from "next/server";
import { AuthError } from "next-auth";
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
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Alamat email atau password tidak sesuai." }, { status: 401 });
    }
    throw err;
  }
}
