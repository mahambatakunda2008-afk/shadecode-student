import type { ExamAnswer, ExamQuestion } from "@/lib/exam/types";
import { submitExamLocally } from "./exam-result";
import { localFirstStore } from "./store";

export interface PendingExamSubmission {
  userId: string;
  attemptId: string;
  subject: string;
  topic?: string;
  level: string;
  questions: ExamQuestion[];
  answers: ExamAnswer[];
  timeTaken: number;
  submittedAt: string;
}

const idFor = (userId: string, attemptId: string) => `exam_submission:${userId}:${attemptId}`;

export async function queueExamSubmission(input: PendingExamSubmission) {
  if (!input.userId || !input.attemptId) throw new Error("Queued exam submission requires identity");
  if (!Number.isFinite(Date.parse(input.submittedAt))) throw new Error("Queued exam submission has an invalid timestamp");
  return localFirstStore.upsert({
    id: idFor(input.userId, input.attemptId),
    entity: "exam_submission",
    userId: input.userId,
    payload: input,
  });
}

export async function getQueuedExamSubmission(userId: string, attemptId: string) {
  const record = await localFirstStore.get<PendingExamSubmission>(idFor(userId, attemptId));
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}

export async function finalizeQueuedExamSubmission(input: PendingExamSubmission) {
  const result = await submitExamLocally(input);
  await localFirstStore.remove({ id: idFor(input.userId, input.attemptId), entity: "exam_submission", userId: input.userId });
  return result;
}
