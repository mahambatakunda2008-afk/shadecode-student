import { saveExamAttempt, type LocalExamAttempt } from "./exam-attempt";
import { submitExamLocally } from "./exam-result";
import { queueExamSubmission } from "./exam-submission-queue";
import type { ExamQuestion, ExamResults } from "@/lib/exam/types";

export async function submitExamOffline(attempt: LocalExamAttempt, questions: ExamQuestion[], now = new Date().toISOString()): Promise<ExamResults> {
  if (attempt.status === "submitted") throw new Error("Exam attempt has already been submitted");
  if (!attempt.userId) throw new Error("Exam submission requires an authenticated user");
  if (!questions.length) throw new Error("Cannot submit an empty exam");
  if (!Number.isFinite(Date.parse(now))) throw new Error("Exam submission has an invalid timestamp");

  const pending = {
    userId: attempt.userId,
    attemptId: attempt.attemptId,
    subject: attempt.subject,
    topic: attempt.topic,
    level: String(attempt.level),
    questions,
    answers: attempt.answers,
    timeTaken: Math.max(0, attempt.totalSeconds - attempt.seconds),
    submittedAt: now,
  };

  await queueExamSubmission(pending);
  const resultRecord = await submitExamLocally(pending);

  await saveExamAttempt(attempt.userId, {
    ...attempt,
    status: "submitted",
    updatedAt: now,
    submittedAt: now,
    seconds: 0,
  });

  return resultRecord.payload;
}