import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lessonItem, lessonReviewId, parseLessonReviewId, type LessonRow, type ReviewItem } from "./reviewItems";

const LESSON_COLUMNS = "id,title,topic,subject,blocks";

export async function loadLessonItems(supabase: SupabaseClient): Promise<ReviewItem[]> {
  const { data, error } = await supabase
    .from("lesson_library")
    .select(LESSON_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error || !data) return [];
  return (data as LessonRow[]).map(lessonItem);
}

/** True when this exact lesson content (id and hash) still exists, so reviews can never attach to stale or invented content. */
export async function lessonReviewTargetExists(supabase: SupabaseClient, reviewId: string): Promise<boolean> {
  const lessonId = parseLessonReviewId(reviewId);
  if (!lessonId) return false;
  const { data } = await supabase.from("lesson_library").select(LESSON_COLUMNS).eq("id", lessonId).maybeSingle();
  return !!data && lessonReviewId(data as LessonRow) === reviewId;
}
