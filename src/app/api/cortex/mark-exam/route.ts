import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExamFeedback } from "@/lib/cortex/markingEngine";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";
import type { ExamQuestion } from "@/lib/cortex/examGenerator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MARKING_REQUEST_BUDGET_MS = 34_000;



function validateMarkingReport(report: any, questions: ExamQuestion[]) {
  if (!report || typeof report !== "object" || !Array.isArray(report.results)) return false;
  if (report.results.length !== questions.length) return false;
  const questionIds = new Set(questions.map(q => q.id));
  const seen = new Set<string>();
  let totalScore = 0;
  let totalMax = 0;
  for (const result of report.results) {
    if (!result || typeof result !== "object") return false;
    if (typeof result.questionId !== "string" || !questionIds.has(result.questionId) || seen.has(result.questionId)) return false;
    if (!Number.isFinite(result.score) || !Number.isFinite(result.maxMarks)) return false;
    if (result.score < 0 || result.maxMarks < 0 || result.score > result.maxMarks) return false;
    if (typeof result.feedback !== "string" || result.feedback.trim().length < 10) return false;
    if (!Array.isArray(result.strengths) || !Array.isArray(result.improvements)) return false;
    const expectedMax = questions.find(q => q.id === result.questionId)?.marks ?? -1;
    if (Math.abs(result.maxMarks - expectedMax) > 0.001) return false;
    seen.add(result.questionId);
    totalScore += result.score;
    totalMax += result.maxMarks;
  }
  if (seen.size !== questionIds.size || totalMax <= 0) return false;
  if (Math.abs(totalScore - Number(report.totalScore)) > 0.01) return false;
  if (Math.abs(totalMax - Number(report.totalMaxMarks)) > 0.01) return false;
  const expectedPercentage = Math.round((totalScore / totalMax) * 100);
  if (Math.abs(expectedPercentage - Number(report.percentage)) > 0.01) return false;
  return typeof report.overallFeedback === "string" && report.overallFeedback.trim().length >= 20 &&
    Array.isArray(report.weakTopics) && Array.isArray(report.strongTopics) && Array.isArray(report.recommendedActions);
}

type MaybePromise<T> = T | Promise<T>;

function withTimeout<T>(promise: MaybePromise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => finish(fallback), timeoutMs);

    Promise.resolve(promise)
      .then(finish)
      .catch(() => finish(fallback));
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const requestedSubject = body?.subject;
    const questions = body?.questions as ExamQuestion[];
    const answers = body?.answers;

    const subjectAccess = await resolveLearnerSubject(supabase, user.id, requestedSubject, body?.subjectId);
    if (!subjectAccess.ok) return NextResponse.json({ error: subjectAccess.error }, { status: subjectAccess.status });
    const subject = subjectAccess.subject;

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      !Array.isArray(questions) ||
      !answers ||
      typeof answers !== "object" ||
      Array.isArray(answers)
    ) {
      return NextResponse.json(
        { error: "subject, questions, and answers are required" },
        { status: 400 },
      );
    }

    const report = await withTimeout(
      generateExamFeedback(subject.trim(), questions, answers),
      MARKING_REQUEST_BUDGET_MS,
      null,
    );

    if (!report) {
      return NextResponse.json(
        {
          error: "Marking took too long to complete.",
          code: "MARKING_TIMEOUT",
          retryable: true,
        },
        { status: 504 },
      );
    }

    if (report.provisional || !validateMarkingReport(report, questions)) {
      return NextResponse.json({
        error: "Cortex could not produce a complete verified marking report. No score was recorded. Please retry.",
        code: "MARKING_NOT_VERIFIED",
        retryable: true,
      }, { status: 503 });
    }

    // The request contains client-supplied questions and reference answers.
    // Marking remains useful feedback, but cannot create trusted mastery,
    // exam-history, XP, or achievement evidence until paper provenance is signed.
    return NextResponse.json({
      report,
      evidenceRecorded: false,
      evidenceReason: "unverified_paper_provenance",
    });
  } catch (err) {
    console.error("[cortex/mark-exam]", err);
    return NextResponse.json(
      {
        error: "Unable to complete marking right now.",
        code: "MARKING_FAILED",
        retryable: true,
      },
      { status: 502 },
    );
  }
}
