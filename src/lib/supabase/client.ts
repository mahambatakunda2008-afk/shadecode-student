import { createBrowserClient } from '@supabase/ssr'
import { createClient as createServerSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_BROWSER_TIMEOUT_MS = 15_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const upstreamSignal = init?.signal;
  let upstreamAbort: (() => void) | undefined;

  if (upstreamSignal) {
    if (upstreamSignal.aborted) controller.abort(upstreamSignal.reason);
    else {
      upstreamAbort = () => controller.abort(upstreamSignal.reason);
      upstreamSignal.addEventListener('abort', upstreamAbort, { once: true });
    }
  }

  const timeout = window.setTimeout(
    () => controller.abort(new DOMException('Supabase request timed out', 'TimeoutError')),
    SUPABASE_BROWSER_TIMEOUT_MS,
  );

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    window.clearTimeout(timeout);
    if (upstreamSignal && upstreamAbort) upstreamSignal.removeEventListener('abort', upstreamAbort);
  });
}

// createClient(): returns a Supabase client appropriate to runtime.
// - On the server (Node / Edge), prefer the service role key when available
//   to enable server-side operations that need elevated permissions.
// - In the browser, return the browser client using the anon key.
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
