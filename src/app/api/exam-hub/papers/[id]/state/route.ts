import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedSubject } from "@/lib/academic/subjectContract";
import { resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";
import { mergePaperScoreHistory, parsePaperStatePatch } from "@/lib/exam-hub/paperStatePatch";

export const dynamic = "force-dynamic";

const WEAK_THRESHOLD = 50; // score % below this counts as a weak-subject signal
const STRONG_THRESHOLD = 75; // score % at or above this counts as a strong-subject signal

/**
 * Rolls a completed, scored paper into cortex_memory's weak/strong subject
 * tracking. Best-effort: failures here are logged but never fail the
 * state-update request itself — a broken rollup shouldn't block a student
 * from marking their paper complete.
 */
async function updateCortexMemory(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  paperId: string,
  score: number
) {
  try {
    const { data: paper } = await supabase
      .from("past_papers")
      .select("syllabus_id, syllabi(subject)")
      .eq("id", paperId)
      .maybeSingle();

    const subject = (paper?.syllabi as { subject?: string } | null)?.subject;
    if (!subject) return;

    const { data: memory } = await supabase
      .from("cortex_memory")
      .select("weak_subjects, strong_subjects, exam_scores, average_exam_score")
      .eq("user_id", userId)
      .maybeSingle();

    const weakSubjects: string[] = memory?.weak_subjects ?? [];
    const strongSubjects: string[] = memory?.strong_subjects ?? [];
    const recordedAt = new Date().toISOString();
    const cappedScores = mergePaperScoreHistory(memory?.exam_scores, paperId, subject, score, recordedAt);
    const newAverage =
      cappedScores.reduce((sum, entry) => sum + entry.score, 0) / cappedScores.length;

    const nextWeak = new Set(weakSubjects.filter((s) => s !== subject));
    const nextStrong = new Set(strongSubjects.filter((s) => s !== subject));
    if (score < WEAK_THRESHOLD) nextWeak.add(subject);
    else if (score >= STRONG_THRESHOLD) nextStrong.add(subject);

    await supabase.from("cortex_memory").upsert(
      {
        user_id: userId,
        weak_subjects: [...nextWeak],
        strong_subjects: [...nextStrong],
        exam_scores: cappedScores,
        average_exam_score: Math.round(newAverage * 100) / 100,
        last_study_date: recordedAt,
      },
      { onConflict: "user_id" }
    );
  } catch (err) {
    console.error("[exam-hub/state] cortex_memory rollup failed:", err);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // State writes also affect Cortex's weak/strong subject memory. Verify the
    // paper's syllabus before accepting scores or recording progress.
    const learner = await resolveLearnerSubjects(supabase, user.id);
    if (learner.subjects.length === 0) {
      return NextResponse.json(
        { error: "Choose your subjects in onboarding before using Exam Hub.", code: "SUBJECT_NOT_ALLOWED" },
        { status: 409 },
      );
    }

    const { data: paper, error: paperError } = await supabase
      .from("past_papers")
      .select("id, syllabus_id")
      .eq("id", id)
      .maybeSingle();
    if (paperError) throw paperError;
    if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

    const { data: syllabus, error: syllabusError } = await supabase
      .from("syllabi")
      .select("id, subject")
      .eq("id", paper.syllabus_id)
      .maybeSingle();
    if (syllabusError) throw syllabusError;
    if (!syllabus || !isAllowedSubject(syllabus.subject, learner.subjects.map((subject) => subject.name))) {
      return NextResponse.json(
        { error: "That paper is not available for your selected subjects.", code: "SUBJECT_NOT_ALLOWED" },
        { status: 403 },
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must contain valid JSON" }, { status: 400 });
    }

    const parsed = parsePaperStatePatch(payload);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const patch = parsed.patch as Record<string, unknown>;

    const { data, error } = await supabase
      .from("user_past_paper_state")
      .upsert(
        { user_id: user.id, paper_id: id, ...patch, updated_at: new Date().toISOString() },
        { onConflict: "user_id,paper_id" }
      )
      .select()
      .single();

    if (error) throw error;

    if (patch.status === "completed" && typeof patch.score === "number") {
      await updateCortexMemory(supabase, user.id, id, patch.score);
    }

    return NextResponse.json({ state: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update paper state" },
      { status: 500 }
    );
  }
}
