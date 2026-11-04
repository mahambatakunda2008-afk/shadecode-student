import { NextResponse } from "next/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examGenerateSchema, validateRequestBody } from "@/lib/validation/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/auth-helpers";
import { generateExam } from "@/lib/cortex/examGenerator";
import { buildGuaranteedExam } from "@/lib/exam/guaranteedExam";
import { hasCuratedBank } from "@/lib/exam/fallbackExam";
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

    // A blank topic reaches us as the subject name itself ("Biology (A-Level)" -> "Biology"). That means
    // "whole syllabus", so the built-in banks must treat it as no topic rather than an unknown one.
    const builtInTopic = cleanTopic.toLowerCase() === canonicalSubject.name.toLowerCase() ? "" : cleanTopic;

    // No-AI-first: when the built-in engine or a curated bank covers this topic, serve it straight away.
    // It is instant, works offline and is marked exactly, so a learner never waits on unreliable AI
    // providers. AI is only attempted for topics with no built-in coverage.
    const builtInCovers = matchGenerators(canonicalSubject.name, builtInTopic, difficulty).length > 0 || hasCuratedBank(canonicalSubject.name, builtInTopic);
    const skipAi = builtInCovers;

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
      exam = buildGuaranteedExam(canonicalSubject.name, builtInTopic, difficulty, questionCount);
      source = "deterministic-fallback";
    }

    if (!exam) {
      return NextResponse.json({
        error: "Live question generation is busy right now, so we couldn't build this paper. Nothing was lost. Please try again in a minute, or choose a different topic.",
        code: "GENERATION_UNAVAILABLE",
        retryable: true,
      }, { status: 503 });
    }

    // Generated papers are intentionally not written to `exams`: that table is the learner's exam
    // schedule (subject + exam_date). The old insert here could never succeed against it.

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
