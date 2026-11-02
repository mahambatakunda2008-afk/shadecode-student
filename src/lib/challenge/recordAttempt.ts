/**
 * src/lib/challenge/recordAttempt.ts
 *
 * The single place a battle attempt is written. It must be called with the
 * service-role client: the open INSERT policy on challenge_attempts is removed
 * so a browser can never write `won` or `verified` itself.
 */

export interface AttemptWrite {
  challengeId: string;
  userId: string;
  userName: string | null;
  percentage: number;
  totalScore: number;
  maxScore: number;
  timeTaken: number;
  grade: string;
  won: boolean;
  verified: boolean;
}

interface InsertCapableClient {
  from(table: "challenge_attempts"): { insert(row: Record<string, unknown>): PromiseLike<{ error: unknown }> };
}

export async function recordBattleAttempt(admin: InsertCapableClient | null, attempt: AttemptWrite): Promise<{ ok: boolean }> {
  if (!admin) return { ok: false };
  const { error } = await admin.from("challenge_attempts").insert({
    challenge_id: attempt.challengeId,
    user_id: attempt.userId,
    user_name: attempt.userName,
    percentage: attempt.percentage,
    total_score: attempt.totalScore,
    max_score: attempt.maxScore,
    time_taken: attempt.timeTaken,
    grade: attempt.grade,
    won: attempt.won,
    verified: attempt.verified,
  });
  return { ok: !error };
}
