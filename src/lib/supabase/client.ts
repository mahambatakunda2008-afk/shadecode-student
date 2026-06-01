import { createBrowserClient } from "@supabase/ssr";

export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
// Backward-compatible alias — all pages import createClient
export { supabaseBrowser as createClient };
