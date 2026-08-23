import { createBrowserClient } from '@supabase/ssr'
import { createClient as createServerSupabaseClient } from '@supabase/supabase-js'

// createClient(): returns a Supabase client appropriate to runtime.
// - On the server (Node / Edge), prefer the service role key when available
//   to enable server-side operations that need elevated permissions.
// - In the browser, return the browser client using the anon key.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Server-side environment detection
  const isServer = typeof window === 'undefined';

  if (isServer) {
    // Use service role key when present (preferred for server operations)
    const key = serviceRoleKey || anonKey;
    return createServerSupabaseClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  // Browser client
  return createBrowserClient(url, anonKey);
}

// Backwards compatibility alias
export const createSupabaseBrowserClient = createClient;