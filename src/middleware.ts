import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to set security HTTP headers for all responses.
 * Adjust CSP directives as needed for your app's external resources.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https:; frame-ancestors 'none';";
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  return response;
}

// Apply to all routes
export const config = {
  matcher: '/:path*',
};
