import { saveExamAttempt, type LocalExamAttempt } from "./exam-attempt";
import { submitExamLocally } from "./exam-result";
import type { ExamQuestion, ExamResults } from "@/lib/exam/types";

export async function submitExamOffline(attempt: LocalExamAttempt, questions: ExamQuestion[], now = new Date().toISOString()): Promise<ExamResults> {
  if (attempt.status === "submitted") throw new Error("Exam attempt has already been submitted");
  if (!questions.length) throw new Error("Cannot submit an empty exam");

  const resultRecord = await submitExamLocally({
    userId: attempt.userId,
    attemptId: attempt.attemptId,
    subject: attempt.subject,
    topic: attempt.topic,
    level: attempt.level,
    questions,
    answers: attempt.answers,
    timeTaken: Math.max(0, attempt.totalSeconds - attempt.remainingSeconds),
  });

  await saveExamAttempt({
    ...attempt,
    status: "submitted",
    updatedAt: now,
    submittedAt: now,
    remainingSeconds: 0,
  });

  return resultRecord.payload;
}
