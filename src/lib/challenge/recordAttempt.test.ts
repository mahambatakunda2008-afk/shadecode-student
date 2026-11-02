import { describe, expect, it, vi } from "vitest";
import { recordBattleAttempt, type AttemptWrite } from "./recordAttempt";

const attempt: AttemptWrite = { challengeId: "c1", userId: "u1", userName: "Tendai", percentage: 80, totalScore: 8, maxScore: 10, timeTaken: 300, grade: "A", won: true, verified: true };

describe("recordBattleAttempt", () => {
  it("writes every column including verified, via the supplied client", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const admin = { from: vi.fn().mockReturnValue({ insert }) };
    await expect(recordBattleAttempt(admin, attempt)).resolves.toEqual({ ok: true });
    expect(admin.from).toHaveBeenCalledWith("challenge_attempts");
    expect(insert).toHaveBeenCalledWith({ challenge_id: "c1", user_id: "u1", user_name: "Tendai", percentage: 80, total_score: 8, max_score: 10, time_taken: 300, grade: "A", won: true, verified: true });
  });
  it("reports failure instead of throwing when the insert errors", async () => {
    const admin = { from: () => ({ insert: async () => ({ error: { message: "boom" } }) }) };
    await expect(recordBattleAttempt(admin, attempt)).resolves.toEqual({ ok: false });
  });
  it("does nothing without a service-role client", async () => {
    await expect(recordBattleAttempt(null, attempt)).resolves.toEqual({ ok: false });
  });
});
