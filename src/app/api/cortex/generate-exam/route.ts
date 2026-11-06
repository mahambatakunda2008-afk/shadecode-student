import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExam } from "@/lib/cortex/examGenerator";
import { buildGuaranteedExamForTopics } from "@/lib/exam/guaranteedExam";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const requestedSubject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const topics = Array.isArray(body?.topics) ? body.topics.filter((topic: unknown): topic is string => typeof topic === "string" && topic.trim().length > 0) : [];
    const difficulty = body?.difficulty === "easy" || body?.difficulty === "hard" ? body.difficulty : "medium";
    const questionCount = Number.isFinite(Number(body?.questionCount)) ? Math.max(1, Math.min(20, Math.round(Number(body.questionCount)))) : 10;

    if (!requestedSubject) return NextResponse.json({ error: "A subject is required" }, { status: 400 });
    if (body?.topics !== undefined && !Array.isArray(body.topics)) return NextResponse.json({ error: "topics must be an array" }, { status: 400 });

    const subjectAccess = await resolveLearnerSubject(supabase, user.id, requestedSubject, body?.subjectId);
    if (!subjectAccess.ok) return NextResponse.json({ error: subjectAccess.error }, { status: subjectAccess.status });

    // Classic mode is a genuinely no-AI path: deterministic generators first,
    // then hand-authored curated banks. It never calls a model provider.
    if (body?.learningMode === "classic") {
      const offlineExam = buildGuaranteedExamForTopics(subjectAccess.subject, topics, difficulty, questionCount);
      if (!offlineExam || offlineExam.questions.length !== questionCount) {
        return NextResponse.json({
          error: "Traditional mode does not yet have enough verified offline questions for every selected topic. Choose fewer covered topics or use Cortex AI when online.",
          code: "OFFLINE_COVERAGE_UNAVAILABLE",
        }, { status: 503 });
      }
      return NextResponse.json({
        exam: offlineExam,
        subject: subjectAccess.subject,
        subjectId: subjectAccess.subjectId,
        generationMode: "deterministic_offline",
      });
    }

    const exam = await generateExam(subjectAccess.subject, topics, difficulty, questionCount, user.id);
    if (exam) return NextResponse.json({ exam, subject: subjectAccess.subject, subjectId: subjectAccess.subjectId, generationMode: "cortex_ai" });

    // A failed provider chain gets one honest deterministic recovery attempt.
    // The response labels its origin so the UI can distinguish it from AI output.
    const offlineExam = buildGuaranteedExamForTopics(subjectAccess.subject, topics, difficulty, questionCount);
    if (offlineExam && offlineExam.questions.length === questionCount) {
      return NextResponse.json({
        exam: offlineExam,
        subject: subjectAccess.subject,
        subjectId: subjectAccess.subjectId,
        generationMode: "deterministic_offline",
        notice: "Cortex AI was unavailable. This paper was built from verified offline question generators and curated questions.",
      });
    }

    return NextResponse.json({
      error: "Cortex could not produce a verified paper, and there is not yet enough offline coverage for every selected topic. No placeholder questions were used.",
      code: "INSUFFICIENT_VERIFIED_COVERAGE",
    }, { status: 503 });
  } catch (err) {
    console.error("[API /cortex/generate-exam]", err);
    return NextResponse.json({ error: "Failed to generate exam" }, { status: 500 });
  }
}
