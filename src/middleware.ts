import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware is intentionally tiny. It must never be responsible for making
 * the first document wait on Supabase. Authentication is enforced on protected
 * routes, while the public root is allowed to render immediately.
 */
const PUBLIC_PREFIXES = ['/auth', '/api', '/_next', '/favicon', '/images', '/fonts'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // The landing page is deliberately outside the auth boot path. This is the
  // first document loaded by the browser and must render deterministically.
  if (pathname === '/' || isPublic(pathname)) {
    return NextResponse.next();
  }

  // Protected application routes are still handled by their server/client auth
  // boundaries. Do not perform Supabase network calls here: a stalled auth
  // request must never turn into a frozen Next.js loading screen.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
