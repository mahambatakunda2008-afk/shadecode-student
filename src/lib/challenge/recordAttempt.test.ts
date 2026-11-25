import { describe, expect, it, vi } from "vitest";
import { recordBattleAttempt, recordChallengeMarkSubmission, type AttemptWrite, type ChallengeMarkSubmissionWrite } from "./recordAttempt";

const legacyAttempt: AttemptWrite = { challengeId: "c1", userId: "u1", userName: "Tendai", percentage: 80, totalScore: 8, maxScore: 10, timeTaken: 300, grade: "A", won: true, verified: false };
const submission: ChallengeMarkSubmissionWrite = {
  challengeId: "c1",
  userId: "u1",
  submissionId: "s1",
  result: { percentage: 80, won: true, verified: true },
  attempt: { userName: "Tendai", percentage: 80, totalScore: 8, maxScore: 10, timeTaken: 300, grade: "A", won: true, verified: true },
  signals: [{ kind: "battle", source: "curated", item_key: null, syllabus_id: null, topic_key: null, correct: true, score: 80, mistake_id: null, time_spent_seconds: 30, props: {} }],
};

describe("recordBattleAttempt legacy self-reported write", () => {
  it("preserves the existing challenge_attempts insert contract", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const admin = { from: vi.fn().mockReturnValue({ insert }) };
    await expect(recordBattleAttempt(admin, legacyAttempt)).resolves.toEqual({ ok: true });
    expect(admin.from).toHaveBeenCalledWith("challenge_attempts");
    expect(insert).toHaveBeenCalledWith({ challenge_id: "c1", user_id: "u1", user_name: "Tendai", percentage: 80, total_score: 8, max_score: 10, time_taken: 300, grade: "A", won: true, verified: false });
  });
  it("reports a failed insert", async () => {
    const admin = { from: () => ({ insert: async () => ({ error: { message: "boom" } }) }) };
    await expect(recordBattleAttempt(admin, legacyAttempt)).resolves.toEqual({ ok: false });
  });
  it("does nothing without an admin client", async () => {
    await expect(recordBattleAttempt(null, legacyAttempt)).resolves.toEqual({ ok: false });
  });
});

describe("recordChallengeMarkSubmission", () => {
  it("atomically records a first submission and its result", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ inserted: true, result: submission.result }], error: null });
    await expect(recordChallengeMarkSubmission({ rpc }, submission)).resolves.toEqual({ ok: true, inserted: true, result: submission.result });
    expect(rpc).toHaveBeenCalledWith("record_challenge_mark_submission", {
      p_challenge_id: "c1", p_user_id: "u1", p_submission_id: "s1",
      p_result: submission.result, p_attempt: submission.attempt, p_signals: submission.signals,
    });
  });
  it("returns the original result for a replay", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ inserted: false, result: submission.result }], error: null });
    await expect(recordChallengeMarkSubmission({ rpc }, submission)).resolves.toEqual({ ok: true, inserted: false, result: submission.result });
  });
  it("fails closed when the RPC errors or returns an invalid contract", async () => {
    await expect(recordChallengeMarkSubmission({ rpc: async () => ({ data: null, error: { message: "offline" } }) }, submission)).resolves.toEqual({ ok: false, inserted: false });
    await expect(recordChallengeMarkSubmission({ rpc: async () => ({ data: [], error: null }) }, submission)).resolves.toEqual({ ok: false, inserted: false });
    await expect(recordChallengeMarkSubmission(null, submission)).resolves.toEqual({ ok: false, inserted: false });
  });
});
