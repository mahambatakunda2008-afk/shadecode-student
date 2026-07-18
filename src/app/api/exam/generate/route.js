import { NextResponse } from "next/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examGenerateSchema, validateRequestBody } from "@/lib/validation/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/auth-helpers";
import { generateExam } from "@/lib/cortex/examGenerator";

// NOTE: this used to have its own separate prompt + JSON parsing + no
// fallback content, entirely independent from src/lib/cortex/examGenerator.ts
// (which the /api/cortex/generate-exam route already used). That meant this
// route -- the one exam-sim/page.tsx actually calls -- had no fallback exam
// to fall back on when the AI providers failed, unlike the other path.
// Delegating to the shared generator fixes that: on AI failure this now
// returns a usable fallback exam instead of a hard error.
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
    // userId is intentionally NOT taken from validation.data -- a client-
    // supplied userId in the request body can't be trusted (anyone could
    // set it to any value); the server-verified session's user.id is the
    // only trustworthy source of identity here.
    const userId = user.id;

    const topics = topic ? [topic] : [subject];
    const exam = await generateExam(subject, topics, difficulty, questionCount, userId);

    if (!exam) {
      // generateExam() only returns null on a genuinely unexpected internal
      // error (its own AI-failure path already falls back to fallbackExam()
      // above this) -- so if we're here, something deeper broke.
      return NextResponse.json({ error: "Couldn't generate this exam right now. Please try again in a moment." }, { status: 503 });
    }

    // Background save (don't await, keep response fast)
    createSupabaseServerClient().then(supabase => {
      supabase.from('exams').insert({
        user_id: userId, subject, difficulty, questions: exam.questions
      }).then(({ error }) => {
        if (error) console.error("[exam/generate] Background save failed:", error.message);
      });
    });

    return NextResponse.json({ questions: exam.questions, metadata: { subject, topic: topic ?? subject } });
  } catch (err) {
    console.error("[exam/generate] Critical route failure:", err);
    return NextResponse.json({ error: "Something went wrong generating this exam. Please try again." }, { status: 500 });
  }
}
