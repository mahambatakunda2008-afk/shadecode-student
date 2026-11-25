/**
 * Persists one verified challenge submission through a service-role-only,
 * atomic database function. A replay returns the original marking result and
 * never creates a second battle attempt.
 */
export interface AttemptWrite {
  challengeId: string;
  userId: string;
  submissionId: string;
  result: unknown;
  attempt: {
    userName: string | null;
    percentage: number;
    totalScore: number;
    maxScore: number;
    timeTaken: number;
    grade: string;
    won: boolean;
    verified: boolean;
  } | null;
}

interface RpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

export async function recordBattleAttempt(
  admin: RpcClient | null,
  submission: AttemptWrite,
): Promise<{ ok: boolean; inserted: boolean; result?: unknown }> {
  if (!admin) return { ok: false, inserted: false };
  const { data, error } = await admin.rpc("record_challenge_mark_submission", {
    p_challenge_id: submission.challengeId,
    p_user_id: submission.userId,
    p_submission_id: submission.submissionId,
    p_result: submission.result,
    p_attempt: submission.attempt,
  });
  if (error) return { ok: false, inserted: false };

  const row = (Array.isArray(data) ? data[0] : data) as { inserted?: unknown; result?: unknown } | null;
  if (!row || typeof row.inserted !== "boolean" || row.result == null) return { ok: false, inserted: false };
  return { ok: true, inserted: row.inserted, result: row.result };
}
