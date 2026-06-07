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
  '/api/auth',      // NextAuth callback routes
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
  // NextAuth — HTTP
  if (req.cookies.get('next-auth.session-token'))         return true;
  // NextAuth — HTTPS (production)
  if (req.cookies.get('__Secure-next-auth.session-token')) return true;

  // Supabase — uncomment if using Supabase Auth
  // if (req.cookies.get('sb-access-token'))               return true;

  // Custom JWT
  // if (req.cookies.get('auth_token'))                    return true;

  // Clerk handles its own middleware — if using Clerk, replace this entire
  // file with Clerk's `authMiddleware` from @clerk/nextjs.

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
