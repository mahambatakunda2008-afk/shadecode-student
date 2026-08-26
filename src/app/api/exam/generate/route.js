import { NextResponse } from "next/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examGenerateSchema, validateRequestBody } from "@/lib/validation/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/auth-helpers";
import { generateExam } from "@/lib/cortex/examGenerator";
import { resolveCurriculum } from "@/lib/curriculum/resolver";
import { getLearnerContextForUser } from "@/lib/learner/serverContext";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req) {
  try {
    const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitCheck) return rateLimitCheck;

    const { user, error: authError } = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ error: authError || "You need to be signed in to generate an exam." }, { status: 401 });

    const body = await req.json();
    const validation = validateRequestBody(body, examGenerateSchema);
    if (!validation.success) {
      const firstIssue = validation.details?.issues?.[0];
      const detail = firstIssue ? `${firstIssue.path?.join(".")}: ${firstIssue.message}` : "Please check your exam settings and try again.";
      return NextResponse.json({ error: detail }, { status: 400 });
    }

    const { subject, topic, difficulty, questionCount } = validation.data;
    const supabase = await createSupabaseServerClient();
    const learner = await getLearnerContextForUser(supabase, user);
    if (!learner) return NextResponse.json({ error: "Your academic profile is incomplete. Finish onboarding before generating an exam." }, { status: 409 });

    const curriculum = resolveCurriculum(learner, subject, topic);
    if (!curriculum) return NextResponse.json({ error: "That subject is outside your enrolled academic scope." }, { status: 403 });

    const userId = user.id;
    const topics = topic ? [topic] : [subject];
    const exam = await generateExam(subject, topics, difficulty, questionCount, userId);
    if (!exam) return NextResponse.json({ error: "Couldn't generate this exam right now. Please try again in a moment." }, { status: 503 });

    supabase.from('exams').insert({ user_id: userId, subject, difficulty, questions: exam.questions }).then(({ error }) => {
      if (error) console.error("[exam/generate] Background save failed:", error.message);
    });

    return NextResponse.json({ questions: exam.questions, metadata: { subject, topic: topic ?? subject, curriculum } });
  } catch (err) {
    console.error("[exam/generate] Critical route failure:", err);
    return NextResponse.json({ error: "Something went wrong generating this exam. Please try again." }, { status: 500 });
  }
}
