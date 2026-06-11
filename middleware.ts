import { NextResponse }   from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware — edge-runtime route guard
 * ──────────────────────────────────────
 * State machine:
 *
 *   Unauthenticated              → /login
 *   Authenticated, not onboarded → /onboarding   (unless already there)
 *   Authenticated, onboarded     → /dashboard    (if they hit /onboarding again)
 *   Everything else              → pass through
 *
 * Auth detection
 * ──────────────
 * Checks session cookies set by your auth provider.
 * Uncomment the adapter that matches your stack.
 */

// ── Routes that bypass all checks ────────────────────────────────────────────
const PUBLIC_PREFIXES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/api',           // Route handlers authenticate themselves and return JSON
  '/_next',
  '/favicon',
  '/images',
  '/fonts',
];

function isPublic(path: string): boolean {
  return PUBLIC_PREFIXES.some(p => path.startsWith(p));
}

// ── Auth check (edge-compatible, no DB) ───────────────────────────────────────
function hasSession(req: NextRequest): boolean {
  // Supabase Auth (@supabase/ssr) — cookies are named
  // `sb-<project-ref>-auth-token`, optionally chunked (`.0`, `.1`, ...).
  for (const cookie of req.cookies.getAll()) {
    if (/^sb-.+-auth-token(\.\d+)?$/.test(cookie.name) && cookie.value) {
      return true;
    }
  }

  // Legacy NextAuth fallbacks
  if (req.cookies.get('next-auth.session-token'))          return true;
  if (req.cookies.get('__Secure-next-auth.session-token')) return true;

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const authed             = hasSession(req);
  const onboardingComplete = req.cookies.get('onboarding_complete')?.value === '1';
  const onOnboarding       = pathname.startsWith('/onboarding');

  // Not authenticated → login
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated but onboarding pending → force into /onboarding
  if (!onboardingComplete && !onOnboarding) {
    const url = req.nextUrl.clone();
    url.pathname = '/onboarding';
    return NextResponse.redirect(url);
  }

  // Already onboarded but somehow hitting /onboarding again → dashboard
  if (onboardingComplete && onOnboarding) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all except: api/auth callbacks, Next.js internals, static files
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
