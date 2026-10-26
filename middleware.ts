import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  const readerLocale = request.nextUrl.pathname.startsWith("/read/") ? request.nextUrl.pathname.split("/")[3] : undefined;
  const locale = readerLocale ?? request.nextUrl.searchParams.get("locale") ?? request.cookies.get("crow:locale")?.value ?? "";
  headers.set("x-crow-locale", locale.length <= 16 && /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) ? locale : "");
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/", "/login", "/dashboard", "/checkout/:path*", "/read/:path*", "/admin/:path*"] };
