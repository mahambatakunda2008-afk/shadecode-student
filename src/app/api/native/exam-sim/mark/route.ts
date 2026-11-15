import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateExamFeedback } from "@/lib/cortex/markingEngine";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";
import type { ExamQuestion } from "@/lib/cortex/examGenerator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function validateMarkingReport(report: any, questions: ExamQuestion[]): boolean {
  if (!report || typeof report !== "object" || !Array.isArray(report.results)) return false;
  if (report.provisional || report.results.length !== questions.length) return false;
  const ids = new Set(questions.map(question => question.id));
  if (ids.size !== questions.length) return false;
  const seen = new Set<string>();
  let score = 0;
  let maxMarks = 0;
  for (const result of report.results) {
    if (!result || typeof result !== "object" || typeof result.questionId !== "string" ||
        !ids.has(result.questionId) || seen.has(result.questionId) ||
        !Number.isFinite(result.score) || !Number.isFinite(result.maxMarks) ||
        result.score < 0 || result.maxMarks <= 0 || result.score > result.maxMarks ||
        typeof result.feedback !== "string" || result.feedback.trim().length < 10 ||
        !Array.isArray(result.strengths) || !Array.isArray(result.improvements)) return false;
    const expected = questions.find(question => question.id === result.questionId)?.marks ?? -1;
    if (Math.abs(result.maxMarks - expected) > 0.001) return false;
    seen.add(result.questionId);
    score += result.score;
    maxMarks += result.maxMarks;
  }
  if (seen.size !== ids.size || maxMarks <= 0 ||
      Math.abs(score - Number(report.totalScore)) > 0.01 ||
      Math.abs(maxMarks - Number(report.totalMaxMarks)) > 0.01 ||
      Math.abs(Math.round(score / maxMarks * 100) - Number(report.percentage)) > 0.01) return false;
  return typeof report.overallFeedback === "string" && report.overallFeedback.trim().length >= 20 &&
    Array.isArray(report.weakTopics) && Array.isArray(report.strongTopics) &&
    Array.isArray(report.recommendedActions);
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Sign in to mark your exam." }, { status: 401 });
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
    if (!subject || !Array.isArray(questions) || questions.length < 1 || questions.length > 20 ||
        !answers || typeof answers !== "object" || Array.isArray(answers)) {
      return NextResponse.json({ error: "A subject, questions and answers are required." }, { status: 400 });
    }
    const access = await resolveLearnerSubject(supabase, user.id, subject, body?.subjectId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (questions.some(q => !q || typeof q.id !== "string" || typeof q.question !== "string" ||
        typeof q.topic !== "string" || !q.topic.trim() || !Number.isFinite(q.marks) || q.marks <= 0 ||
        typeof q.modelAnswer !== "string" || q.modelAnswer.trim().length < 10)) {
      return NextResponse.json({ error: "This paper is incomplete and cannot be marked safely. Generate a new paper." }, { status: 400 });
    }

    const report = await generateExamFeedback(access.subject, questions, answers);
    if (!report || !validateMarkingReport(report, questions)) {
      return NextResponse.json({
        error: "Cortex could not produce a complete marking report. No result was recorded. Please retry.",
        retryable: true,
      }, { status: 503 });
    }

    // The native client currently submits its question objects and model answers.
    // Until generated papers carry a server-verifiable signature, this result is
    // feedback only: it must not enter the canonical event stream or mastery model.
    return NextResponse.json({
      report,
      evidenceRecorded: false,
      evidenceReason: "unverified_paper_provenance",
    });
  } catch (err) {
    console.error("[native exam-sim mark]", err);
    return NextResponse.json({ error: "Unable to mark this exam right now." }, { status: 502 });
  }
}
