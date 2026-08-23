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
  for (const [key, value] of Object.entries(securityHeaders)) res.headers.set(key, value);
  return res;
}

class EdgeTimeoutError extends Error {}
function withEdgeTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new EdgeTimeoutError(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/**
 * Middleware is intentionally kept on the critical path as small as possible.
 * It owns authentication/security, not application data loading.
 *
 * Previous versions performed admin + onboarding database queries for every
 * authenticated navigation. A slow Supabase RPC could therefore leave the
 * Next.js loading UI visible indefinitely before the actual page even began
 * rendering. Those checks now happen in the application layer, where they
 * cannot block the initial document response.
 */
const AUTH_TIMEOUT_MS = 6000;
const PUBLIC_PREFIXES = ['/auth', '/api', '/_next', '/favicon', '/images', '/fonts'];

function isPublic(path: string): boolean {
  return PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const isRoot = pathname === '/';

  if (!isRoot && isPublic(pathname)) return NextResponse.next();

  let response = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  function redirectPreservingSession(destination: string, extraParams?: Record<string, string>) {
    const url = req.nextUrl.clone();
    url.pathname = destination;
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return applySecurityHeaders(redirectResponse);
  }

  try {
    const { data: { user } } = await withEdgeTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS);

    if (!user) {
      if (isRoot) return applySecurityHeaders(response);
      return redirectPreservingSession('/auth/login', { redirect: pathname });
    }

    // Authenticated root launches directly into the app. No profile/RPC query
    // is allowed to delay this redirect.
    if (isRoot) return redirectPreservingSession('/dashboard');

    return applySecurityHeaders(response);
  } catch (err) {
    console.error('[middleware] authentication check failed:', err);
    if (isRoot) return applySecurityHeaders(NextResponse.next());
    return redirectPreservingSession('/auth/login', { redirect: pathname, error: 'session_check' });
  }
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
