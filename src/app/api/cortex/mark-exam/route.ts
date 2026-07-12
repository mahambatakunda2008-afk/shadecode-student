import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExamFeedback } from "@/lib/cortex/markingEngine";
import { trackExamResult } from "@/lib/cortex/memoryTracker";
import { awardXPBySource } from "@/lib/xp/manager";
import { emitCortexEvent } from "@/lib/cortex/events/emit";
import { checkAndUnlockAchievements } from "@/lib/cortex/achievements";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { subject, questions, answers } = body;

    if (!subject || !questions || !answers) {
      return NextResponse.json({ error: "subject, questions, and answers are required" }, { status: 400 });
    }

    const report = await generateExamFeedback(subject, questions, answers);

    if (!report) {
      return NextResponse.json({ error: "Failed to mark exam" }, { status: 500 });
    }

    await trackExamResult({
      userId: user.id,
      subject,
      score: report.percentage,
      completedAt: new Date().toISOString(),
    });

    await emitCortexEvent({
      userId: user.id,
      type: "exam.completed",
      source: "exam",
      data: { subject, score: report.percentage, maxScore: 100 },
    });

    if (report.percentage >= 50) {
      await awardXPBySource(user.id, "exam_completion");
    }

    const achievements = await checkAndUnlockAchievements(user.id);

    return NextResponse.json({ report, newAchievements: achievements });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to mark exam" },
      { status: 500 }
    );
  }
}
