import type { ExamQuestion } from "@/lib/exam/types";
import type { OfflineVerifyRubric } from "./offline-marking";

/**
 * Converts only question types with an explicit deterministic answer key.
 * Structured, essay and unkeyed short-answer questions deliberately return null.
 */
export function buildOfflineVerifyRubric(question: ExamQuestion): OfflineVerifyRubric | null {
  const marks = Math.max(1, Math.round(Number(question.marks) || 1));
  const criterion = question.numeric ? "Numerical answer" : "Selected option";

  if (question.offlineMarking?.version === 1 && question.offlineMarking.criteria.length > 0) {
    const criteria = question.offlineMarking.criteria;
    const total = criteria.reduce((sum, item) => sum + item.marks, 0);
    if (criteria.every(item => Number.isFinite(item.marks) && item.marks > 0) && total > 0) {
      return { version: 1, kind: "structured-points", marks: total, criteria };
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
