import { authService } from "@/lib/modules/auth/auth.service";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { checkRequestOrigin } from "@/lib/http";
import { readerService } from "@/lib/modules/reader/reader.service";
import { ServiceError } from "@/lib/shared/errors";

export async function POST(req: Request) {
  const rejected = checkRequestOrigin(req);
  if (rejected) return rejected;
  try {
    return NextResponse.json(await readerService.toggleChecklist(await req.json().catch(() => null), await authService.sessionUser()));
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    if (error instanceof ServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
