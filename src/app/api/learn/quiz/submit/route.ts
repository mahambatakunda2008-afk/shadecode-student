import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";

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

type StoredQuestion = { id: number | string; question: string; options: string[]; correctIndex: number; explanation: string };

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
    const attemptId = typeof body.attemptId === "string" ? body.attemptId : "";
    const answers = Array.isArray(body.answers) ? body.answers : null;
    if (!attemptId || !/^[0-9a-f-]{36}$/i.test(attemptId) || !answers || answers.length < 1 || answers.length > 50 ||
        !answers.every((value: unknown) => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 3)) {
      return NextResponse.json({ error: "A valid attemptId and answer selections are required." }, { status: 400 });
    }

    const { data: attempt, error: attemptError } = await supabase.from("lesson_quiz_attempts")
      .select("id,user_id,lesson_id,questions,status,answers,result")
      .eq("id", attemptId).eq("user_id", user.id).maybeSingle();
    if (attemptError || !attempt) return NextResponse.json({ error: "Quiz attempt not found." }, { status: 404 });

    if (attempt.status === "completed") {
      const previous = Array.isArray(attempt.answers) ? attempt.answers : [];
      if (JSON.stringify(previous) !== JSON.stringify(answers)) {
        return NextResponse.json({ error: "This quiz attempt has already been submitted with different answers." }, { status: 409 });
      }
      return NextResponse.json(attempt.result);
    }

    const questions = Array.isArray(attempt.questions) ? attempt.questions as StoredQuestion[] : [];
    if (!questions.length || answers.length !== questions.length ||
        questions.some(q => !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3 || !Array.isArray(q.options) || q.options.length !== 4)) {
      return NextResponse.json({ error: "Stored quiz is invalid. Please generate a new attempt." }, { status: 422 });
    }

    const correctCount = answers.reduce((total: number, selected: number, index: number) =>
      total + (selected === questions[index].correctIndex ? 1 : 0), 0);
    const score = Math.round((correctCount / questions.length) * 10000) / 100;
    const reviewedQuestions = questions.map((question, index) => ({
      id: question.id,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      selectedIndex: answers[index],
      correct: answers[index] === question.correctIndex,
    }));

    const { data: lesson, error: lessonError } = await supabase.from("learn_lessons")
      .select("id,user_id,subject_id,curriculum_version_id,curriculum_objective_keys")
      .eq("id", attempt.lesson_id).eq("user_id", user.id).maybeSingle();
    if (lessonError || !lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });

    let curriculumTracked = false;
    let mastery: unknown = null;
    let reason: string | undefined;
    if (lesson.curriculum_version_id && Array.isArray(lesson.curriculum_objective_keys) && lesson.curriculum_objective_keys.length > 0) {
      const { data: subjectRow, error: subjectError } = await supabase.from("subjects").select("id,name")
        .eq("id", lesson.subject_id).eq("user_id", user.id).maybeSingle();
      if (subjectError) return NextResponse.json({ error: "Could not verify lesson subject." }, { status: 500 });
      if (!subjectRow?.name) return NextResponse.json({ error: "Lesson subject not found.", code: "SUBJECT_NOT_ALLOWED" }, { status: 403 });
      const subjectAccess = await resolveLearnerSubject(supabase, user.id, subjectRow.name, subjectRow.id);
      if (!subjectAccess.ok) return NextResponse.json({ error: subjectAccess.error, code: "SUBJECT_NOT_ALLOWED" }, { status: subjectAccess.status });

      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!anonKey) return NextResponse.json({ error: "Authentication configuration unavailable." }, { status: 500 });
      const learnerClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data, error } = await learnerClient.rpc("record_curriculum_assessment_result_idempotent", {
        p_user_id: user.id,
        p_curriculum_version_id: lesson.curriculum_version_id,
        p_objective_keys: lesson.curriculum_objective_keys,
        p_score: score,
        p_correct_count: correctCount,
        p_question_count: questions.length,
        p_lesson_id: lesson.id,
        p_attempt_id: attempt.id,
        p_evidence: { source: "lesson_quiz", attemptId: attempt.id, submittedAt: new Date().toISOString() },
      });
      if (error) {
        console.error("Curriculum assessment recording error:", error);
        return NextResponse.json({ error: "Could not record curriculum assessment. Your answers remain available; retry submission.", retryable: true }, { status: 503 });
      }
      curriculumTracked = true;
      mastery = data;
    } else {
      reason = "CURRICULUM_UNVERIFIED";
    }

    const result = {
      attemptId: attempt.id,
      score,
      correctCount,
      questionCount: questions.length,
      questions: reviewedQuestions,
      curriculumTracked,
      ...(reason ? { reason } : {}),
      mastery,
    };

    const { error: saveError } = await supabase.from("lesson_quiz_attempts").update({
      status: "completed", answers, result, completed_at: new Date().toISOString(),
    }).eq("id", attempt.id).eq("user_id", user.id).eq("status", "issued");
    if (saveError) {
      console.error("Quiz result persistence error:", saveError);
      return NextResponse.json({ error: "Your score was calculated but could not be saved. Retry safely.", retryable: true }, { status: 503 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Quiz submission error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
