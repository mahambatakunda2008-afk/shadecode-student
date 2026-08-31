import type { LocalRecord } from "./types";
import { localFirstStore } from "./store";
import { markExamLocally } from "./exam-marker";
import type { ExamAnswer, ExamQuestion, ExamResults } from "@/lib/exam/types";

export interface LocalExamResult extends ExamResults {
  attemptId: string;
  subject: string;
  topic?: string;
  level: string;
  questions: ExamQuestion[];
  answers: ExamAnswer[];
  source: "local-deterministic" | "server";
  pendingServerMark: boolean;
  submittedAt: string;
}

const resultId = (userId: string, attemptId: string) => `exam_result:${userId}:${attemptId}`;

export async function submitExamLocally(input: { userId: string; attemptId: string; subject: string; topic?: string; level: string; questions: ExamQuestion[]; answers: ExamAnswer[]; timeTaken: number; submittedAt?: string }): Promise<LocalRecord<LocalExamResult>> {
  if (!input.userId) throw new Error("Exam result requires an authenticated user");
  if (!input.attemptId) throw new Error("Exam result requires an attempt ID");
  if (!Array.isArray(input.questions) || input.questions.length === 0) throw new Error("Exam result requires questions");
  const submittedAt = input.submittedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(submittedAt))) throw new Error("Exam result has an invalid submission time");
  const marked = markExamLocally(input.questions, input.answers, input.timeTaken);
  const result: LocalExamResult = { ...marked, attemptId: input.attemptId, subject: input.subject, topic: input.topic, level: input.level, questions: input.questions, answers: input.answers, source: "local-deterministic", pendingServerMark: input.questions.some((q) => q.type !== "multiple_choice"), submittedAt };
  return localFirstStore.upsert({ id: resultId(input.userId, input.attemptId), entity: "exam_result", userId: input.userId, payload: result });
}

export async function saveExamResult(record: LocalRecord<LocalExamResult>) {
  if (!record.userId || !record.id) throw new Error("Exam result record requires identity");
  return localFirstStore.upsert({ id: record.id, entity: "exam_result", userId: record.userId, payload: record.payload });
}

export async function getLocalExamResult(userId: string, attemptId: string) {
  const record = await localFirstStore.get<LocalExamResult>(resultId(userId, attemptId));
  return record?.userId === userId && !record.deletedAt ? record : null;
}

export async function deleteLocalExamResult(userId: string, attemptId: string) {
  if (!userId || !attemptId) return;
  await localFirstStore.remove({ id: resultId(userId, attemptId), entity: "exam_result", userId });
}
