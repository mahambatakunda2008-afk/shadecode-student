import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
 * Session validation & refresh
 * ─────────────────────────────
 * Previously this only checked whether an sb-*-auth-token COOKIE was
 * PRESENT, never whether the session it represents was actually still
 * valid. Supabase access tokens expire (1 hour by default); without
 * calling supabase.auth.getUser() here -- which is what actually
 * triggers @supabase/ssr's automatic refresh-token exchange and writes
 * the new tokens back onto the response cookies -- an expired access
 * token cookie just sits there unrefreshed until something finally
 * tries to use it and gets rejected, at which point the user is bounced
 * to login with no warning. This was the root cause of logged-in users
 * being asked to log in again periodically. Calling getUser() here on
 * every request keeps the session alive for as long as the refresh
 * token remains valid, matching Supabase's documented Next.js
 * middleware pattern.
 */

// ── Routes that bypass all checks ────────────────────────────────────────────
const PUBLIC_PREFIXES = [
  '/',              // Landing page
  '/auth',          // Auth pages (login, signup, etc.)
  '/api',           // Route handlers authenticate themselves and return JSON
  '/_next',
  '/favicon',
  '/images',
  '/fonts',
];

function isPublic(path: string): boolean {
  return PUBLIC_PREFIXES.some(p => p === '/' ? path === '/' : path.startsWith(p));
}

// ─────────────────────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Public routes never need a Supabase round-trip.
  if (isPublic(pathname)) return NextResponse.next();

  // Response object that Supabase's cookie adapter can write refreshed
  // tokens onto. Must be created before the Supabase client and returned
  // (or have its cookies copied onto whatever response IS returned) so a
  // refreshed session is actually persisted to the browser.
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // This call is what actually refreshes an expiring session -- not just
  // a cookie-presence check.
  const { data: { user } } = await supabase.auth.getUser();
  const authed = !!user;

  const onboardingComplete = req.cookies.get('onboarding_complete')?.value === '1';
  const onOnboarding       = pathname.startsWith('/onboarding');

  function redirectPreservingSession(destination: string, extraParams?: Record<string, string>) {
    const url = req.nextUrl.clone();
    url.pathname = destination;
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  // Not authenticated → login
  if (!authed) {
    return redirectPreservingSession('/auth/login', { redirect: pathname });
  }

  // Authenticated but onboarding pending → force into /onboarding
  if (!onboardingComplete && !onOnboarding) {
    return redirectPreservingSession('/onboarding');
  }

  // Already onboarded but somehow hitting /onboarding again → dashboard
  if (onboardingComplete && onOnboarding) {
    return redirectPreservingSession('/dashboard');
  }

  return response;
}

export const config = {
  matcher: [
    // Match all except: api/auth callbacks, Next.js internals, static files
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
