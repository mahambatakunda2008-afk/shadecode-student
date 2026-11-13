import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateExamFeedback } from "@/lib/cortex/markingEngine";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";
import { resolveUserSystemCurriculum } from "@/lib/curriculum/user-resolution";
import type { ExamQuestion } from "@/lib/cortex/examGenerator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function eventUuid(identity: string): string {
  const hex = createHash("sha256").update(identity).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function POST(request: Request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || token === request.headers.get("authorization")) {
    return NextResponse.json({ error: "Sign in to mark your exam." }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "Exam service is not configured." }, { status: 503 });
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
  try {
    const body = await request.json().catch(() => null);
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const questions = body?.questions as ExamQuestion[];
    const answers = body?.answers;
    const attemptId = typeof body?.attemptId === "string" ? body.attemptId.trim() : "";
    if (!subject || !Array.isArray(questions) || questions.length < 1 || questions.length > 20 || !answers || typeof answers !== "object" || Array.isArray(answers)) {
      return NextResponse.json({ error: "A subject, questions and answers are required." }, { status: 400 });
    }
    if (!attemptId || attemptId.length > 100) {
      return NextResponse.json({ error: "A stable attempt ID is required to protect this submission from duplicate marking." }, { status: 400 });
    }
    const access = await resolveLearnerSubject(supabase, user.id, subject, body?.subjectId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const curriculum = await resolveUserSystemCurriculum(user.id, access.subject);
    const verifiedSyllabusId = curriculum.resolved.status === "resolved"
      ? curriculum.identity?.syllabusId ?? null
      : null;
    if (questions.some(q => !q || typeof q.id !== "string" || typeof q.question !== "string" || !Number.isFinite(q.marks) || q.marks <= 0 || typeof q.modelAnswer !== "string")) {
      return NextResponse.json({ error: "This paper is incomplete and cannot be marked safely. Generate a new paper." }, { status: 400 });
    }
    const admin = createSupabaseAdminClient();
    if (!admin) return NextResponse.json({ error: "Secure exam submission storage is not configured." }, { status: 503 });
    const payloadHash = createHash("sha256").update(stableJson({ subject, questions, answers })).digest("hex");
    const { data: claimRows, error: claimError } = await admin.rpc("claim_exam_submission", {
      p_user_id: user.id,
      p_attempt_id: attemptId,
      p_payload_hash: payloadHash,
    });
    if (claimError) {
      console.error("[native exam-sim mark] claim failed:", claimError.message);
      return NextResponse.json({ error: "Your submission could not be safely claimed. Your answers remain saved. Retry shortly." }, { status: 503 });
    }
    const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
    if (claim?.state === "completed" && claim.saved_result) {
      return NextResponse.json(claim.saved_result, { headers: { "X-Exam-Submission-Replayed": "true" } });
    }
    if (claim?.state === "processing") {
      return NextResponse.json({ error: "This attempt is already being marked. Retry shortly; your answers are safe." }, { status: 409 });
    }
    if (claim?.state === "payload_conflict") {
      return NextResponse.json({ error: "This attempt ID was already used with different answers. Restore the original attempt before retrying." }, { status: 409 });
    }
    if (claim?.state !== "claimed" || !claim.claim_token) {
      return NextResponse.json({ error: "The submission could not be claimed safely. Retry shortly." }, { status: 503 });
    }
    const report = await generateExamFeedback(access.subject, questions, answers);
    if (!report || report.provisional || !Array.isArray(report.results) || report.results.length !== questions.length ||
        !Number.isFinite(report.totalScore) || !Number.isFinite(report.totalMaxMarks) || report.totalMaxMarks <= 0 ||
        !Number.isFinite(report.percentage) || typeof report.overallFeedback !== "string") {
      return NextResponse.json({ error: "Cortex could not produce a complete verified marking report. No score was recorded. Please retry.", retryable: true }, { status: 503 });
    }
    const examId = randomUUID();
    const eventId = eventUuid(`native-exam:${user.id}:${attemptId}`);
    const result = { report };
    const { data: finalized, error: finalizeError } = await admin.rpc("complete_exam_submission", {
      p_user_id: user.id,
      p_attempt_id: attemptId,
      p_payload_hash: payloadHash,
      p_claim_token: claim.claim_token,
      p_result: result,
      p_event: {
        eventId,
        examId,
        subject: access.subject,
        syllabusId: verifiedSyllabusId,
        difficulty: "native-simulation",
        score: report.totalScore,
        maxScore: report.totalMaxMarks,
        percentage: report.percentage,
        grade: report.percentage >= 80 ? "A" : report.percentage >= 70 ? "B" : report.percentage >= 60 ? "C" : report.percentage >= 50 ? "D" : "E",
        weakAreas: report.weakTopics ?? [],
        strongAreas: report.strongTopics ?? [],
        timeTaken: 0,
        topicScores: [],
      },
    });
    if (finalizeError || finalized !== true) {
      console.error("[native exam-sim mark] finalization failed:", finalizeError?.message || "No row finalized");
      return NextResponse.json({ error: "The paper was marked but its result could not be safely finalized. Retry this same attempt to recover it.", retryable: true }, { status: 503 });
    }
    return NextResponse.json(result, { headers: { "X-Exam-Submission-Id": attemptId } });
  } catch (err) {
    console.error("[native exam-sim mark]", err);
    return NextResponse.json({ error: "Unable to mark this exam right now." }, { status: 502 });
  }
}
