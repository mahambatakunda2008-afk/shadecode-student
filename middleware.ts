import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Middleware — edge-runtime route guard
 * ──────────────────────────────────────
 * State machine:
 *
 *   Unauthenticated              → /auth/login
 *   Authenticated, not onboarded → /onboarding   (unless already there)
 *   Authenticated, onboarded     → /dashboard    (if they hit /onboarding again)
 *   Everything else              → pass through
 *
 * Auth detection
 * ──────────────
 * Uses Supabase SSR client to validate session tokens.
 */

// ── Routes that bypass all checks ────────────────────────────────────────────
const PUBLIC_PREFIXES = [
  '/auth',
  '/api/auth',
  '/_next',
  '/favicon',
  '/images',
  '/fonts',
];

function isPublic(path: string): boolean {
  return PUBLIC_PREFIXES.some(p => path.startsWith(p));
}

// ─────────────────────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
      },
    }
  );

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const onboardingComplete = req.cookies.get('onboarding_complete')?.value === '1';
  const onOnboarding = pathname.startsWith('/onboarding');

  // Not authenticated → /auth/login
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
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
