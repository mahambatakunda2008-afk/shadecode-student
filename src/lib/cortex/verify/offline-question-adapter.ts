import type { ExamQuestion } from "@/lib/exam/types";
import type { OfflineVerifyRubric } from "./offline-marking";
import { validateCuratedMarkingRubric } from "./marking-resource";

/**
 * Converts only question types with an explicit deterministic answer key.
 * Structured, essay and unkeyed short-answer questions deliberately return null.
 */
export function buildOfflineVerifyRubric(question: ExamQuestion): OfflineVerifyRubric | null {
  const marks = Math.max(1, Math.round(Number(question.marks) || 1));
  const criterion = question.numeric ? "Numerical answer" : "Selected option";

  if (question.offlineMarking?.version === 1 && question.syllabusIdentity) {
    const candidate = question.offlineMarking;
    const total = candidate.criteria.reduce((sum, item) => sum + item.marks, 0);
    const rubric = {
      version: 1 as const,
      criteria: candidate.criteria,
      totalMarks: total,
      sourceEvidenceId: candidate.source.id,
      syllabusIdentity: candidate.source.syllabusIdentity,
      reviewerId: candidate.reviewerId,
      reviewedAt: candidate.reviewedAt,
      limitations: candidate.limitations,
    };
    const evidenceMatchesQuestion = JSON.stringify(candidate.source.syllabusIdentity) === JSON.stringify(question.syllabusIdentity);
    const validation = validateCuratedMarkingRubric(rubric, candidate.source);
    if (evidenceMatchesQuestion && total === marks && validation.valid) {
      return { version: 1, kind: "structured-points", marks: total, criteria: candidate.criteria };
    }
  }

  if (question.numeric && Number.isFinite(question.numeric.exact) &&
      Number.isFinite(question.numeric.tolerance) && question.numeric.tolerance >= 0) {
    return {
      version: 1,
      kind: "exact-number",
      answer: question.numeric.exact,
      tolerance: question.numeric.tolerance,
      marks,
      criterion,
      explanation: question.numeric.unit
        ? `Compare the numerical result and required unit (${question.numeric.unit}) with the supplied answer key.`
        : "Compare the numerical result with the supplied answer key.",
    };
  }

  if (question.type === "multiple_choice" && question.modelAnswer?.trim()) {
    return {
      version: 1,
      kind: "multiple-choice",
      answer: question.modelAnswer.trim(),
      marks,
      criterion,
      explanation: "The selected option was compared with the question's supplied answer key.",
    };
  }

  return null;
}
