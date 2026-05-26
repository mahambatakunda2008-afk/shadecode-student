import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // We must create a response object upfront so we can mutate cookies on it.
  // Supabase middleware needs to write the refreshed auth token back to the
  // browser. Without this, sessions silently expire mid-use.
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read all cookies from the incoming request.
        getAll() {
          return req.cookies.getAll();
        },
        // Write refreshed cookies to BOTH the request (for downstream
        // Server Components) and the response (for the browser).
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            response = NextResponse.next({
              request: { headers: req.headers },
            });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANT: Always use getUser() in middleware, never getSession().
  // getUser() validates the JWT against the Supabase Auth server.
  // getSession() only reads the cookie and cannot detect expired/revoked tokens.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Preserve existing behavior: authenticated users visiting "/" go to dashboard.
  if (req.nextUrl.pathname === "/" && user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Always return the response — it carries the refreshed auth cookie
  // even on routes where no redirect happens.
  return response;
}

export const config = {
  matcher: [
    /*
     * Match only "/". Exclude _next/static, _next/image, favicon, and public
     * assets so middleware doesn't run on static file requests.
     * Expand this array if you add protected routes in the future.
     */
    "/",
  ],
};
