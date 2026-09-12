import { supabase } from '../lib/supabaseClient'; // Assumes a pre-configured Supabase client
import type { Database } from '../database.types'; // Assumes Supabase type definitions

export interface CortexInsight {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  source_task_id?: string | null; // Optional, can link to a specific task
  category?: string | null;       // e.g., 'summary', 'suggestion', 'warning'
}

/**
 * Fetches all Cortex Insights for a specific authenticated user.
 * This function enforces an authorization boundary by only returning
 * insights associated with the provided `userId`.
 *
 * @param userId The ID of the authenticated user.
 * @returns A promise that resolves to an array of CortexInsight objects or null if an error occurs.
 */
export async function getCortexInsightsForUser(userId: string): Promise<CortexInsight[] | null> {
  if (!userId) {
    console.error("Attempted to fetch insights without a valid user ID.");
    return null;
  }

  const { data, error } = await supabase
    .from('cortex_insights')
    .select('id, user_id, content, created_at, source_task_id, category')
    .eq('user_id', userId) // CRITICAL: Enforce user-specific access
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching Cortex Insights:', error.message);
    return null;
  }

  // Map to the public interface, ensuring all fields are present and correctly typed
  return data.map(insight => ({
    id: insight.id,
    user_id: insight.user_id,
    content: insight.content,
    created_at: insight.created_at,
    source_task_id: insight.source_task_id,
    category: insight.category,
  }));
}

/**
 * Creates a new Cortex Insight for a specific user.
 * This function also enforces the user_id association during creation.
 *
 * @param userId The ID of the user creating the insight.
 * @param insightData The data for the new insight (excluding id, user_id, created_at).
 * @returns A promise that resolves to the created CortexInsight object or null.
 */
export async function createCortexInsightForUser(
  userId: string,
  insightData: Omit<CortexInsight, 'id' | 'user_id' | 'created_at'>
): Promise<CortexInsight | null> {
  if (!userId) {
    console.error("Attempted to create insight without a valid user ID.");
    return null;
  }

  const { data, error } = await supabase
    .from('cortex_insights')
    .insert({
      user_id: userId, // CRITICAL: Associate insight with current user
      content: insightData.content,
      source_task_id: insightData.source_task_id || null,
      category: insightData.category || null,
    })
    .select('id, user_id, content, created_at, source_task_id, category')
    .single(); // Assuming we want the single created record

  if (error) {
    console.error('Error creating Cortex Insight:', error.message);
    return null;
  }

  if (data) {
    return {
      id: data.id,
      user_id: data.user_id,
      content: data.content,
      created_at: data.created_at,
      source_task_id: data.source_task_id,
      category: data.category,
    };
  }
  return null;
}