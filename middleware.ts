import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // Check for Supabase auth token cookie
  const hasSession = [...req.cookies.getAll()].some(c => 
    c.name.includes("auth-token") && c.value.length > 10
  );

  if (req.nextUrl.pathname === "/" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
