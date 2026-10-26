import { authService } from "@/lib/modules/auth/auth.service";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { readerService } from "@/lib/modules/reader/reader.service";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  try {
    const results = await readerService.search({ q: params.get("q") ?? "", locale: params.get("locale") ?? "id",
      register: params.get("register") ?? undefined, reg: params.get("reg") ?? undefined }, await authService.sessionUser());
    return NextResponse.json(results, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    throw error;
  }
}
