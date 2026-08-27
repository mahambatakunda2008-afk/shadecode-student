import { createSupabaseServerClient } from '@/lib/supabase/server';

interface CortexInsight {
  id: string;
  user_id: string;
  insight: string;
  created_at: string;
}

/**
 * Retrieves a single Cortex Insight for a specific user.
 * Enforces an authorization boundary at the service layer by ensuring
 * that only insights belonging to the given `userId` can be fetched.
 *
 * This function serves as a secure API boundary for accessing individual Cortex Insights.
 *
 * @param insightId The ID of the insight to retrieve.
 * @param userId The ID of the user requesting the insight. This is crucial for authorization.
 * @returns The Cortex Insight if found and owned by the user, otherwise null.
 */
export async function getCortexInsightById(
  insightId: string,
  userId: string
): Promise<CortexInsight | null> {
  if (!insightId || !userId) {
    console.error('Invalid input: insightId or userId is missing.');
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient(); // Get the appropriate Supabase client (e.g., service_role or authenticated client)

    const { data, error } = await supabase
      .from('cortex_insights')
      .select('*') // Select all columns for the insight
      .eq('id', insightId) // Filter by the specific insight ID
      .eq('user_id', userId) // CRITICAL: Enforce authorization boundary - filter by the user's own ID
      .maybeSingle(); // Expect zero or one row

    if (error) {
      console.error('Database error fetching Cortex Insight:', error.message);
      // Log detailed error for debugging, but return null to client for security
      return null;
    }

    // If data is null, it means either the insight doesn't exist or doesn't belong to the user
    return data as CortexInsight | null;
  } catch (err) {
    console.error('Unexpected error in getCortexInsightById:', err);
    return null;
  }
}
