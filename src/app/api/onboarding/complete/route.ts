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

    if (!educationLevel || !learningGoal) {
      return NextResponse.json({ error: "education_level and learning_goal are required" }, { status: 400 });
    }

    const detectedCountry = (body.country as string) ?? request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? request.headers.get("x-country") ?? null;

    try {
      const { lookupLocalization } = await import("@/lib/localization/curriculumMap");
      const loc = lookupLocalization(detectedCountry ?? undefined);
      if (loc?.recommendedBoosts?.length) {
        subjectInterests = Array.from(new Set([...loc.recommendedBoosts, ...subjectInterests])).slice(0, 6) as SubjectInterest[];
      }
    } catch (e) {
      console.warn("[onboarding] localization unavailable:", e);
    }

    // Post-secondary metadata is optional and deliberately user-owned. It does not
    // require a global university curriculum database.
    const academicMetadata = {
      institution: typeof body.institution === "string" ? body.institution.trim() : undefined,
      programme: typeof body.programme === "string" ? body.programme.trim() : undefined,
      year_level: typeof body.year_level === "string" ? body.year_level.trim() : undefined,
      semester: typeof body.semester === "string" ? body.semester.trim() : undefined,
      courses: Array.isArray(body.courses) ? body.courses.filter((v: unknown): v is string => typeof v === "string").map((v: string) => v.trim()).filter(Boolean) : undefined,
    };

    const profilePayload: Record<string, unknown> = {
      user_id: user.id,
      education_level: educationLevel,
      learning_goal: learningGoal,
      subject_interests: subjectInterests,
      onboarding_completed: true,
    };

    // Only write fields that already exist in the profile schema. If the optional
    // post-secondary columns have not been migrated yet, onboarding remains safe.
    if (educationLevel === "university" || educationLevel === "tvet") {
      Object.assign(profilePayload, academicMetadata);
    }

    const { error: profileError } = await supabase.from("user_profiles").upsert(profilePayload, { onConflict: "user_id" });
    if (profileError) {
      // Keep the existing onboarding path compatible with deployments that have not
      // applied the optional post-secondary columns yet.
      if (educationLevel === "university" || educationLevel === "tvet") {
        const { institution: _i, programme: _p, year_level: _y, semester: _s, courses: _c, ...legacyPayload } = profilePayload;
        const { error: fallbackError } = await supabase.from("user_profiles").upsert(legacyPayload, { onConflict: "user_id" });
        if (fallbackError) return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
      } else {
        return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
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
