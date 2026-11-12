export interface ExamLearningContext {
  subject?: string;
  topic?: string;
}

/** Prefer the final exam-room selection over route defaults captured by the parent. */
export function resolveExamLearningContext(
  result: ExamLearningContext,
  fallback: ExamLearningContext,
): { subject?: string; topic?: string } {
  const subject = result.subject?.trim() || fallback.subject?.trim();
  const topic = result.topic?.trim() || fallback.topic?.trim();
  return {
    ...(subject ? { subject } : {}),
    ...(topic ? { topic } : {}),
  };
}
