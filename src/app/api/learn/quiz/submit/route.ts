import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { markLessonQuiz } from "@/lib/learn/quiz-marking";
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
    const body = await req.json().catch(() => null);
    const quizId = typeof body?.quizId === "string" ? body.quizId : null;
    const answers = Array.isArray(body?.answers) ? body.answers : null;
    if (!quizId || !/^[0-9a-f-]{36}$/i.test(quizId) || !answers || answers.length < 1 || answers.length > 20) {
      return NextResponse.json({ error: "quizId and answers are required" }, { status: 400 });
    }
    const { data: session, error: sessionError } = await supabase.from("lesson_quiz_sessions")
      .select("id, user_id, lesson_id, questions, expires_at, submitted_at")
      .eq("id", quizId).eq("user_id", user.id).maybeSingle();
    if (sessionError || !session) return NextResponse.json({ error: "Quiz session not found" }, { status: 404 });
    if (session.submitted_at) return NextResponse.json({ error: "This quiz has already been submitted", code: "QUIZ_ALREADY_SUBMITTED" }, { status: 409 });
    if (!session.expires_at || new Date(session.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This quiz has expired. Generate a new quiz to continue.", code: "QUIZ_EXPIRED" }, { status: 410 });
    }
    const questions = Array.isArray(session.questions) ? session.questions : [];
    if (!questions.length || answers.length !== questions.length) return NextResponse.json({ error: "Submit one answer for each question" }, { status: 400 });
    const marked = markLessonQuiz(questions, answers);
    if (!marked) return NextResponse.json({ error: "Invalid answer selection or quiz answer key" }, { status: 400 });
    const { correctCount, questionCount, score } = marked;
    const { data: lesson, error: lessonError } = await supabase.from("learn_lessons")
      .select("id, curriculum_version_id, curriculum_objective_keys")
      .eq("id", session.lesson_id).eq("user_id", user.id).maybeSingle();
    if (lessonError || !lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    const submittedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabase.from("lesson_quiz_sessions")
      .update({ submitted_at: submittedAt }).eq("id", quizId).eq("user_id", user.id)
      .is("submitted_at", null).gt("expires_at", submittedAt).select("id").maybeSingle();
    if (claimError || !claimed) return NextResponse.json({ error: "This quiz has expired or has already been submitted", code: "QUIZ_SESSION_UNAVAILABLE" }, { status: 409 });
    const objectiveKeys = Array.isArray(lesson.curriculum_objective_keys)
      ? lesson.curriculum_objective_keys.filter((key: unknown): key is string => typeof key === "string" && key.trim().length > 0) : [];
    if (!lesson.curriculum_version_id || objectiveKeys.length === 0) {
      return NextResponse.json({ verified: true, curriculumTracked: false, score, correctCount, questionCount,
        reason: "CURRICULUM_UNVERIFIED",
        message: "This quiz was marked against its server-owned answer key, but no verified curriculum mastery was recorded." });
    }
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) throw new Error("Missing Supabase public credentials.");
    const userScoped = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data, error } = await userScoped.rpc("record_curriculum_assessment_result", {
      p_user_id: user.id, p_curriculum_version_id: lesson.curriculum_version_id,
      p_objective_keys: objectiveKeys, p_score: score, p_correct_count: correctCount,
      p_question_count: questionCount, p_lesson_id: lesson.id,
      p_evidence: { source: "lesson_quiz", quizSessionId: quizId, submittedAt }
    });
    if (error) {
      console.error("Curriculum assessment recording error:", error);
      return NextResponse.json({ error: "Quiz marked, but mastery could not be saved. This attempt cannot be resubmitted.",
        verified: true, curriculumTracked: false, score, correctCount, questionCount, retryable: false }, { status: 500 });
    }
    return NextResponse.json({ verified: true, curriculumTracked: true, score, correctCount, questionCount, mastery: data });
  } catch (error) {
    console.error("Quiz submission error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}