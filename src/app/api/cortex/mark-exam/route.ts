import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExamFeedback } from "@/lib/cortex/markingEngine";
import { trackExamResult } from "@/lib/cortex/memoryTracker";
import { awardXPBySource } from "@/lib/xp/manager";
import { emitCortexEvent } from "@/lib/cortex/events/emit";
import { checkAndUnlockAchievements } from "@/lib/cortex/achievements";

export const dynamic = "force-dynamic";

const SIDE_EFFECT_BUDGET_MS = 2500;

async function bounded<T>(operation: Promise<T> | T, fallback: T): Promise<T> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(fallback), SIDE_EFFECT_BUDGET_MS);
    Promise.resolve(operation).then(finish).catch(() => finish(fallback));
  });
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

    if (!subject || !Array.isArray(questions) || !answers || typeof answers !== "object") {
      return NextResponse.json({ error: "subject, questions, and answers are required" }, { status: 400 });
    }

    const report = await generateExamFeedback(subject, questions, answers);

    if (!report) {
      return NextResponse.json({ error: "Failed to mark exam" }, { status: 500 });
    }

    // Marking is the critical response. Analytics, XP, and achievements must
    // never keep the student waiting after a valid report exists.
    await bounded(trackExamResult({
      userId: user.id,
      subject,
      score: report.percentage,
      completedAt: new Date().toISOString(),
    }), undefined);

    await bounded(emitCortexEvent({
      userId: user.id,
      type: "exam.completed",
      source: "exam",
      data: { subject, score: report.percentage, maxScore: 100 },
    }), undefined);

    if (report.percentage >= 50) {
      await bounded(awardXPBySource(user.id, "exam_completion"), undefined);
    }

    const achievements = await bounded(checkAndUnlockAchievements(user.id), []);

    return NextResponse.json({ report, newAchievements: achievements });
  } catch (err) {
    console.error("[Cortex Mark Exam] Failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to mark exam" },
      { status: 500 }
    );
  }
}
