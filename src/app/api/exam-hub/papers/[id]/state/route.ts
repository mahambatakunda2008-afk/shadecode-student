import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type StatePatch = Partial<{
  bookmarked: boolean;
  status: "not_started" | "in_progress" | "completed";
  last_page: number;
  score: number;
  time_spent_seconds: number;
  downloaded_offline: boolean;
}>;

const ALLOWED_KEYS: (keyof StatePatch)[] = [
  "bookmarked",
  "status",
  "last_page",
  "score",
  "time_spent_seconds",
  "downloaded_offline",
];

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
    const examScores: { subject: string; score: number; recorded_at: string }[] =
      memory?.exam_scores ?? [];

    examScores.push({ subject, score, recorded_at: new Date().toISOString() });
    const cappedScores = examScores.slice(-50); // bounded history, most recent 50
    const newAverage =
      cappedScores.reduce((sum, s) => sum + s.score, 0) / cappedScores.length;

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
        last_study_date: new Date().toISOString(),
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

    const body = (await request.json()) as StatePatch;
    const patch: Record<string, unknown> = {};
    for (const key of ALLOWED_KEYS) {
      if (body[key] !== undefined) patch[key] = body[key];
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields in request" }, { status: 400 });
    }
    if (
      patch.score !== undefined &&
      (typeof patch.score !== "number" || patch.score < 0 || patch.score > 100)
    ) {
      return NextResponse.json({ error: "score must be a number between 0 and 100" }, { status: 400 });
    }

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
