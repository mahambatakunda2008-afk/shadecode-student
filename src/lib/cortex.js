import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with the service role key for Cortex operations.
// This key allows bypassing Row Level Security, enabling Cortex to write insights for any user.
// IMPORTANT: This key MUST NOT be exposed client-side. It should only be used in server-side code (e.g., API routes, lib functions called by API routes).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Supabase URL or Service Role Key is not set in environment variables.');
  // In a production app, you might throw an error or handle this more robustly.
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Generates and stores a simple insight for a given user.
 * This is a placeholder function and will be improved to generate dynamic insights.
 * @param {string} userId The ID of the user for whom the insight is generated.
 * @param {string} [subjectId] Optional ID of the subject related to the insight.
 * @returns {Promise<object | null>} The created insight object or null if an error occurred.
 */
export async function generateInsight(userId, subjectId = null) {
  if (!userId) {
    console.error('generateInsight: userId is required.');
    return null;
  }

  // Placeholder insight content
  const insightContent = "Cortex observed your first interaction. Keep up the great work!";

  try {
    const { data, error } = await supabaseAdmin
      .from('insights')
      .insert({
        user_id: userId,
        subject_id: subjectId,
        content: insightContent,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting insight with service role key:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unhandled error in generateInsight:', err);
    return null;
  }
}