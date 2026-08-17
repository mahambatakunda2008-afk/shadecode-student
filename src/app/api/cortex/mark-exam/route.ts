import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExamFeedback } from "@/lib/cortex/markingEngine";
import { trackExamResult } from "@/lib/cortex/memoryTracker";
import { awardXPBySource } from "@/lib/xp/manager";
import { emitCortexEvent } from "@/lib/cortex/events/emit";
import { checkAndUnlockAchievements } from "@/lib/cortex/achievements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MARKING_REQUEST_BUDGET_MS = 34_000;
const SIDE_EFFECT_BUDGET_MS = 2_500;

type MaybePromise<T> = T | Promise<T>;

function withTimeout<T>(promise: MaybePromise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => finish(fallback), timeoutMs);

    Promise.resolve(promise)
      .then(finish)
      .catch(() => finish(fallback));
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const subject = body?.subject;
    const questions = body?.questions;
    const answers = body?.answers;

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      !Array.isArray(questions) ||
      !answers ||
      typeof answers !== "object" ||
      Array.isArray(answers)
    ) {
      return NextResponse.json(
        { error: "subject, questions, and answers are required" },
        { status: 400 },
      );
    }

    const report = await withTimeout(
      generateExamFeedback(subject.trim(), questions, answers),
      MARKING_REQUEST_BUDGET_MS,
      null,
    );

    if (!report) {
      return NextResponse.json(
        {
          error: "Marking took too long to complete.",
          code: "MARKING_TIMEOUT",
          retryable: true,
        },
        { status: 504 },
      );
    }

    // Marking is the critical response. Analytics, XP and achievements are bounded
    // side effects and must never keep the student waiting after a valid report exists.
    const sideEffects: MaybePromise<unknown>[] = [
      trackExamResult({
        userId: user.id,
        subject: subject.trim(),
        score: report.percentage,
        completedAt: new Date().toISOString(),
      }),
      emitCortexEvent({
        userId: user.id,
        type: "exam.completed",
        source: "exam",
        data: { subject: subject.trim(), score: report.percentage, maxScore: 100 },
      }),
      report.percentage >= 50
        ? awardXPBySource(user.id, "exam_completion")
        : undefined,
      checkAndUnlockAchievements(user.id),
    ];

    const boundedSideEffects = sideEffects.map(effect =>
      withTimeout(effect, SIDE_EFFECT_BUDGET_MS, undefined),
    );
    const sideEffectResults = await Promise.allSettled(boundedSideEffects);
    const achievementsResult = sideEffectResults[3];
    const newAchievements = achievementsResult?.status === "fulfilled"
      ? achievementsResult.value
      : [];

    return NextResponse.json({ report, newAchievements });
  } catch (err) {
    console.error("[cortex/mark-exam]", err);
    return NextResponse.json(
      {
        error: "Unable to complete marking right now.",
        code: "MARKING_FAILED",
        retryable: true,
      },
      { status: 502 },
    );
  }
}
