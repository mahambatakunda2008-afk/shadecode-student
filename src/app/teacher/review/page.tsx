import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { loadLessonItems } from "@/lib/teacher/loadItems";
import { questionItems, REVIEW_GROUPS } from "@/lib/teacher/reviewItems";
import { ReviewClient, type StoredReview } from "./ReviewClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review · Shadecode Student" };

export default async function TeacherReviewPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const reviewer = (await getReviewer())!;
  const { group } = await searchParams;

  const [lessons, { data }] = await Promise.all([
    loadLessonItems(reviewer.supabase),
    reviewer.supabase.from("content_reviews").select("question_id,verdict,note,reviewer_id,reviewed_at").limit(10000),
  ]);
  const items = [...questionItems(), ...lessons];
  const groups = REVIEW_GROUPS.filter((g) => items.some((i) => i.group === g.id));

  return (
    <ReviewClient
      items={items}
      groups={groups}
      reviews={(data ?? []) as StoredReview[]}
      reviewerId={reviewer.user.id}
      initialGroup={groups.some((g) => g.id === group) ? group! : groups[0]?.id ?? ""}
    />
  );
}
