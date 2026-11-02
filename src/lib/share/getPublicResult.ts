import "server-only";
import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_RESULT_COLUMNS, isResultId, toPublicResult, type PublicResult } from "./publicResult";

/**
 * Reads one result through the service role (RLS hides other learners' rows)
 * but returns only the allow-listed projection. Memoised per request so the
 * page and its metadata share a single query.
 */
export const getPublicResult = cache(async (id: string): Promise<PublicResult | null> => {
  if (!isResultId(id)) return null;
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("exam_results").select(PUBLIC_RESULT_COLUMNS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return toPublicResult(data);
});
