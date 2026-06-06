import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware responsibilities:
 * 1. Refresh Supabase auth session
 * 2. Redirect unauthenticated users away from protected routes
 * 3. Redirect authenticated users who haven't completed onboarding
 * 4. Redirect already-onboarded users away from /onboarding
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do NOT use getSession() here; use getUser() for security
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ─── Public routes (no auth required) ─────────────────────────────────────
  const isPublicRoute =
    pathname.startsWith("/auth") ||
    pathname === "/" ||
    pathname.startsWith("/api/");

  if (isPublicRoute) {
    return supabaseResponse;
  }

  // ─── Not authenticated → send to login ────────────────────────────────────
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    return NextResponse.redirect(loginUrl);
  }

  // ─── Authenticated — check onboarding ─────────────────────────────────────

  // Don't check onboarding on the onboarding route itself
  if (pathname === "/onboarding") {
    return supabaseResponse;
  }

  // Only gate the main app routes
  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/exam-sim") ||
    pathname.startsWith("/focus") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/learn") ||
    pathname.startsWith("/settings");

  if (isAppRoute) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();

    if (!profile?.onboarding_completed) {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = "/onboarding";
      return NextResponse.redirect(onboardingUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
