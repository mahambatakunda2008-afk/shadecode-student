import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { initializeLearningPath } from "@/lib/learning-path";
import type { EducationLevel, LearningGoal, SubjectInterest } from "@/types/onboarding";

const ONBOARDING_COOKIE = "onboarding_complete";
const ONBOARDING_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  secure: process.env.NODE_ENV === "production",
};

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
    let subjectInterests = (body.subject_interests ?? []) as SubjectInterest[];
    const goals = (body.goals ?? []) as string[] | undefined;

    if (!educationLevel || !learningGoal) {
      return NextResponse.json(
        { error: "education_level and learning_goal are required" },
        { status: 400 }
      );
    }

    // Detect user country (from request headers or body) to optionally localize onboarding
    const detectedCountry = (body.country as string) ??
      request.headers.get('x-vercel-ip-country') ??
      request.headers.get('cf-ipcountry') ??
      request.headers.get('x-country') ?? null;

    // Apply localization boosts (optional)
    try {
      const { lookupLocalization } = await import('@/lib/localization/curriculumMap');
      const loc = lookupLocalization(detectedCountry ?? undefined);
      // Merge recommended boosts into subjectInterests (preserve order, dedupe, cap at 6)
      if (loc?.recommendedBoosts && loc.recommendedBoosts.length > 0) {
        const combined = [...loc.recommendedBoosts, ...subjectInterests];
        const unique = Array.from(new Set(combined));
        subjectInterests = unique.slice(0, 6) as SubjectInterest[];
      }

      // Upsert user profile with localization metadata
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: user.id,
            education_level: educationLevel,
            learning_goal: learningGoal,
            subject_interests: subjectInterests,
            onboarding_completed: true,
          },
          { onConflict: 'user_id' }
        );

      if (profileError) {
        console.error('[onboarding] profile upsert error:', profileError);
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
      }
    } catch (e) {
      // Fallback: upsert without localization fields
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: user.id,
            education_level: educationLevel,
            learning_goal: learningGoal,
            subject_interests: subjectInterests,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (profileError) {
        console.error('[onboarding] profile upsert error (fallback):', profileError);
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
      }
    }


    // Initialize learning path (uses possibly-localized subjectInterests)
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

    // Edge-readable flag so middleware / server guards stop re-routing to /onboarding.
    const jar = await cookies();
    jar.set(ONBOARDING_COOKIE, "1", ONBOARDING_COOKIE_OPTIONS);

    // Generate lightweight recommendations and starter lesson. Non-blocking but include result in response.
    try {
      const { generateOnboardingRecommendations } = await import('@/lib/onboardingRecommendations');
      const rec = await generateOnboardingRecommendations(user.id, goals, educationLevel, subjectInterests);
      return NextResponse.json({ success: true, recommendations: rec });
    } catch (e) {
      console.error('[onboarding] recommendation error:', e);
      return NextResponse.json({ success: true });
    }
  } catch (err) {
    console.error("[onboarding] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
