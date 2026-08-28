import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { initializeLearningPath } from "@/lib/learning-path";
import type { EducationLevel, LearningGoal, SubjectInterest } from "@/types/onboarding";
import type { StudyLevel } from "@/types";

export const dynamic = "force-dynamic";

const ONBOARDING_COOKIE = "onboarding_complete";
const ONBOARDING_COOKIE_OPTIONS = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" };
const STUDY_LEVELS: StudyLevel[] = ["primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const educationLevel = body.education_level as EducationLevel;
    const studyLevel = body.study_level as StudyLevel;
    const learningGoal = body.learning_goal as LearningGoal;
    let subjectInterests = (body.subject_interests ?? []) as SubjectInterest[];
    const goals = (body.goals ?? []) as string[] | undefined;

    if (!educationLevel || !learningGoal || !studyLevel || !STUDY_LEVELS.includes(studyLevel)) {
      return NextResponse.json({ error: "education_level, study_level and learning_goal are required" }, { status: 400 });
    }

    const detectedCountry = (body.country as string) ?? request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? request.headers.get("x-country") ?? null;
    try {
      const { lookupLocalization } = await import("@/lib/localization/curriculumMap");
      const loc = lookupLocalization(detectedCountry ?? undefined);
      if (loc?.recommendedBoosts?.length) subjectInterests = Array.from(new Set([...loc.recommendedBoosts, ...subjectInterests])).slice(0, 6) as SubjectInterest[];
    } catch (e) { console.warn("[onboarding] localization unavailable:", e); }

    const pathway = studyLevel === "university" ? "university" : studyLevel === "tvet" ? "tvet" : studyLevel === "professional" ? "professional" : null;
    const academicContext = {
      user_id: user.id,
      pathway,
      institution: typeof body.institution === "string" ? body.institution.trim() || null : null,
      programme: typeof body.programme === "string" ? body.programme.trim() : "",
      year_level: typeof body.year_level === "string" ? body.year_level.trim() || null : null,
      semester: typeof body.semester === "string" ? body.semester.trim() || null : null,
      courses: Array.isArray(body.courses) ? body.courses.filter((v: unknown): v is string => typeof v === "string").map((v: string) => v.trim()).filter(Boolean) : [],
    };

    if ((studyLevel === "university" || studyLevel === "tvet" || studyLevel === "professional") && !academicContext.programme) {
      return NextResponse.json({ error: "programme is required for tertiary and professional learners" }, { status: 400 });
    }

    const profilePayload = {
      id: user.id,
      display_name: typeof body.display_name === "string" ? body.display_name.trim() || null : null,
      study_level: studyLevel,
      subjects: Array.isArray(body.subject_interests) ? body.subject_interests : [],
      daily_goal_minutes: Number.isFinite(body.daily_goal_minutes) ? Math.max(10, Math.min(240, Number(body.daily_goal_minutes))) : 30,
      study_style: body.study_style === "structured" ? "structured" : "flexible",
      onboarding_completed: true,
      onboarding_complete: true,
      last_seen: new Date().toISOString(),
    };

    const { error: canonicalProfileError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
    if (canonicalProfileError) {
      console.error("[onboarding] canonical profile error:", canonicalProfileError);
      return NextResponse.json({ error: "Failed to save canonical student profile" }, { status: 500 });
    }

    // Keep the legacy profile for older curriculum/recommendation code paths while
    // the canonical profiles row carries the granular experience selector.
    const { error: profileError } = await supabase.from("user_profiles").upsert({
      user_id: user.id, education_level: educationLevel, learning_goal: learningGoal,
      subject_interests: subjectInterests, onboarding_completed: true,
    }, { onConflict: "user_id" });
    if (profileError) return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });

    if (pathway) {
      const { error: contextError } = await supabase.from("academic_contexts").upsert({ ...academicContext, pathway }, { onConflict: "user_id" });
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
      return NextResponse.json({ success: true, study_level: studyLevel, recommendations: rec });
    } catch (e) {
      console.error("[onboarding] recommendation error:", e);
      return NextResponse.json({ success: true, study_level: studyLevel });
    }
  } catch (err) {
    console.error("[onboarding] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
