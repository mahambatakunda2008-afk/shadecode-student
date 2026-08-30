import { NextResponse } from "next/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examGenerateSchema, validateRequestBody } from "@/lib/validation/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/auth-helpers";
import { generateExam } from "@/lib/cortex/examGenerator";
import { buildFallbackExam } from "@/lib/exam/fallbackExam";

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
    const cleanTopic = typeof topic === "string" ? topic.replace(/\s*\((?:O-Level|A-Level|University|O-Level standard|A-Level standard|university entrance standard)[^)]*\)\s*$/i, "").trim() : "";

    let exam = await generateExam(subject, cleanTopic ? [cleanTopic] : [subject], difficulty, questionCount, userId);
    let source = "cortex";

    // The generator deliberately returns null when providers fail or the AI
    // response fails quality validation. The old route incorrectly converted
    // that into a 503, even though the product already had enough deterministic
    // exam knowledge to keep the learner moving. Use a markable emergency paper
    // instead of returning an empty/error state.
    if (!exam) {
      exam = buildFallbackExam(subject, cleanTopic, difficulty, questionCount);
      source = "deterministic-fallback";
    }

    // Background persistence must never delay the learner's exam room.
    void createSupabaseServerClient().then((supabase) =>
      supabase.from("exams").insert({
        user_id: userId,
        subject,
        difficulty,
        questions: exam.questions,
      }).then(({ error }) => {
        if (error) console.error("[exam/generate] Background save failed:", error.message);
      })
    ).catch((error) => console.error("[exam/generate] Background save setup failed:", error));

    return NextResponse.json({
      questions: exam.questions,
      metadata: {
        subject,
        topic: cleanTopic || subject,
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
