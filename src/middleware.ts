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
 * Edge route guard. Authentication is validated by Supabase on every
 * protected request. The root landing page is special: it remains public for
 * signed-out visitors, but an authenticated student is redirected to the
 * dashboard so the marketing page is never the app home.
 */
const AUTH_TIMEOUT_MS = 6000;
const PROFILE_CHECK_TIMEOUT_MS = 4000;

const PUBLIC_PREFIXES = [
  '/auth',
  '/api',
  '/_next',
  '/favicon',
  '/images',
  '/fonts',
];

function isPublic(path: string): boolean {
  return PUBLIC_PREFIXES.some(p => path.startsWith(p));
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const isRoot = pathname === '/';

  // Everything except `/` can use the cheap public bypass. `/` needs an
  // identity check because its response differs intentionally for anonymous
  // and authenticated visitors.
  if (!isRoot && isPublic(pathname)) return NextResponse.next();

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
    if (err instanceof EdgeTimeoutError) {
      console.error('[middleware] auth.getUser() timed out:', err.message);
    }
    // `/` is public when identity cannot be established. Protected routes
    // still fail closed to login.
    if (isRoot) return applySecurityHeaders(NextResponse.next());
    return redirectPreservingSession('/auth/login', { redirect: pathname });
  }

  if (!user) {
    if (isRoot) return applySecurityHeaders(response);
    return redirectPreservingSession('/auth/login', { redirect: pathname });
  }

  // This is the critical landing-page rule: authenticated users never enter
  // the public marketing shell, whether they typed `/`, clicked a stale
  // bookmark, or followed an old app-home link.
  if (isRoot) {
    return redirectPreservingSession('/dashboard');
  }

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

  if (adminCheck === true) {
    return response;
  }

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
