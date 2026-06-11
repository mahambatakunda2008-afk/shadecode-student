/**
 * /lib/cortex/runtime/insights.ts
 *
 * Canonical access layer for Cortex insights.
 *
 * Storage convention (single source of truth):
 *   table:  cortex_insights
 *   column: insight   (the human-readable insight text)
 *
 * All readers and writers in the app should go through this module (or use the
 * same { user_id, insight } shape) instead of the historical, divergent
 * `insights.content` / `insights.insight_text` conventions.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveDeterministicInsight } from "@/lib/cortex/runtime/templates";
import type { CortexInsightContext } from "@/lib/cortex/types";

export const CORTEX_INSIGHTS_TABLE = "cortex_insights";

export interface CanonicalInsight {
  id: string;
  insight: string;
  created_at: string;
}

/**
 * Resolve a deterministic insight string from a behavioral context, without
 * touching the database. Returns null when no template applies.
 */
export function resolveInsight(context: CortexInsightContext): string | null {
  return resolveDeterministicInsight(context);
}

/**
 * Fetch a user's insights, newest first.
 */
export async function listInsights(
  userId: string,
  limit = 100
): Promise<CanonicalInsight[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from(CORTEX_INSIGHTS_TABLE)
    .select("id, insight, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CanonicalInsight[];
}

/**
 * Persist a single insight for a user.
 */
export async function createInsight(
  userId: string,
  insight: string
): Promise<CanonicalInsight> {
  const text = insight.trim();
  if (!text) {
    throw new Error("insight text is required");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from(CORTEX_INSIGHTS_TABLE)
    .insert({ user_id: userId, insight: text })
    .select("id, insight, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CanonicalInsight;
}
