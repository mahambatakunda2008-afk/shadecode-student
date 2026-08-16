import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { initializeLearningPath } from "@/lib/learning-path";
import type { EducationLevel, LearningGoal, SubjectInterest } from "@/types/onboarding";

export const dynamic = "force-dynamic";

const ONBOARDING_COOKIE = "onboarding_complete";
const ONBOARDING_COOKIE_OPTIONS = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" };

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const educationLevel = body.education_level as EducationLevel;
    const learningGoal = body.learning_goal as LearningGoal;
    let subjectInterests = (body.subject_interests ?? []) as SubjectInterest[];
    const goals = (body.goals ?? []) as string[] | undefined;

    if (!educationLevel || !learningGoal) return NextResponse.json({ error: "education_level and learning_goal are required" }, { status: 400 });

    const detectedCountry = (body.country as string) ?? request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? request.headers.get("x-country") ?? null;
    try {
      const { lookupLocalization } = await import("@/lib/localization/curriculumMap");
      const loc = lookupLocalization(detectedCountry ?? undefined);
      if (loc?.recommendedBoosts?.length) subjectInterests = Array.from(new Set([...loc.recommendedBoosts, ...subjectInterests])).slice(0, 6) as SubjectInterest[];
    } catch (e) { console.warn("[onboarding] localization unavailable:", e); }

    const academicContext = {
      user_id: user.id,
      pathway: educationLevel === "tvet" ? "tvet" : "university",
      institution: typeof body.institution === "string" ? body.institution.trim() || null : null,
      programme: typeof body.programme === "string" ? body.programme.trim() : "",
      year_level: typeof body.year_level === "string" ? body.year_level.trim() || null : null,
      semester: typeof body.semester === "string" ? body.semester.trim() || null : null,
      courses: Array.isArray(body.courses) ? body.courses.filter((v: unknown): v is string => typeof v === "string").map((v: string) => v.trim()).filter(Boolean) : [],
    };

    if ((educationLevel === "university" || educationLevel === "tvet") && !academicContext.programme) return NextResponse.json({ error: "programme is required for university and TVET learners" }, { status: 400 });

    const { error: profileError } = await supabase.from("user_profiles").upsert({
      user_id: user.id, education_level: educationLevel, learning_goal: learningGoal,
      subject_interests: subjectInterests, onboarding_completed: true,
    }, { onConflict: "user_id" });
    if (profileError) return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });

    if (educationLevel === "university" || educationLevel === "tvet") {
      const { error: contextError } = await supabase.from("academic_contexts").upsert(academicContext, { onConflict: "user_id" });
      if (contextError) {
        console.error("[onboarding] academic context error:", contextError);
        return NextResponse.json({ error: "Failed to save academic context" }, { status: 500 });
      }
    }

    const learningPathData = initializeLearningPath(user.id, educationLevel, learningGoal, subjectInterests);
    const { error: pathError } = await supabase.from("learning_paths").upsert({ ...learningPathData, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (pathError) return NextResponse.json({ error: "Failed to initialize learning path" }, { status: 500 });

    const jar = await cookies();
    jar.set(ONBOARDING_COOKIE, "1", ONBOARDING_COOKIE_OPTIONS);

    try {
      const { generateOnboardingRecommendations } = await import("@/lib/onboardingRecommendations");
      const rec = await generateOnboardingRecommendations(user.id, goals, educationLevel, subjectInterests);
      return NextResponse.json({ success: true, recommendations: rec });
    } catch (e) {
      console.error("[onboarding] recommendation error:", e);
      return NextResponse.json({ success: true });
    }
  } catch (err) {
    console.error("[onboarding] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
