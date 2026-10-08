import { NextResponse } from "next/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examGenerateSchema, validateRequestBody } from "@/lib/validation/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/auth-helpers";
import { generateExam } from "@/lib/cortex/examGenerator";
import { buildGuaranteedExam } from "@/lib/exam/guaranteedExam";
import { matchGenerators } from "@/lib/exam/engine";
import { examAiBreaker } from "@/lib/aiCircuitBreaker";
import { resolveLearnerSubjects, assertRequestedLearnerSubject } from "@/lib/subjects/resolveLearnerSubjects";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req) {
  try {
    const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitCheck) return rateLimitCheck;

    const { user, error: authError } = await getVerifiedUser(req);
    if (!user) {
      return NextResponse.json({ error: authError || "You need to be signed in to generate an exam." }, { status: 401 });
    }

    const body = await req.json();
    const validation = validateRequestBody(body, examGenerateSchema);
    if (!validation.success) {
      const firstIssue = validation.details?.issues?.[0];
      const detail = firstIssue ? `${firstIssue.path?.join(".")}: ${firstIssue.message}` : "Please check your exam settings and try again.";
      return NextResponse.json({ error: detail }, { status: 400 });
    }

    const { subject, topic, difficulty, questionCount } = validation.data;
    const userId = user.id;
    const supabase = await createSupabaseServerClient();

    // resolveLearnerSubjects returns an object, not the raw subject array.
    // Passing the object into assertRequestedLearnerSubject caused the production
    // "e.find is not a function" crash. Keep the contract explicit here.
    const learnerSubjectState = await resolveLearnerSubjects(supabase, userId);
    const canonicalSubject = assertRequestedLearnerSubject(learnerSubjectState.subjects, subject);

    if (!canonicalSubject) {
      return NextResponse.json({
        error: learnerSubjectState.subjects.length
          ? "That subject is not in your selected subjects. Choose one of your subjects and try again."
          : "Choose your subjects in onboarding before generating an exam.",
        code: "SUBJECT_NOT_ALLOWED",
        subjects: learnerSubjectState.subjects,
      }, { status: 400 });
    }

    const cleanTopic = typeof topic === "string"
      ? topic.replace(/\s*\((?:O-Level|A-Level|University|O-Level standard|A-Level standard|university entrance standard)[^)]*\)\s*$/i, "").trim()
      : "";

    // When the AI providers have been failing, skip straight to the engine, but only when the engine
    // can actually serve this topic. Otherwise the AI stays the only option and is still attempted.
    const engineCovers = matchGenerators(canonicalSubject.name, cleanTopic).length > 0;
    const skipAi = engineCovers && !examAiBreaker.shouldAttempt();

    let exam = null;
    let source = "cortex";
    if (!skipAi) {
      try {
        exam = await generateExam(canonicalSubject.name, cleanTopic ? [cleanTopic] : [canonicalSubject.name], difficulty, questionCount, userId);
      } catch {
        exam = null;
      }
      if (exam) examAiBreaker.recordSuccess();
      else examAiBreaker.recordFailure();
    }

    if (!exam) {
      // Deterministic engine first (exact, instant), then curated questions. Never serve generic placeholders.
      exam = buildGuaranteedExam(canonicalSubject.name, cleanTopic, difficulty, questionCount);
      source = "deterministic-fallback";
    }

    if (!exam) {
      return NextResponse.json({
        error: "Live question generation is busy right now, so we couldn't build this paper. Nothing was lost. Please try again in a minute, or choose a different topic.",
        code: "GENERATION_UNAVAILABLE",
        retryable: true,
      }, { status: 503 });
    }

    void supabase.from("exams").insert({
      user_id: userId,
      subject: canonicalSubject.name,
      difficulty,
      questions: exam.questions,
    }).then(({ error }) => {
      if (error) console.error("[exam/generate] Background save failed:", error.message);
    }).catch((error) => console.error("[exam/generate] Background save setup failed:", error));

    return NextResponse.json({
      questions: exam.questions,
      metadata: {
        subject: canonicalSubject.name,
        topic: cleanTopic || canonicalSubject.name,
        source,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
      },
    });
  } catch (err) {
    console.error("[exam/generate] Critical route failure:", err);
    return NextResponse.json({ error: "Something went wrong generating this exam. Please try again." }, { status: 500 });
  }
}
