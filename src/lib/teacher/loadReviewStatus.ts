import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { summarizeReviews, type ReviewStatus } from "./reviewStatus";

/**
 * Review status for learner-facing content. Learners cannot read teacher reviews directly, so this uses the
 * server-side admin client and returns only the summary. If it cannot be loaded, nothing is shown as verified.
 */
export async function loadReviewStatus(ids: string[]): Promise<Map<string, ReviewStatus>> {
  const unique = [...new Set(ids)].slice(0, 200);
  if (!unique.length) return new Map();
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return new Map();
    const { data, error } = await admin.from("content_reviews").select("question_id,verdict").in("question_id", unique);
    if (error || !data) return new Map();
    return summarizeReviews(data);
  } catch {
    return new Map();
  }
}
