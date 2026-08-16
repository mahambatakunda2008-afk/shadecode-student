import { describe, expect, it } from "vitest";
import { calculateXP, type XPEvent } from "../xp-ledger";

describe("XP event ledger", () => {
  it("derives total XP from immutable events", () => {
    const events: XPEvent[] = [
      { id: "1", userId: "u", kind: "task_completed", amount: 10, createdAt: "2026-08-16T00:00:00Z" },
      { id: "2", userId: "u", kind: "lesson_completed", amount: 20, createdAt: "2026-08-16T00:01:00Z" },
      { id: "3", userId: "u", kind: "challenge_completed", amount: 25, createdAt: "2026-08-16T00:02:00Z" },
    ];
    expect(calculateXP(events)).toBe(55);
  });
});
