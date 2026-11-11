import { notFound } from "next/navigation";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { tutorialReviewId, type TutorialStatus } from "@/lib/teacher/tutorial";
import { EditorClient, type EditorTutorial, type Feedback } from "./EditorClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit tutorial · Shadecode Student" };

export default async function TutorialEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const reviewer = (await getReviewer())!;
  const { id } = await params;

  const { data } = await reviewer.supabase
    .from("teacher_tutorials")
    .select("id,title,subject,topic,blocks,status")
    .eq("id", id)
    .eq("author_id", reviewer.user.id)
    .maybeSingle();
  if (!data) notFound();

  // Feedback counts only for the exact current wording; editing makes earlier reviews stale.
  const { data: reviews } = await reviewer.supabase
    .from("content_reviews")
    .select("verdict,note")
    .eq("question_id", tutorialReviewId(data));

  return <EditorClient tutorial={{ ...data, status: data.status as TutorialStatus } as EditorTutorial} feedback={(reviews ?? []) as Feedback[]} />;
}
