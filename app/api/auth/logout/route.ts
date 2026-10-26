import { NextResponse } from "next/server";
import { authService } from "@/lib/modules/auth/auth.service";
import { checkRequestOrigin } from "@/lib/http";

export async function POST(req: Request) {
  const rejected = checkRequestOrigin(req);
  if (rejected) return rejected;
  await authService.logout();
  return NextResponse.json({ ok: true });
}
