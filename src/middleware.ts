import { NextResponse } from 'next/server';

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

import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Edge route guard.
 *
 * Authentication is validated by Supabase on every protected request.
 * Onboarding is validated from the authoritative user_profiles row, not a
 * client-writable cookie. The cookie is retained only as a compatibility
 * hint for older clients; it is never trusted for access control.
 *
 * IMPORTANT: this file must live at src/middleware.ts, not project-root
 * middleware.ts. This app uses src/app/ (App Router inside src/), and per
 * Next.js 16 convention, middleware only runs from src/middleware.ts in
 * that layout -- a root-level middleware.ts alongside a src/ directory is
 * not the file Next.js actually loads. Found 2026-08-19 while
 * investigating a syntax error in the root file: this auth/onboarding
 * logic had a real chance of never actually being enforced at the edge,
 * with only client-side page-level redirects as the real gate. Consolidated
 * here (the correct location) and the root duplicate removed.
 */

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

  const { data: { user } } = await supabase.auth.getUser();

  function redirectPreservingSession(destination: string, extraParams?: Record<string, string>) {
    const url = req.nextUrl.clone();
    url.pathname = destination;
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    // Apply security headers to redirect response
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  if (!user) {
    return redirectPreservingSession('/auth/login', { redirect: pathname });
  }

  // Admins are platform operators, not student accounts. They must not be
  // blocked by the student onboarding gate.
  const { data: adminCheck, error: adminError } = await supabase.rpc('has_role', {
    user_id: user.id,
    role_name: 'admin',
  });

  if (!adminError && Boolean(adminCheck)) {
    return response;
  }

  // Authoritative onboarding state. A forged localStorage value or a
  // client-written onboarding_complete cookie cannot bypass this check.
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle();

  // Fail closed for protected application routes when the account state
  // cannot be established. This prevents an RLS/database failure from
  // accidentally becoming an onboarding bypass.
  if (profileError) {
    console.error('[middleware] onboarding profile check failed:', profileError.message);
    return redirectPreservingSession('/auth/login', { error: 'profile_check' });
  }

  const onboardingComplete = profile?.onboarding_completed === true;
  const onOnboarding = pathname.startsWith('/onboarding');

  if (!onboardingComplete && !onOnboarding) {
    return redirectPreservingSession('/onboarding');
  }

  if (onboardingComplete && onOnboarding) {
    return redirectPreservingSession('/dashboard');
  }

  // Apply security headers before returning response
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
