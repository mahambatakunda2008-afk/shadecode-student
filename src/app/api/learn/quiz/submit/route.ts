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

export async function POST(req: Request) {
  try {
    const limited = await applyRateLimit(req, aiEndpointLimiter);
    if (limited) return limited;
    const token = bearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const attemptId = typeof body.attemptId === "string" ? body.attemptId : "";
    const answers = Array.isArray(body.answers) ? body.answers : null;
    if (!attemptId || !/^[0-9a-f-]{36}$/i.test(attemptId) || !answers || answers.length < 1 || answers.length > 50 ||
        !answers.every((value: unknown) => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 3)) {
      return NextResponse.json({ error: "A valid attemptId and answer selections are required." }, { status: 400 });
    }

    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) return NextResponse.json({ error: "Authentication configuration unavailable." }, { status: 500 });
    const learnerClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: claim, error: claimError } = await learnerClient.rpc("claim_lesson_quiz_attempt", {
      p_attempt_id: attemptId,
      p_answers: answers,
    });
    if (claimError) {
      const conflict = /different answers|already being submitted/i.test(claimError.message || "");
      return NextResponse.json({
        error: conflict ? "This attempt is already locked to another answer set." : "Could not claim this quiz attempt.",
        retryable: !conflict,
      }, { status: conflict ? 409 : 503 });
    }
    if (claim?.status === "completed") return NextResponse.json(claim.result);

    const { data: attempt, error: attemptError } = await admin.from("lesson_quiz_attempts")
      .select("id,lesson_id,questions,status,answers")
      .eq("id", attemptId).eq("user_id", user.id).maybeSingle();
    if (attemptError || !attempt) return NextResponse.json({ error: "Quiz attempt not found." }, { status: 404 });

    const questions = Array.isArray(attempt.questions) ? attempt.questions as Array<Record<string, unknown>> : [];
    if (!questions.length || answers.length !== questions.length ||
        questions.some(q => !Number.isInteger(q.correctIndex) || Number(q.correctIndex) < 0 || Number(q.correctIndex) > 3 ||
          !Array.isArray(q.options) || q.options.length !== 4)) {
      return NextResponse.json({ error: "Stored quiz is invalid. Please generate a new attempt." }, { status: 422 });
    }

    const { data: lesson, error: lessonError } = await admin.from("learn_lessons")
      .select("id,user_id,subject_id")
      .eq("id", attempt.lesson_id).eq("user_id", user.id).maybeSingle();
    if (lessonError || !lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    const { data: subject, error: subjectError } = await admin.from("subjects").select("id,name")
      .eq("id", lesson.subject_id).eq("user_id", user.id).maybeSingle();
    if (subjectError) return NextResponse.json({ error: "Could not verify lesson subject." }, { status: 500 });
    if (!subject?.name) return NextResponse.json({ error: "Lesson subject not found.", code: "SUBJECT_NOT_ALLOWED" }, { status: 403 });
    const subjectAccess = await resolveLearnerSubject(admin, user.id, subject.name, subject.id);
    if (!subjectAccess.ok) return NextResponse.json({ error: subjectAccess.error, code: "SUBJECT_NOT_ALLOWED" }, { status: subjectAccess.status });

    // One database transaction grades the server-owned answer key, records
    // curriculum mastery, persists the Cortex event, invalidates recommendations,
    // and finalizes the attempt. Replaying this RPC returns the saved result.
    const { data: result, error: completionError } = await learnerClient.rpc("complete_lesson_quiz_attempt", {
      p_attempt_id: attemptId,
    });
    if (completionError || !result) {
      console.error("Atomic quiz completion error:", completionError);
      return NextResponse.json({
        error: "Quiz completion could not be finalized. Your answer set is locked and safe; retry submission.",
        retryable: true,
      }, { status: 503 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Quiz submission error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
