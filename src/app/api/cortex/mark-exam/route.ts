import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExamFeedback } from "@/lib/cortex/markingEngine";
import { trackExamResult } from "@/lib/cortex/memoryTracker";
import { awardXPBySource } from "@/lib/xp/manager";
import { emitCortexEvent } from "@/lib/cortex/events/emit";
import { checkAndUnlockAchievements } from "@/lib/cortex/achievements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MARKING_TIMEOUT_MS = 35_000;
const SIDE_EFFECT_TIMEOUT_MS = 5_000;

type ExamFeedback = Awaited<ReturnType<typeof generateExamFeedback>>;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("MARKING_TIMEOUT")), ms);
      timer.unref?.();
    }),
  ]);
}

function withOptionalTimeout<T>(operation: Promise<T> | T, ms: number): Promise<T | undefined> {
  return Promise.race([
    Promise.resolve(operation),
    new Promise<undefined>((resolve) => {
      const timer = setTimeout(() => resolve(undefined), ms);
      timer.unref?.();
    }),
  ]);
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { subject, questions, answers } = body;

    if (!subject || !Array.isArray(questions) || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "subject, questions, and answers are required" },
        { status: 400 },
      );
    }

    let report: ExamFeedback;
    try {
      report = await withTimeout(
        generateExamFeedback(subject, questions, answers),
        MARKING_TIMEOUT_MS,
      );
    } catch (err) {
      if (err instanceof Error && err.message === "MARKING_TIMEOUT") {
        return NextResponse.json(
          {
            error: "Marking took too long to complete.",
            code: "MARKING_TIMEOUT",
            retryable: true,
          },
          { status: 504 },
        );
      }
      throw err;
    }

    if (!report) {
      return NextResponse.json(
        { error: "Failed to mark exam", code: "MARKING_FAILED", retryable: true },
        { status: 502 },
      );
    }

    const sideEffects = await Promise.allSettled([
      withOptionalTimeout(trackExamResult({
        userId: user.id,
        subject,
        score: report.percentage,
        completedAt: new Date().toISOString(),
      }), SIDE_EFFECT_TIMEOUT_MS),
      withOptionalTimeout(emitCortexEvent({
        userId: user.id,
        type: "exam.completed",
        source: "exam",
        data: { subject, score: report.percentage, maxScore: 100 },
      }), SIDE_EFFECT_TIMEOUT_MS),
      report.percentage >= 50
        ? withOptionalTimeout(awardXPBySource(user.id, "exam_completion"), SIDE_EFFECT_TIMEOUT_MS)
        : Promise.resolve(undefined),
      withOptionalTimeout(checkAndUnlockAchievements(user.id), SIDE_EFFECT_TIMEOUT_MS),
    ]);

    const achievements = sideEffects[3].status === "fulfilled"
      ? sideEffects[3].value
      : [];

    return NextResponse.json({ report, newAchievements: achievements ?? [] });
  } catch (err) {
    console.error("[cortex/mark-exam]", err);
    return NextResponse.json(
      {
        error: "Failed to mark exam",
        code: "MARKING_FAILED",
        retryable: true,
      },
      { status: 502 },
    );
  }
}
