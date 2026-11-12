import { allReviewableQuestions, questionReviewId } from "./registry";

let byText: Map<string, ReturnType<typeof allReviewableQuestions>> | null = null;

/**
 * The review id of a built-in question, or null when it is not one of the reviewed hand-written questions
 * (for example an AI-generated question). Matching is exact on wording, options and answer, so a question
 * whose text was edited after review no longer matches and is never shown as verified.
 */
export function findReviewId(question: string, options: string[] | undefined, answer: string | undefined): string | null {
  if (!options || !answer) return null;
  if (!byText) {
    byText = new Map();
    for (const q of allReviewableQuestions()) {
      const key = q.question.trim();
      byText.set(key, [...(byText.get(key) ?? []), q]);
    }
  }
  for (const candidate of byText.get(question.trim()) ?? []) {
    if (questionReviewId(candidate.bank, question, options, answer) === candidate.id) return candidate.id;
  }
  return null;
}
