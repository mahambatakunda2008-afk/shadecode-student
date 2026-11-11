import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lessonItem, lessonReviewId, parseLessonReviewId, tutorialItem, type LessonRow, type ReviewItem, type TutorialItemRow } from "./reviewItems";
import { parseTutorialReviewId, tutorialReviewId } from "./tutorial";

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

const TUTORIAL_COLUMNS = "id,title,subject,topic,blocks,author_id";

/** Tutorials waiting for review. Authors never review their own work. */
export async function loadTutorialItems(supabase: SupabaseClient, reviewerId: string): Promise<ReviewItem[]> {
  const { data, error } = await supabase
    .from("teacher_tutorials")
    .select(TUTORIAL_COLUMNS)
    .eq("status", "in_review")
    .neq("author_id", reviewerId)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return (data as (TutorialItemRow & { author_id: string })[]).map((row) => tutorialItem(row, tutorialReviewId(row)));
}

/** True when this exact tutorial content is in review and was not written by the reviewer. */
export async function tutorialReviewTargetExists(supabase: SupabaseClient, reviewId: string, reviewerId: string): Promise<boolean> {
  const tutorialId = parseTutorialReviewId(reviewId);
  if (!tutorialId) return false;
  const { data } = await supabase.from("teacher_tutorials").select(TUTORIAL_COLUMNS).eq("id", tutorialId).eq("status", "in_review").maybeSingle();
  return !!data && data.author_id !== reviewerId && tutorialReviewId(data as TutorialItemRow) === reviewId;
}
