import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Extract the Bearer token from an Authorization header.
 * Was duplicated identically in learn/route.ts and learn/quiz/route.ts;
 * centralizing here so future routes reuse it instead of copy-pasting.
 */
export function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

/**
 * Verify the request's Bearer token against Supabase Auth and return the
 * real, server-verified user -- never trust a client-supplied userId in a
 * request body, which anyone can set to any value they want.
 */
export async function getVerifiedUser(req: Request) {
  const token = getBearerToken(req);
  if (!token) return { user: null, error: "Missing Authorization header." };

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { user: null, error: "Invalid or expired session." };
  return { user, error: null };
}
