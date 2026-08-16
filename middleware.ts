import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Edge route guard.
 *
 * Authentication is validated by Supabase on every protected request.
 * Onboarding is validated from the authoritative user_profiles row, not a
 * client-writable cookie. The cookie is retained only as a compatibility
 * hint for older clients; it is never trusted for access control.
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

  return response;
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
