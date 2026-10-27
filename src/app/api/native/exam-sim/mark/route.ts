import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateExamFeedback } from "@/lib/cortex/markingEngine";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";
import type { ExamQuestion } from "@/lib/cortex/examGenerator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    if (!subject || !Array.isArray(questions) || questions.length < 1 || questions.length > 20 || !answers || typeof answers !== "object" || Array.isArray(answers)) {
      return NextResponse.json({ error: "A subject, questions and answers are required." }, { status: 400 });
    }
    const access = await resolveLearnerSubject(supabase, user.id, subject, body?.subjectId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (questions.some(q => !q || typeof q.id !== "string" || typeof q.question !== "string" || !Number.isFinite(q.marks) || q.marks <= 0 || typeof q.modelAnswer !== "string")) {
      return NextResponse.json({ error: "This paper is incomplete and cannot be marked safely. Generate a new paper." }, { status: 400 });
    }
    const report = await generateExamFeedback(access.subject, questions, answers);
    if (!report || report.provisional || !Array.isArray(report.results) || report.results.length !== questions.length ||
        !Number.isFinite(report.totalScore) || !Number.isFinite(report.totalMaxMarks) || report.totalMaxMarks <= 0 ||
        !Number.isFinite(report.percentage) || typeof report.overallFeedback !== "string") {
      return NextResponse.json({ error: "Cortex could not produce a complete verified marking report. No score was recorded. Please retry.", retryable: true }, { status: 503 });
    }
    return NextResponse.json({ report });
  } catch (err) {
    console.error("[native exam-sim mark]", err);
    return NextResponse.json({ error: "Unable to mark this exam right now." }, { status: 502 });
  }
}
