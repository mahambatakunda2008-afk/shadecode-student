import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const isLoggedIn = req.cookies.get("isLoggedIn")?.value;

  if (req.nextUrl.pathname === "/" && isLoggedIn === "1") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
