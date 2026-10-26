import { authService } from "@/lib/modules/auth/auth.service";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { readerService } from "@/lib/modules/reader/reader.service";
import { ServiceError } from "@/lib/shared/errors";

export async function GET(_req: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const url = await readerService.getPdfUrl((await params).bookId, await authService.sessionUser());
    return new NextResponse(null, { status: 302, headers: { ...headers, Location: url } });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid book" }, { status: 400, headers });
    if (error instanceof ServiceError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    throw error;
  }
}
