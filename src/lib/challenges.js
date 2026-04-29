import { createClient } from '@supabase/supabase-js';

// Helper to get Supabase client for server-side operations
// Assumes this file is used in a server-side context (API routes, Server Components)
// where environment variables are available.
function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using anon key for public read access

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are not set.');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Fetches today's daily challenge from the database.
 * @returns {Promise<object | null>} The challenge object if found, otherwise null.
 */
export async function getTodayChallenge() {
  const supabase = getSupabaseServerClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  const { data: challenge, error } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('date', today)
    .single();

  // PGRST116 is the error code for 'No rows found' when using .single()
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching daily challenge in lib:', error);
    throw new Error('Failed to fetch daily challenge.');
  }

  return challenge || null;
}

/**
 * Creates a new daily challenge in the database.
 * This function would typically be used by an admin or a scheduled job.
 * @param {string} title - The title of the challenge.
 * @param {string} description - The description of the challenge.
 * @param {number} xp_reward - The XP awarded upon completion.
 * @param {string} date - The date for the challenge (YYYY-MM-DD).
 * @param {string} type - The type of challenge (e.g., 'daily', 'weekly').
 * @returns {Promise<object>} The created challenge object.
 */
export async function createDailyChallenge(title, description, xp_reward, date, type = 'daily') {
  const supabase = getSupabaseServerClient(); // Ensure appropriate key for write operations (e.g., service_role key in production for admin tasks)
  const { data, error } = await supabase
    .from('daily_challenges')
    .insert({ title, description, xp_reward, date, type })
    .select(); // Return the inserted data

  if (error) {
    console.error('Error creating daily challenge:', error);
    throw new Error('Failed to create daily challenge.');
  }

  return data[0]; // Assuming only one record is inserted
}
