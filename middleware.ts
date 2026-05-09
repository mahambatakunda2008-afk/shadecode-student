import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("sb-access-token")?.value ||
    [...req.cookies.getAll()].find(c => c.name.includes("auth-token"))?.value;

  if (req.nextUrl.pathname === "/" && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
