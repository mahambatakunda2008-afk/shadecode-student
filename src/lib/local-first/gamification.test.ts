import { describe, expect, it } from "vitest";
import { applyXpReward } from "./gamification";

describe("local XP reward idempotency", () => {
  const now = new Date("2026-11-16T10:00:00.000Z");

  it("awards a new task completion once", () => {
    const first = applyXpReward(null, 10, "task-complete:task-1", now);
    expect(first.totalXp).toBe(10);
    expect(first.level).toBe(1);
    expect(first.appliedEventIds).toEqual(["task-complete:task-1"]);
  });

  it("does not award XP again when the same task event is replayed", () => {
    const first = applyXpReward(null, 10, "task-complete:task-1", now);
    const replay = applyXpReward(first, 10, "task-complete:task-1", new Date("2026-11-16T10:05:00.000Z"));
    expect(replay).toBe(first);
    expect(replay.totalXp).toBe(10);
    expect(replay.updatedAt).toBe(first.updatedAt);
  });

  it("awards distinct task completions independently", () => {
    const first = applyXpReward(null, 10, "task-complete:task-1", now);
    const second = applyXpReward(first, 10, "task-complete:task-2", now);
    expect(second.totalXp).toBe(20);
    expect(second.appliedEventIds).toEqual(["task-complete:task-1", "task-complete:task-2"]);
  });

  it("rejects invalid reward amounts and empty idempotency keys", () => {
    expect(() => applyXpReward(null, 0, "task-complete:task-1", now)).toThrow("XP amount must be positive");
    expect(() => applyXpReward(null, 10, "   ", now)).toThrow("XP idempotency key cannot be empty");
  });
});
