import { NextResponse } from "next/server";

export function checkRequestOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const expected = new URL(process.env.APP_URL || req.url).origin;
  if (origin !== expected) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}
