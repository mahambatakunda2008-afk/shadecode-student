import type { VerifyLearningSignal } from "@/lib/cortex/verify/learner-model";

export type CrossProductEvidenceInput = {
  source: string;
  sourceEventId: string;
  type: string;
  occurredAt?: string;
  subjectId?: string;
  topicId?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const ELIGIBLE_EVENT_TYPES = new Set([
  "question.attempted", "question_attempted",
  "lesson.completed", "lesson_completed",
  "activity.completed", "activity_completed",
  "quiz.completed", "quiz_completed",
  "exam.completed", "exam_completed",
  "project.stage_completed", "project_stage_completed",
  "project.evidence_added",
  "mistake.reviewed", "mistake_reviewed",
]);

/** Convert only scored, non-self-assessed product evidence into private local learning input. */
export function toPrivateCrossProductSignal(
  input: CrossProductEvidenceInput,
): VerifyLearningSignal | null {
  if (!input.source?.trim() || !input.sourceEventId?.trim() ||
      !input.subjectId?.trim() || !input.topicId?.trim() ||
      !ELIGIBLE_EVENT_TYPES.has(input.type) ||
      input.metadata?.selfAssessment === true ||
      input.metadata?.aggregateOnly === true) return null;

  const correct = input.metadata?.correct;
  const rawScore = input.metadata?.evidenceScore ?? input.metadata?.percentage;
  const score = typeof rawScore === "number" && Number.isFinite(rawScore)
    ? rawScore
    : typeof correct === "boolean" ? (correct ? 100 : 0) : null;
  if (score === null || score < 0 || score > 100) return null;

  return {
    subject: input.subjectId.trim(),
    topic: input.topicId.trim(),
    score,
    correct: typeof correct === "boolean" ? correct : score >= 50,
    misconceptionTags: typeof input.metadata?.misconceptionTags === "string"
      ? input.metadata.misconceptionTags.split(";").map(value => value.trim()).filter(Boolean).slice(0, 8)
      : [],
    occurredAt: input.occurredAt,
  };
}

export function crossProductEvidenceEventKey(input: Pick<CrossProductEvidenceInput, "source" | "sourceEventId">) {
  return `${input.source}:${input.sourceEventId}`;
}

export function crossProductEvidenceStorageKey(ownerId: string) {
  return "shadecode:cortex:cross-product-evidence:v1:" + encodeURIComponent(ownerId);
}
