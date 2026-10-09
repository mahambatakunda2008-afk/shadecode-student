/**
 * src/lib/challenge/attempt.ts
 *
 * Server-authoritative validation for a challenge attempt. The browser used to
 * send both its own score and the challenger's score, and the API computed
 * `won` from those, so anyone could post a "win". The challenger's score now
 * comes from the stored challenge row, and every client number is bounded.
 */

export interface AttemptInput {
  challenge_id?: unknown;
  percentage?: unknown;
  total_score?: unknown;
  max_score?: unknown;
  time_taken?: unknown;
  grade?: unknown;
}

export interface ValidAttempt {
  challengeId: string;
  percentage: number;
  totalScore: number;
  maxScore: number;
  timeTaken: number | null;
  grade: string | null;
}

const MAX_SECONDS = 24 * 60 * 60;

function boundedNumber(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export function validateAttempt(input: AttemptInput): ValidAttempt | null {
  if (typeof input.challenge_id !== "string" || !/^[0-9a-f-]{8,64}$/i.test(input.challenge_id)) return null;

  const percentage = boundedNumber(input.percentage, 0, 100);
  const maxScore = boundedNumber(input.max_score, 1, 10_000);
  const totalScore = boundedNumber(input.total_score, 0, 10_000);
  if (percentage === null || maxScore === null || totalScore === null || totalScore > maxScore) return null;

  const timeTaken = input.time_taken == null ? null : boundedNumber(input.time_taken, 0, MAX_SECONDS);
  const grade = typeof input.grade === "string" && input.grade.trim() ? input.grade.trim().slice(0, 8) : null;

  // The attempts table stores whole numbers (percentage, scores, seconds are integer columns).
  return { challengeId: input.challenge_id, percentage: Math.round(percentage), totalScore: Math.round(totalScore), maxScore: Math.round(maxScore), timeTaken: timeTaken === null ? null : Math.round(timeTaken), grade };
}

/** Strictly higher than the challenger wins; a tie is not a win. */
export function didWin(percentage: number, challengerPercentage: number): boolean {
  return percentage > challengerPercentage;
}
