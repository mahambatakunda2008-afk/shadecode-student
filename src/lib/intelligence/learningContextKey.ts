/**
 * Stable, human-readable keys for grouping learning evidence across Learn and
 * Exam Simulation. These are learner topic keys, not claims of a verified
 * exam-board syllabus identifier.
 */
export function normalizeLearningContextLabel(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function normalizeLearningContext(
  subject?: string,
  topic?: string,
): { subjectId?: string; topicId?: string } {
  const subjectId = typeof subject === "string" ? normalizeLearningContextLabel(subject) : "";
  const topicId = typeof topic === "string" ? normalizeLearningContextLabel(topic) : "";
  return {
    ...(subjectId ? { subjectId } : {}),
    ...(topicId ? { topicId } : {}),
  };
}
