import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMemory } from "@/lib/cortex/memory";
import { generateLearningInsight, generateRecommendation } from "@/lib/cortex/memoryTracker";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const memory = await getMemory(user.id);
    
    // Generate insights if not already cached
    const learningInsight = memory.learningInsight || await generateLearningInsight(user.id);
    const recommendationInsight = memory.recommendationInsight || await generateRecommendation(user.id);

    return NextResponse.json({
      memory: {
        streak: memory.streak,
        longestStreak: memory.longestStreak,
        totalStudySessions: memory.totalStudySessions,
        totalStudyTimeMinutes: memory.totalStudyTimeMinutes,
        averageSessionDuration: memory.averageSessionDuration,
        totalLessonsCompleted: memory.totalLessonsCompleted,
        frequentlyStudiedSubjects: memory.frequentlyStudiedSubjects,
        strongSubjects: memory.strongSubjects,
        weakSubjects: memory.weakSubjects,
        preferredStudyHours: memory.preferredStudyHours,
        averageExamScore: memory.averageExamScore,
        lastStudyDate: memory.lastStudyDate,
      },
      insights: {
        learning: learningInsight,
        recommendation: recommendationInsight,
      },
    });
  } catch (err) {
    console.error("[api/cortex/memory] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
