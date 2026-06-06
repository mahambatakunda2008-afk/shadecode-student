import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { initializeLearningPath } from "@/lib/learning-path";
import type { EducationLevel, LearningGoal, SubjectInterest } from "@/types/onboarding";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const educationLevel = body.education_level as EducationLevel;
    const learningGoal = body.learning_goal as LearningGoal;
    const subjectInterests = (body.subject_interests ?? []) as SubjectInterest[];

    if (!educationLevel || !learningGoal) {
      return NextResponse.json(
        { error: "education_level and learning_goal are required" },
        { status: 400 }
      );
    }

    // Upsert user profile
    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          education_level: educationLevel,
          learning_goal: learningGoal,
          subject_interests: subjectInterests,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (profileError) {
      console.error("[onboarding] profile upsert error:", profileError);
      return NextResponse.json(
        { error: "Failed to save profile" },
        { status: 500 }
      );
    }

    // Initialize learning path
    const learningPathData = initializeLearningPath(
      user.id,
      educationLevel,
      learningGoal,
      subjectInterests
    );

    const { error: pathError } = await supabase
      .from("learning_paths")
      .upsert(
        {
          ...learningPathData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (pathError) {
      console.error("[onboarding] learning path upsert error:", pathError);
      return NextResponse.json(
        { error: "Failed to initialize learning path" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[onboarding] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
