import { markExamOffline } from "./exam-marker";
import { saveExamResult } from "./exam-result";
import { saveExamAttempt, type LocalExamAttempt } from "./exam-attempt";
import type { ExamQuestion, ExamResults } from "@/lib/exam/types";

export async function submitExamOffline(attempt: LocalExamAttempt, questions: ExamQuestion[], now = new Date().toISOString()): Promise<ExamResults> {
  if (attempt.status === "submitted") throw new Error("Exam attempt has already been submitted");
  if (!questions.length) throw new Error("Cannot submit an empty exam");
  const result = markExamOffline(questions, attempt.answers, Math.max(0, attempt.totalSeconds - attempt.remainingSeconds));
  await saveExamAttempt({ ...attempt, status: "submitted", updatedAt: now, submittedAt: now, remainingSeconds: 0 });
  await saveExamResult({
    id: `exam-result:${attempt.userId}:${attempt.attemptId}`,
    userId: attempt.userId,
    attemptId: attempt.attemptId,
    subject: attempt.subject,
    topic: attempt.topic,
    level: attempt.level,
    totalScore: result.totalScore,
    maxScore: result.maxScore,
    percentage: result.percentage,
    grade: result.grade,
    weakAreas: result.weakAreas,
    strongAreas: result.strongAreas,
    cortexInsight: result.cortexInsight,
    results: result.results,
    timeTaken: result.timeTaken,
    source: "local-deterministic",
    pendingDeepMarking: result.results.some((item) => item.feedback === "Written response saved for deeper marking."),
    createdAt: now,
    updatedAt: now,
  });
  return result;
}
