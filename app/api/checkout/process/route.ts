import { authService } from "@/lib/modules/auth/auth.service";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { checkRequestOrigin } from "@/lib/http";
import { ordersService } from "@/lib/modules/orders/orders.service";
import { ServiceError } from "@/lib/shared/errors";

export async function POST(req: Request) {
  const rejected = checkRequestOrigin(req);
  if (rejected) return rejected;
  try {
    const appUrl = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, "");
    return NextResponse.json(await ordersService.checkout(await req.json().catch(() => null), await authService.sessionUser(), appUrl));
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Data checkout tidak valid." }, { status: 400 });
    if (error instanceof ServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
