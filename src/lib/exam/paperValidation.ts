import type { ExamQuestion } from "./types";

/**
 * Validate untrusted generated paper data before the timed exam starts.
 * An array that merely exists is not necessarily a usable paper.
 */
export function isValidGeneratedPaper(value: unknown, expectedCount: number): value is ExamQuestion[] {
  if (!Number.isInteger(expectedCount) || expectedCount < 1) return false;
  if (!Array.isArray(value) || value.length !== expectedCount) return false;

  const ids = new Set<number>();
  const questionTexts = new Set<string>();
  const allowedTypes = new Set(["multiple_choice", "short_answer", "structured", "essay"]);

  for (const item of value) {
    if (!item || typeof item !== "object") return false;
    const question = item as Partial<ExamQuestion>;

    if (typeof question.id !== "number" || !Number.isInteger(question.id) || ids.has(question.id)) return false;
    if (typeof question.type !== "string" || !allowedTypes.has(question.type)) return false;
    if (typeof question.question !== "string" || question.question.trim().length < 8) return false;
    if (typeof question.topic !== "string" || !question.topic.trim()) return false;
    if (typeof question.marks !== "number" || !Number.isFinite(question.marks) || question.marks <= 0 || question.marks > 100) return false;

    const normalizedQuestion = question.question.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (questionTexts.has(normalizedQuestion)) return false;
    questionTexts.add(normalizedQuestion);
    ids.add(question.id);

    if (question.type === "multiple_choice") {
      if (!Array.isArray(question.options) || question.options.length < 2) return false;
      if (question.options.some((option) => typeof option !== "string" || !option.trim())) return false;
    }
    if (question.options !== undefined && (!Array.isArray(question.options) || question.options.some((option) => typeof option !== "string"))) return false;
  }

  return true;
}
