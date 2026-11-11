import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { tutorialReviewId } from "@/lib/teacher/tutorial";
import { TutorialsClient, type MyTutorial, type PendingTutorial } from "./TutorialsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tutorials · Shadecode Student" };

export default async function TutorialsPage() {
  const reviewer = (await getReviewer())!;

  const { data: mine } = await reviewer.supabase
    .from("teacher_tutorials")
    .select("id,title,status,updated_at")
    .eq("author_id", reviewer.user.id)
    .order("updated_at", { ascending: false })
    .limit(200);

  let pending: PendingTutorial[] = [];
  if (reviewer.isAdmin) {
    const { data: rows } = await reviewer.supabase
      .from("teacher_tutorials")
      .select("id,title,blocks,author_id,updated_at")
      .eq("status", "in_review")
      .order("updated_at", { ascending: true })
      .limit(100);
    const ids = (rows ?? []).map((r) => tutorialReviewId(r));
    const { data: reviews } = ids.length
      ? await reviewer.supabase.from("content_reviews").select("question_id,verdict").in("question_id", ids)
      : { data: [] as { question_id: string; verdict: string }[] };
    pending = (rows ?? []).map((r) => {
      const rid = tutorialReviewId(r);
      const rs = (reviews ?? []).filter((x) => x.question_id === rid);
      return {
        id: r.id,
        title: r.title,
        updatedAt: r.updated_at,
        correct: rs.filter((x) => x.verdict === "correct").length,
        flagged: rs.filter((x) => x.verdict !== "correct").length,
        own: r.author_id === reviewer.user.id,
      };
    });
  }

  return <TutorialsClient mine={(mine ?? []) as MyTutorial[]} pending={pending} isAdmin={reviewer.isAdmin} />;
}
