import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { markLessonQuiz } from "@/lib/learn/quiz-marking";
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

function responseForStoredResult(payload: Record<string, any>, masteryStatus: string) {
  if (masteryStatus === "recorded") return { ...payload, curriculumTracked: true, warning: undefined };
  if (masteryStatus === "not_applicable") {
    return { ...payload, curriculumTracked: false, reason: "CURRICULUM_UNVERIFIED",
      message: "This quiz was marked against its server-owned answer key, but this lesson is not linked to verified curriculum objectives." };
  }
  return { ...payload, curriculumTracked: false,
    warning: "Your score is verified and recoverable. Syllabus mastery could not be confirmed as saved, so it has not been reported as updated.",
    retryable: false };
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
      .select("id, user_id, lesson_id, questions, expires_at, submitted_at, result_payload, mastery_status")
      .eq("id", quizId).eq("user_id", user.id).maybeSingle();
    if (sessionError || !session) return NextResponse.json({ error: "Quiz session not found" }, { status: 404 });
    const { data: lesson, error: lessonError } = await supabase.from("learn_lessons")
      .select("id, subject_id, curriculum_version_id, curriculum_objective_keys")
      .eq("id", session.lesson_id).eq("user_id", user.id).maybeSingle();
    if (lessonError || !lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    const { data: subjectRow, error: subjectError } = await supabase.from("subjects").select("id, name").eq("id", lesson.subject_id).eq("user_id", user.id).maybeSingle();
    if (subjectError) return NextResponse.json({ error: "Could not verify lesson subject." }, { status: 500 });
    if (!subjectRow?.name) return NextResponse.json({ error: "Lesson subject not found.", code: "SUBJECT_NOT_ALLOWED" }, { status: 403 });
    const subjectAccess = await resolveLearnerSubject(supabase, user.id, subjectRow.name, subjectRow.id);
    if (!subjectAccess.ok) return NextResponse.json({ error: subjectAccess.error, code: "SUBJECT_NOT_ALLOWED" }, { status: subjectAccess.status });
    if (session.submitted_at) {
      if (!session.result_payload || typeof session.result_payload !== "object") {
        return NextResponse.json({ error: "This quiz was submitted but its result cannot be recovered. Please contact support.", code: "QUIZ_RESULT_UNAVAILABLE" }, { status: 409 });
      }
      const storedPayload = session.result_payload as Record<string, any>;
      const storedMasteryStatus = session.mastery_status ?? "pending";
      if (storedMasteryStatus === "pending" || storedMasteryStatus === "failed") {
        // Reconcile after a prior request saved the score but could not confirm
        // mastery persistence. Never retry while the evidence lookup itself is
        // uncertain; the unique evidence index protects the RPC from duplicate
        // attempts if a committed transaction's response was lost.
        const findRecordedAttempt = () => supabase.from("learner_curriculum_assessment_attempts")
          .select("id").eq("user_id", user.id)
          .eq("evidence->>quizSessionId", quizId).maybeSingle();
        const { data: recordedAttempt, error: lookupError } = await findRecordedAttempt();
        if (lookupError) {
          return NextResponse.json(responseForStoredResult(storedPayload, storedMasteryStatus));
        }
        if (recordedAttempt) {
          await supabase.from("lesson_quiz_sessions").update({ mastery_status: "recorded" })
            .eq("id", quizId).eq("user_id", user.id);
          return NextResponse.json({ ...storedPayload, curriculumTracked: true });
        }

        const { data: storedLesson, error: storedLessonError } = await supabase.from("learn_lessons")
          .select("id, curriculum_version_id, curriculum_objective_keys")
          .eq("id", session.lesson_id).eq("user_id", user.id).maybeSingle();
        const storedObjectives = Array.isArray(storedLesson?.curriculum_objective_keys)
          ? storedLesson.curriculum_objective_keys.filter((key: unknown): key is string => typeof key === "string" && key.trim().length > 0) : [];
        const validStoredScore = Number.isFinite(storedPayload.score) && Number.isFinite(storedPayload.correctCount)
          && Number.isFinite(storedPayload.questionCount) && storedPayload.questionCount > 0;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (storedLessonError || !storedLesson?.curriculum_version_id || !storedObjectives.length
          || !validStoredScore || !anonKey || !session.submitted_at) {
          return NextResponse.json(responseForStoredResult(storedPayload, storedMasteryStatus));
        }
        const userScoped = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { autoRefreshToken: false, persistSession: false }
        });
        const retry = await userScoped.rpc("record_curriculum_assessment_result", {
          p_user_id: user.id,
          p_curriculum_version_id: storedLesson.curriculum_version_id,
          p_objective_keys: storedObjectives,
          p_score: storedPayload.score,
          p_correct_count: storedPayload.correctCount,
          p_question_count: storedPayload.questionCount,
          p_lesson_id: storedLesson.id,
          p_evidence: { source: "lesson_quiz", quizSessionId: quizId, submittedAt: session.submitted_at }
        });
        if (!retry.error) {
          await supabase.from("lesson_quiz_sessions").update({ mastery_status: "recorded" })
            .eq("id", quizId).eq("user_id", user.id);
          return NextResponse.json({ ...storedPayload, curriculumTracked: true, mastery: retry.data });
        }
        const { data: afterRetryAttempt, error: afterRetryLookupError } = await findRecordedAttempt();
        if (!afterRetryLookupError && afterRetryAttempt) {
          await supabase.from("lesson_quiz_sessions").update({ mastery_status: "recorded" })
            .eq("id", quizId).eq("user_id", user.id);
          return NextResponse.json({ ...storedPayload, curriculumTracked: true });
        }
        await supabase.from("lesson_quiz_sessions").update({ mastery_status: "failed" })
          .eq("id", quizId).eq("user_id", user.id);
        return NextResponse.json(responseForStoredResult(storedPayload, "failed"));
      }
      return NextResponse.json(responseForStoredResult(storedPayload, storedMasteryStatus));
    }
    if (!session.expires_at || new Date(session.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This quiz has expired. Generate a new quiz to continue.", code: "QUIZ_EXPIRED" }, { status: 410 });
    }
    const questions = Array.isArray(session.questions) ? session.questions : [];
    if (!questions.length || answers.length !== questions.length) return NextResponse.json({ error: "Submit one answer for each question" }, { status: 400 });
    const marked = markLessonQuiz(questions, answers);
    if (!marked) return NextResponse.json({ error: "Invalid answer selection or quiz answer key" }, { status: 400 });
    const { correctCount, questionCount, score } = marked;
    const objectiveKeys = Array.isArray(lesson.curriculum_objective_keys)
      ? lesson.curriculum_objective_keys.filter((key: unknown): key is string => typeof key === "string" && key.trim().length > 0) : [];
    const canTrackCurriculum = Boolean(lesson.curriculum_version_id && objectiveKeys.length > 0);
    const submittedAt = new Date().toISOString();
    const resultPayload = {
      verified: true, curriculumTracked: false, score, correctCount, questionCount, questions,
      ...(!canTrackCurriculum ? {
        reason: "CURRICULUM_UNVERIFIED",
        message: "This quiz was marked against its server-owned answer key, but no verified curriculum mastery was recorded."
      } : {})
    };
    // Consume the session and save its verified score in one atomic update.
    // Retries can recover this payload without rescoring or recording mastery twice.
    const { data: claimed, error: claimError } = await supabase.from("lesson_quiz_sessions")
      .update({ submitted_at: submittedAt, result_payload: resultPayload,
        mastery_status: canTrackCurriculum ? "pending" : "not_applicable" })
      .eq("id", quizId).eq("user_id", user.id)
      .is("submitted_at", null).gt("expires_at", submittedAt).select("id").maybeSingle();
    if (claimError || !claimed) {
      const { data: latest } = await supabase.from("lesson_quiz_sessions")
        .select("submitted_at, result_payload, mastery_status").eq("id", quizId).eq("user_id", user.id).maybeSingle();
      if (latest?.submitted_at && latest.result_payload && typeof latest.result_payload === "object") {
        return NextResponse.json(responseForStoredResult(latest.result_payload as Record<string, any>, latest.mastery_status ?? "pending"));
      }
      return NextResponse.json({ error: "This quiz has expired or is being submitted. Please retry to recover the result.", code: "QUIZ_SESSION_UNAVAILABLE", retryable: true }, { status: 409 });
    }
    if (!canTrackCurriculum) return NextResponse.json(resultPayload);
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) throw new Error("Missing Supabase public credentials.");
    const userScoped = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const assessmentArgs = {
      p_user_id: user.id, p_curriculum_version_id: lesson.curriculum_version_id,
      p_objective_keys: objectiveKeys, p_score: score, p_correct_count: correctCount,
      p_question_count: questionCount, p_lesson_id: lesson.id,
      p_evidence: { source: "lesson_quiz", quizSessionId: quizId, submittedAt }
    };
    let { data, error } = await userScoped.rpc("record_curriculum_assessment_result", assessmentArgs);
    if (error) {
      console.error("Curriculum assessment recording error:", error);
      // The RPC is transactional, and the migration adds a unique evidence key
      // per quiz session. If the first response was lost after commit, the row
      // proves mastery and its progress updates committed atomically.
      const findRecordedAttempt = () => supabase.from("learner_curriculum_assessment_attempts")
        .select("id").eq("user_id", user.id)
        .eq("evidence->>quizSessionId", quizId).maybeSingle();
      let { data: recordedAttempt, error: lookupError } = await findRecordedAttempt();
      if (!lookupError && recordedAttempt) {
        await supabase.from("lesson_quiz_sessions").update({ mastery_status: "recorded" }).eq("id", quizId).eq("user_id", user.id);
        return NextResponse.json({ ...resultPayload, curriculumTracked: true });
      }
      if (lookupError) {
        // The evidence lookup is uncertain, so preserve the verified score and
        // let a later result-recovery request reconcile it instead of retrying.
        return NextResponse.json(responseForStoredResult(resultPayload, "pending"));
      }

      // No committed evidence was found, so retry once. The unique index makes
      // this safe even if the first transaction was still completing.
      const retry = await userScoped.rpc("record_curriculum_assessment_result", assessmentArgs);
      if (!retry.error) {
        data = retry.data;
        error = null;
      } else {
        console.error("Curriculum assessment retry failed:", retry.error);
        const { data: retryRecordedAttempt, error: retryLookupError } = await findRecordedAttempt();
        if (!retryLookupError && retryRecordedAttempt) {
          await supabase.from("lesson_quiz_sessions").update({ mastery_status: "recorded" }).eq("id", quizId).eq("user_id", user.id);
          return NextResponse.json({ ...resultPayload, curriculumTracked: true });
        }
        await supabase.from("lesson_quiz_sessions").update({ mastery_status: "failed" }).eq("id", quizId).eq("user_id", user.id);
        return NextResponse.json(responseForStoredResult(resultPayload, "failed"));
      }
    }
    const { error: statusError } = await supabase.from("lesson_quiz_sessions")
      .update({ mastery_status: "recorded" }).eq("id", quizId).eq("user_id", user.id);
    if (statusError) {
      // Do not replay the RPC automatically: if it committed before this status
      // update failed, replaying could double-count mastery evidence.
      console.error("Could not persist quiz mastery status:", statusError);
      return NextResponse.json(responseForStoredResult(resultPayload, "pending"));
    }
    return NextResponse.json({ ...resultPayload, curriculumTracked: true, mastery: data });
  } catch (error) {
    console.error("Quiz submission error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}