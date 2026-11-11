import { redirect } from "next/navigation";
import { allReviewableQuestions, REVIEW_BANKS } from "@/lib/exam/curated/registry";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { ReviewClient, type StoredReview } from "./ReviewClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content review · Shadecode Student" };

export default async function TeacherReviewPage() {
  const reviewer = await getReviewer();
  if (!reviewer) redirect("/auth/login");

  const { data } = await reviewer.supabase
    .from("content_reviews")
    .select("question_id,verdict,note,reviewer_id,reviewed_at")
    .limit(5000);

  return (
    <ReviewClient
      questions={allReviewableQuestions()}
      banks={REVIEW_BANKS.map((b) => ({ id: b.id, label: b.label }))}
      reviews={(data ?? []) as StoredReview[]}
      reviewerId={reviewer.user.id}
    />
  );
}
