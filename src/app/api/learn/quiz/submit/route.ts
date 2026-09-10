import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function bearer(req: Request) {
  const value = req.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() || null : null;
}

export async function POST(req: Request) {
  try {
    const limited = await applyRateLimit(req, aiEndpointLimiter);
    if (limited) return limited;

    const token = bearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const lessonId = typeof body.lessonId === "string" ? body.lessonId : null;
    const answers = Array.isArray(body.answers) ? body.answers : null;
    if (!lessonId || !answers || answers.length === 0) {
      return NextResponse.json({ error: "lessonId and answers are required" }, { status: 400 });
    }

    const { data: lesson, error: lessonError } = await supabase
      .from("learn_lessons")
      .select("id, user_id, curriculum_version_id, curriculum_objective_keys")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (lessonError || !lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

    const objectiveKeys = Array.isArray(lesson.curriculum_objective_keys)
      ? lesson.curriculum_objective_keys.filter((key: unknown): key is string => typeof key === "string" && key.trim())
      : [];

    if (!lesson.curriculum_version_id || objectiveKeys.length === 0) {
      return NextResponse.json({
        curriculumTracked: false,
        reason: "CURRICULUM_UNVERIFIED",
        message: "This lesson is not attached to a verified curriculum objective set, so no syllabus mastery was recorded."
      });
    }

    const correctAnswers = answers.filter((answer: unknown) => {
      if (!answer || typeof answer !== "object") return false;
      const item = answer as { selectedIndex?: unknown; correctIndex?: unknown };
      return Number.isInteger(item.selectedIndex) && Number.isInteger(item.correctIndex)
        && item.selectedIndex === item.correctIndex;
    }).length;

    const questionCount = answers.length;
    const score = Math.round((correctAnswers / questionCount) * 10000) / 100;

    const { data, error } = await supabase.rpc("record_curriculum_assessment_result", {
      p_user_id: user.id,
      p_curriculum_version_id: lesson.curriculum_version_id,
      p_objective_keys: objectiveKeys,
      p_score: score,
      p_correct_count: correctAnswers,
      p_question_count: questionCount,
      p_lesson_id: lesson.id,
      p_evidence: {
        source: "lesson_quiz",
        submittedAt: new Date().toISOString()
      }
    });

    if (error) {
      console.error("Curriculum assessment recording error:", error);
      return NextResponse.json({ error: "Could not record assessment" }, { status: 500 });
    }

    return NextResponse.json({
      curriculumTracked: true,
      score,
      correctCount: correctAnswers,
      questionCount,
      mastery: data
    });
  } catch (error) {
    console.error("Quiz submission error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
