import { createBrowserClient } from '@supabase/ssr'

// Exporting as 'createClient' to match your existing imports in 50+ files
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Keeping this for modern standard
export const createSupabaseBrowserClient = createClient;