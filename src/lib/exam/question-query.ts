export type QuestionQuery = {
  q?: string;
  paperId?: string;
  topicId?: string;
  difficulty?: string;
  limit: number;
};

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

export function normalizeQuestionQuery(input: Record<string, string | null | undefined>): QuestionQuery {
  const q = input.q?.trim().slice(0, 300) || undefined;
  const paperId = input.paperId?.trim() || undefined;
  const topicId = input.topicId?.trim() || undefined;
  const difficulty = input.difficulty?.trim().toLowerCase() || undefined;
  const parsedLimit = Number(input.limit);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(parsedLimit)))
    : DEFAULT_LIMIT;

  if (difficulty && !DIFFICULTIES.has(difficulty)) {
    throw new Error("difficulty must be easy, medium, or hard");
  }

  if (!q && !paperId && !topicId) {
    throw new Error("q, paperId, or topicId is required");
  }

  return { q, paperId, topicId, difficulty, limit };
}
