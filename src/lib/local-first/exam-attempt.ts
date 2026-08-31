import type { LocalRecord } from "./types";
import { localFirstStore } from "./store";

export type LocalExamQuestion = {
  id: number;
  type: "multiple_choice" | "short_answer" | "structured";
  question: string;
  options?: string[];
  marks: number;
  topic: string;
};

export type LocalExamAnswer = { questionId: number; answer: string; timeSpent: number };

export type LocalExamAttempt = {
  attemptId: string;
  subject: string;
  topic: string;
  level: number;
  count: number;
  questions: LocalExamQuestion[];
  answers: LocalExamAnswer[];
  current: number;
  seconds: number;
  totalSeconds: number;
  startedAt: number;
  flags: number[];
  canvas?: string;
  status: "active" | "submitted";
  updatedAt: string;
};

const key = (userId: string, attemptId: string) => `exam_attempt:${userId}:${attemptId}`;

function requireUser(userId: string) {
  if (!userId) throw new Error("Exam attempts require an authenticated user");
}

export async function getExamAttempt(userId: string, attemptId: string): Promise<LocalExamAttempt | null> {
  requireUser(userId);
  if (!attemptId) return null;
  const record = await localFirstStore.get<LocalExamAttempt>(key(userId, attemptId));
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}

export async function saveExamAttempt(userId: string, attempt: LocalExamAttempt): Promise<LocalRecord<LocalExamAttempt>> {
  requireUser(userId);
  if (!attempt.attemptId || !attempt.questions.length) throw new Error("Exam attempt is incomplete");
  if (!Number.isFinite(attempt.startedAt) || attempt.startedAt <= 0) throw new Error("Exam attempt has an invalid start time");
  const seconds = Math.max(0, Math.floor(attempt.seconds));
  const totalSeconds = Math.max(seconds, Math.floor(attempt.totalSeconds));
  const current = Math.max(0, Math.min(attempt.questions.length - 1, Math.floor(attempt.current)));
  return localFirstStore.upsert({
    id: key(userId, attempt.attemptId),
    entity: "exam_attempt",
    userId,
    payload: { ...attempt, seconds, totalSeconds, current, updatedAt: new Date().toISOString() },
  });
}

export async function deleteExamAttempt(userId: string, attemptId: string): Promise<LocalRecord<LocalExamAttempt>> {
  requireUser(userId);
  const existing = await getExamAttempt(userId, attemptId);
  if (!existing) throw new Error("Exam attempt not found");
  return localFirstStore.remove(key(userId, attemptId), userId);
}
