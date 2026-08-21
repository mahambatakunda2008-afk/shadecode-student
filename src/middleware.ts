import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const securityHeaders: Record<string, string> = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self';",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

function applySecurityHeaders(res: NextResponse) {
  for (const [key, value] of Object.entries(securityHeaders)) {
    res.headers.set(key, value);
  }
  return res;
}

/**
 * Rejects with a distinguishable error after `ms` if `promise` hasn't
 * settled -- Edge-runtime-safe (setTimeout is supported there), no
 * external dependency.
 */
class EdgeTimeoutError extends Error {}
function withEdgeTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new EdgeTimeoutError(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/**
 * Edge route guard.
 *
 * Authentication is validated by Supabase on every protected request.
 * Onboarding is validated from the authoritative user_profiles row, not a
 * client-writable cookie. The cookie is retained only as a compatibility
 * hint for older clients; it is never trusted for access control.
 *
 * IMPORTANT: this file must live at src/middleware.ts, not project-root
 * middleware.ts -- see the 2026-08-19 fix that moved it here for why.
 *
 * CRITICAL, fixed 2026-08-19 (same day, a few hours later): the first
 * version of this file made three sequential, un-timed-out Supabase calls
 * (auth.getUser(), then rpc('has_role'), then a user_profiles select) on
 * literally every protected page load, blocking on the Edge before the
 * page could even start rendering. Next.js middleware blocks the entire
 * response until it resolves -- so any transient Supabase slowness meant
 * every page hung indefinitely with no way for the browser's own loading
 * state to ever resolve. Confirmed via a direct owner report ("ALL pages
 * hanging on loading state forever") within hours of that version
 * shipping. Fixed by: parallelizing the two checks that don't depend on
 * each other, and wrapping every Supabase call in a hard timeout with an
 * explicit, intentional fallback -- this file must never be able to hang
 * the entire app again, regardless of Supabase's own availability.
 *
 * Timeout fallback philosophy: auth itself still fails closed (a timed-out
 * identity check redirects to login, same as an explicit auth failure --
 * letting unverified traffic through isn't an option). The onboarding/
 * admin-role check fails OPEN on timeout or error: the user is already
 * known-authenticated by that point, so the worst case of "let the request
 * through without perfect onboarding enforcement" is a far smaller harm
 * than "the entire app is unusable because Supabase had a slow moment."
 */

const AUTH_TIMEOUT_MS = 6000;
const PROFILE_CHECK_TIMEOUT_MS = 4000;

const PUBLIC_PREFIXES = [
  '/',
  '/auth',
  '/api',
  '/_next',
  '/favicon',
  '/images',
  '/fonts',
];

function isPublic(path: string): boolean {
  return PUBLIC_PREFIXES.some(p => p === '/' ? path === '/' : path.startsWith(p));
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

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

  function redirectPreservingSession(destination: string, extraParams?: Record<string, string>) {
    const url = req.nextUrl.clone();
    url.pathname = destination;
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  let user;
  try {
    const result = await withEdgeTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS);
    user = result.data.user;
  } catch (err) {
    // Timed out or errored -- can't confirm identity, so this still fails
    // closed (redirect to login), but it is now a BOUNDED wait, not an
    // indefinite hang. That's the actual fix.
    if (err instanceof EdgeTimeoutError) {
      console.error('[middleware] auth.getUser() timed out:', err.message);
    }
    return redirectPreservingSession('/auth/login', { redirect: pathname });
  }

  if (!user) {
    return redirectPreservingSession('/auth/login', { redirect: pathname });
  }

  // Admin-role and onboarding-state checks run in parallel (previously
  // sequential) and are bounded by a single shared timeout. Both depend
  // only on the already-resolved user.id, not on each other.
  let adminCheck: boolean | null = null;
  let profile: { onboarding_completed: boolean | null } | null = null;
  let checksFailed = false;

  try {
    const [adminResult, profileResult] = await withEdgeTimeout(
      Promise.all([
        supabase.rpc('has_role', { user_id: user.id, role_name: 'admin' }),
        supabase.from('user_profiles').select('onboarding_completed').eq('user_id', user.id).maybeSingle(),
      ]),
      PROFILE_CHECK_TIMEOUT_MS
    );
    if (!adminResult.error) adminCheck = Boolean(adminResult.data);
    if (!profileResult.error) profile = profileResult.data;
    else checksFailed = true;
  } catch (err) {
    checksFailed = true;
    if (err instanceof EdgeTimeoutError) {
      console.error('[middleware] admin/onboarding checks timed out:', err.message);
    }
  }

  // Admins are platform operators, not student accounts. They must not be
  // blocked by the student onboarding gate.
  if (adminCheck === true) {
    return response;
  }

  // Fail OPEN here, deliberately, unlike the auth check above: the user is
  // already verified-authenticated at this point, so if we can't establish
  // onboarding state (timeout, RLS issue, transient DB error), letting the
  // request through is a far smaller harm than hanging or blocking the
  // entire app. Onboarding enforcement is a UX nicety on top of a working
  // app, not a security boundary the way authentication is.
  if (checksFailed) {
    applySecurityHeaders(response);
    return response;
  }

  const onboardingComplete = profile?.onboarding_completed === true;
  const onOnboarding = pathname.startsWith('/onboarding');

  if (!onboardingComplete && !onOnboarding) {
    return redirectPreservingSession('/onboarding');
  }

  if (onboardingComplete && onOnboarding) {
    return redirectPreservingSession('/dashboard');
  }

  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
