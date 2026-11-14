import "server-only";
import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  PUBLIC_LESSON_QUIZ_COLUMNS,
  PUBLIC_RESULT_COLUMNS,
  isResultId,
  toPublicLessonQuizResult,
  toPublicResult,
  type PublicResult,
} from "./publicResult";

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
  if (!error && data) return toPublicResult(data);
  if (error) return null;
  return getPublicLessonQuizResult(admin, id);
});

/** Fallback: an id that is not an exam result may be a completed lesson quiz attempt. */
async function getPublicLessonQuizResult(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  id: string,
): Promise<PublicResult | null> {
  const { data: attempt, error } = await admin
    .from("lesson_quiz_attempts")
    .select(PUBLIC_LESSON_QUIZ_COLUMNS)
    .eq("id", id)
    .eq("status", "completed")
    .maybeSingle();
  if (error || !attempt) return null;
  const { data: lesson } = await admin.from("learn_lessons").select("subject_id").eq("id", attempt.lesson_id).maybeSingle();
  if (!lesson?.subject_id) return null;
  const { data: subject } = await admin.from("subjects").select("name").eq("id", lesson.subject_id).maybeSingle();
  return toPublicLessonQuizResult(attempt, subject?.name);
}
