/**
 * Deterministic answer scoring used by CortexCore's "practice" intent.
 *
 * This scorer deliberately grades only exact, normalized matches. It does not
 * infer correctness from answer length or treat different wording as wrong.
 * Free-response answers require a marking guide or human/AI rubric grader.
 */

export interface ScoreAnswerInput {
  answer?: string;
  correctAnswer?: string;
  expected?: string;
  topic?: string;
  [key: string]: unknown;
}

export interface ScoreAnswerResult {
  /** Null means the answer could not be graded reliably. */
  score: number | null;
  feedback: string;
  weakTopics: string[];
  needsReview: boolean;
}

function normalizeExactAnswer(value: string): string {
  return value.trim().replace(/\\s+/g, " ").toLocaleLowerCase();
}

export async function scoreAnswer(
  payload: ScoreAnswerInput = {}
): Promise<ScoreAnswerResult> {
  const answer = String(payload.answer ?? "").trim();
  const expected = String(payload.correctAnswer ?? payload.expected ?? "").trim();

  if (!expected) {
    return {
      score: null,
      feedback: "I can't reliably grade this response without a marking guide. Your answer has been saved for review.",
      weakTopics: [],
      needsReview: true,
    };
  }

  if (!answer) {
    return {
      score: null,
      feedback: "No answer was provided. Add a marking guide or worked solution to assess this response reliably.",
      weakTopics: [],
      needsReview: true,
    };
  }

  if (normalizeExactAnswer(answer) === normalizeExactAnswer(expected)) {
    return {
      score: 100,
      feedback: "The answer matches the supplied reference answer.",
      weakTopics: [],
      needsReview: false,
    };
  }

  return {
    score: null,
    feedback: "This answer differs from the reference wording. It may still be correct; a marking guide or human review is needed.",
    weakTopics: [],
    needsReview: true,
  };
}
