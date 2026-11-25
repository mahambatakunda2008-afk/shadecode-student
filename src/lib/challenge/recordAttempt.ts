import type { LearningSignal } from "@/lib/learning/signals";

/**
 * Battle-attempt writes. The legacy self-reported route uses recordBattleAttempt;
 * server-marked papers use the atomic recordChallengeMarkSubmission RPC.
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
  from(table: "challenge_attempts"): {
    insert(row: Record<string, unknown>): PromiseLike<{ error: unknown }>;
  };
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

export interface ChallengeMarkSubmissionWrite {
  challengeId: string;
  userId: string;
  submissionId: string;
  result: unknown;
  attempt: Omit<AttemptWrite, "challengeId" | "userId"> | null;
  signals: LearningSignal[];
}

interface RpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

export async function recordChallengeMarkSubmission(
  admin: RpcClient | null,
  submission: ChallengeMarkSubmissionWrite,
): Promise<{ ok: boolean; inserted: boolean; result?: unknown }> {
  if (!admin) return { ok: false, inserted: false };
  const { data, error } = await admin.rpc("record_challenge_mark_submission", {
    p_challenge_id: submission.challengeId,
    p_user_id: submission.userId,
    p_submission_id: submission.submissionId,
    p_result: submission.result,
    p_attempt: submission.attempt,
    p_signals: submission.signals,
  });
  if (error) return { ok: false, inserted: false };

  const row = (Array.isArray(data) ? data[0] : data) as { inserted?: unknown; result?: unknown } | null;
  if (!row || typeof row.inserted !== "boolean" || row.result == null) return { ok: false, inserted: false };
  return { ok: true, inserted: row.inserted, result: row.result };
}
