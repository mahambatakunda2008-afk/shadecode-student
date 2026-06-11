/**
 * /lib/cortex/tools/scoring.ts
 *
 * Deterministic answer scoring used by CortexCore's "practice" intent.
 * No external dependencies — keeps /api/cortex functional without AI keys.
 */

export interface ScoreAnswerInput {
  answer?: string;
  correctAnswer?: string;
  expected?: string;
  topic?: string;
  [key: string]: unknown;
}

export interface ScoreAnswerResult {
  score: number;
  feedback: string;
  weakTopics: string[];
}

export async function scoreAnswer(
  payload: ScoreAnswerInput = {}
): Promise<ScoreAnswerResult> {
  const answer = String(payload.answer ?? "").trim();
  const expected = String(payload.correctAnswer ?? payload.expected ?? "").trim();

  let score: number;
  if (expected) {
    score =
      answer && answer.toLowerCase() === expected.toLowerCase()
        ? 100
        : answer
          ? 40
          : 0;
  } else {
    // No reference answer — fall back to an effort/length heuristic.
    score = answer.length >= 40 ? 80 : answer.length >= 10 ? 60 : answer ? 40 : 0;
  }

  const topic = typeof payload.topic === "string" ? payload.topic.trim() : "";
  const weakTopics = score < 60 && topic ? [topic] : [];

  const feedback =
    score >= 80
      ? "Strong answer — the core concept is understood."
      : score >= 50
        ? "Partial understanding — review the key steps and try again."
        : "Needs work — revisit this topic before moving on.";

  return { score, feedback, weakTopics };
}
