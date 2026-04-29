import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for server-side operations.
 * This client uses the Supabase service role key, granting elevated permissions
 * for server-to-server interactions, such as saving insights or managing challenges
 * outside of a direct user request context.
 * @returns {import('@supabase/supabase-js').SupabaseClient} A configured Supabase client instance.
 * @throws {Error} If required Supabase environment variables are missing.
 */
export function createServerSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false, // Server-side client doesn't need to persist user sessions
      },
    }
  );
}
