import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateExam } from "@/lib/cortex/examGenerator";
import { buildGuaranteedExamForTopics } from "@/lib/exam/guaranteedExam";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Sign in to generate an exam." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "Exam service is not configured." }, { status: 503 });

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    const requestedSubject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const topics = Array.isArray(body?.topics) ? body.topics.filter((v: unknown): v is string => typeof v === "string" && Boolean(v.trim())).slice(0, 12) : [];
    const difficulty = body?.difficulty === "easy" || body?.difficulty === "hard" ? body.difficulty : "medium";
    const count = Number.isFinite(Number(body?.questionCount)) ? Math.max(5, Math.min(20, Math.round(Number(body.questionCount)))) : 10;
    if (!requestedSubject) return NextResponse.json({ error: "Choose a subject first." }, { status: 400 });
    const access = await resolveLearnerSubject(supabase, user.id, requestedSubject, body?.subjectId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (body?.learningMode === "classic") {
      const offlineExam = buildGuaranteedExamForTopics(access.subject, topics, difficulty, count);
      if (!offlineExam || offlineExam.questions.length !== count) {
        return NextResponse.json({ error: "Traditional mode does not yet have enough verified offline questions for every selected topic.", code: "OFFLINE_COVERAGE_UNAVAILABLE" }, { status: 503 });
      }
      return NextResponse.json({ exam: offlineExam, subject: access.subject, subjectId: access.subjectId, generationMode: "deterministic_offline" });
    }

    const exam = await generateExam(access.subject, topics, difficulty, count, user.id);
    if (exam && Array.isArray(exam.questions) && exam.questions.length === count) {
      return NextResponse.json({ exam, subject: access.subject, subjectId: access.subjectId, generationMode: "cortex_ai" });
    }

    const offlineExam = buildGuaranteedExamForTopics(access.subject, topics, difficulty, count);
    if (offlineExam && offlineExam.questions.length === count) {
      return NextResponse.json({
        exam: offlineExam,
        subject: access.subject,
        subjectId: access.subjectId,
        generationMode: "deterministic_offline",
        notice: "Cortex AI was unavailable. This paper was built from verified offline question generators and curated questions.",
      });
    }

    return NextResponse.json({
      error: "Cortex could not produce a verified paper, and there is not yet enough offline coverage for every selected topic. No placeholder questions were used.",
      code: "INSUFFICIENT_VERIFIED_COVERAGE",
    }, { status: 503 });
  } catch (error) {
    console.error("[native exam-sim generate]", error);
    return NextResponse.json({ error: "Could not generate this exam right now." }, { status: 502 });
  }
}
