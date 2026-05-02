import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
// Using the service role key for direct database writes without RLS limitations
// (Ensure SUPABASE_SERVICE_ROLE_KEY is secure and only used server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Supabase environment variables are not set. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  // Depending on the environment, you might want to throw an error or handle gracefully
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Stores a new insight in the database.
 * Assumes the 'insights' table has columns: 'id', 'user_id', 'insight_text', 'generated_at'.
 *
 * @param {string} userId - The ID of the user for whom the insight was generated.
 * @param {string} insightText - The content of the insight.
 * @returns {Promise<{data: any | null, error: Error | null}>} The result of the insert operation.
 */
export async function storeInsight(userId, insightText) {
  if (!userId || !insightText) {
    const errorMsg = "Cortex: userId and insightText are required to store an insight.";
    console.error(errorMsg);
    return { data: null, error: new Error(errorMsg) };
  }

  const { data, error } = await supabase
    .from('insights')
    .insert([
      { user_id: userId, insight_text: insightText, generated_at: new Date().toISOString() }
    ])
    .select(); // Use .select() to return the inserted data

  if (error) {
    console.error("Cortex: Error storing insight for user", userId, ":", error);
    return { data: null, error };
  }

  console.log("Cortex: Insight stored successfully for user", userId, ":", data);
  return { data, error: null };
}

/**
 * Fetches all insights for a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<{data: any[] | null, error: Error | null}>} The list of insights or an error.
 */
export async function getInsightsForUser(userId) {
  if (!userId) {
    const errorMsg = "Cortex: userId is required to fetch insights.";
    console.error(errorMsg);
    return { data: null, error: new Error(errorMsg) };
  }

  const { data, error } = await supabase
    .from('insights')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false });

  if (error) {
    console.error("Cortex: Error fetching insights for user", userId, ":", error);
    return { data: null, error };
  }

  return { data, error: null };
}