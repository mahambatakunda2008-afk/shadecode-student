import { describe, expect, it, vi } from "vitest";
import { recordBattleAttempt, type AttemptWrite } from "./recordAttempt";

const submission: AttemptWrite = {
  challengeId: "c1",
  userId: "u1",
  submissionId: "s1",
  result: { percentage: 80, won: true, verified: true },
  attempt: { userName: "Tendai", percentage: 80, totalScore: 8, maxScore: 10, timeTaken: 300, grade: "A", won: true, verified: true },
};

describe("recordBattleAttempt", () => {
  it("atomically records a first submission and its result", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ inserted: true, result: submission.result }], error: null });
    await expect(recordBattleAttempt({ rpc }, submission)).resolves.toEqual({ ok: true, inserted: true, result: submission.result });
    expect(rpc).toHaveBeenCalledWith("record_challenge_mark_submission", {
      p_challenge_id: "c1",
      p_user_id: "u1",
      p_submission_id: "s1",
      p_result: submission.result,
      p_attempt: submission.attempt,
    });
  });

  it("returns the original result for a replay without claiming a new insert", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ inserted: false, result: submission.result }], error: null });
    await expect(recordBattleAttempt({ rpc }, submission)).resolves.toEqual({ ok: true, inserted: false, result: submission.result });
  });

  it("fails closed when the RPC errors or returns an invalid contract", async () => {
    await expect(recordBattleAttempt({ rpc: async () => ({ data: null, error: { message: "offline" } }) }, submission)).resolves.toEqual({ ok: false, inserted: false });
    await expect(recordBattleAttempt({ rpc: async () => ({ data: [], error: null }) }, submission)).resolves.toEqual({ ok: false, inserted: false });
  });

  it("does nothing without a service-role client", async () => {
    await expect(recordBattleAttempt(null, submission)).resolves.toEqual({ ok: false, inserted: false });
  });
});
