import { createBrowserClient } from '@supabase/ssr'
import { createClient as createServerSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_FETCH_TIMEOUT_MS = 10_000;

function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  if (typeof AbortController === 'undefined') return fetch(input, init);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS);
  if (init.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

// Browser Supabase requests are bounded so a stalled auth/network request
// cannot leave an entire page spinning forever.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isServer = typeof window === 'undefined';

  if (isServer) {
    const key = serviceRoleKey || anonKey;
    return createServerSupabaseClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return createBrowserClient(url, anonKey, {
    global: { fetch: fetchWithTimeout },
  });
}

export const createSupabaseBrowserClient = createClient;
