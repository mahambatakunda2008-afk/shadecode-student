import type { LocalRecord } from "./types";
import { localFirstStore } from "./store";
import { markExamLocally } from "./exam-marker";

type ExamQuestion = { id: number; type: "multiple_choice" | "short_answer" | "structured"; question: string; options?: string[]; marks: number; topic: string };
type ExamResult = { questionId: number; score: number; maxScore: number; correct: boolean; feedback: string; modelAnswer: string; topic: string };
type ExamResults = { totalScore: number; maxScore: number; percentage: number; grade: string; weakAreas: string[]; strongAreas: string[]; cortexInsight: string; results: ExamResult[]; timeTaken: number };
type ExamAnswer = { questionId: number; answer: string; timeSpent: number };

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

export async function submitExamLocally(input: {
  userId: string;
  attemptId: string;
  subject: string;
  topic?: string;
  level: string;
  questions: ExamQuestion[];
  answers: ExamAnswer[];
  timeTaken: number;
}): Promise<LocalRecord<LocalExamResult>> {
  if (!input.userId) throw new Error("Exam result requires an authenticated user");
  if (!input.attemptId) throw new Error("Exam result requires an attempt ID");
  if (!Array.isArray(input.questions) || input.questions.length === 0) throw new Error("Exam result requires questions");

  const marked = markExamLocally(input.questions, input.answers);
  const result: LocalExamResult = {
    ...marked,
    attemptId: input.attemptId,
    subject: input.subject,
    topic: input.topic,
    level: input.level,
    questions: input.questions,
    answers: input.answers,
    source: "local-deterministic",
    pendingServerMark: marked.results.some((item) => item.feedback === "Pending deeper marking") || input.questions.some((q) => q.type !== "multiple_choice"),
    submittedAt: new Date().toISOString(),
  };

  return localFirstStore.upsert({
    id: resultId(input.userId, input.attemptId),
    entity: "exam_result",
    userId: input.userId,
    payload: result,
  });
}

export async function getLocalExamResult(userId: string, attemptId: string) {
  const record = await localFirstStore.get<LocalExamResult>(resultId(userId, attemptId));
  return record?.userId === userId && !record.deletedAt ? record : null;
}

export async function deleteLocalExamResult(userId: string, attemptId: string) {
  if (!userId || !attemptId) return;
  await localFirstStore.remove(resultId(userId, attemptId), userId);
}
