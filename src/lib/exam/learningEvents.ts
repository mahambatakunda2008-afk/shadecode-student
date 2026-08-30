import { emitLearningEvent } from "@/lib/intelligence/emitLearningEvent";

export function emitExamStarted(examId: string, subject: string, topic?: string) {
  return emitLearningEvent({ source: "exam-simulation", sourceEventId: `exam-start:${examId}`, type: "exam.started", entityId: examId, subjectId: subject, topicId: topic });
}

export function emitQuestionAttempted(examId: string, questionId: number, subject: string, topic?: string, attemptId?: string) {
  return emitLearningEvent({ source: "exam-simulation", sourceEventId: `question-attempt:${examId}:${questionId}:${attemptId ?? "default"}`, type: "question.attempted", entityId: String(questionId), attemptId, subjectId: subject, topicId: topic });
}

export function emitExamCompleted(examId: string, subject: string, topic?: string, percentage?: number) {
  return emitLearningEvent({ source: "exam-simulation", sourceEventId: `exam-complete:${examId}`, type: "exam.completed", entityId: examId, subjectId: subject, topicId: topic, metadata: { percentage: percentage ?? null } });
}
