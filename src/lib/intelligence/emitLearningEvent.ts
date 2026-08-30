import type { LearningEventKind } from "./learningEvents";

export type LearningEventInput = {
  source: string;
  sourceEventId: string;
  type: string;
  occurredAt?: string;
  subjectId?: string;
  topicId?: string;
  entityId?: string;
  attemptId?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function emitLearningEvent(input: LearningEventInput): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.onLine) return false;
  try {
    const response = await fetch("/api/intelligence/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function lessonViewedEvent(lessonId: string, subject?: string, topic?: string) {
  return emitLearningEvent({ source: "learn", sourceEventId: `lesson-view:${lessonId}`, type: "lesson.viewed", subjectId: subject, topicId: topic, entityId: lessonId });
}

export function lessonCompletedEvent(lessonId: string, subject?: string, topic?: string) {
  return emitLearningEvent({ source: "learn", sourceEventId: `lesson-complete:${lessonId}`, type: "lesson.completed", subjectId: subject, topicId: topic, entityId: lessonId });
}

export function examStartedEvent(examId: string, subject?: string, topic?: string) {
  return emitLearningEvent({ source: "exam-sim", sourceEventId: `exam-start:${examId}`, type: "exam.started", subjectId: subject, topicId: topic, entityId: examId });
}

export function questionAttemptedEvent(examId: string, questionId: string | number, subject?: string, topic?: string, metadata?: Record<string, string | number | boolean | null>) {
  return emitLearningEvent({ source: "exam-sim", sourceEventId: `question-attempt:${examId}:${questionId}`, type: "question.attempted", subjectId: subject, topicId: topic, entityId: String(questionId), attemptId: examId, metadata });
}

export function examCompletedEvent(examId: string, subject?: string, topic?: string, metadata?: Record<string, string | number | boolean | null>) {
  return emitLearningEvent({ source: "exam-sim", sourceEventId: `exam-complete:${examId}`, type: "exam.completed", subjectId: subject, topicId: topic, entityId: examId, attemptId: examId, metadata });
}

export type { LearningEventKind };