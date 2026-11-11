import { NextResponse } from "next/server";
import { allReviewableQuestions, isReviewVerdict } from "@/lib/exam/curated/registry";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { lessonReviewTargetExists } from "@/lib/teacher/loadItems";
import { LESSON_GROUP } from "@/lib/teacher/reviewItems";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.questionId !== "string" || !isReviewVerdict(body.verdict)) {
    return NextResponse.json({ error: "questionId and a valid verdict are required" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (body.verdict !== "correct" && !note) {
    return NextResponse.json({ error: "Add a short note explaining what is wrong" }, { status: 400 });
  }

  // Only content that exists right now can be reviewed; the bank is derived server-side, never trusted from the client.
  let bank: string | null = null;
  const question = allReviewableQuestions().find((q) => q.id === body.questionId);
  if (question) bank = question.bank;
  else if (await lessonReviewTargetExists(reviewer.supabase, body.questionId)) bank = LESSON_GROUP.id;
  if (!bank) return NextResponse.json({ error: "Unknown or changed content" }, { status: 404 });

  const { error } = await reviewer.supabase.from("content_reviews").upsert(
    {
      question_id: body.questionId,
      bank,
      verdict: body.verdict,
      note: note || null,
      reviewer_id: reviewer.user.id,
      reviewed_at: new Date().toISOString(),
    },
    { onConflict: "question_id,reviewer_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
