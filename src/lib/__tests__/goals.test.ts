import { describe, it, expect } from "vitest";
import { getWeekStartUTC, computeGoalProgress, isValidWeeklyGoalMinutes } from "../goals";

describe("getWeekStartUTC", () => {
  it("returns the same Monday for any day within that week", () => {
    // 2026-08-13 is a Thursday; the Monday of that week is 2026-08-10.
    const thursday = new Date(Date.UTC(2026, 7, 13));
    const monday = getWeekStartUTC(thursday);
    expect(monday.toISOString().split("T")[0]).toBe("2026-08-10");
  });

  it("treats Sunday as the last day of the ISO week, not the first", () => {
    // 2026-08-16 is a Sunday, still part of the week starting 2026-08-10.
    const sunday = new Date(Date.UTC(2026, 7, 16));
    const monday = getWeekStartUTC(sunday);
    expect(monday.toISOString().split("T")[0]).toBe("2026-08-10");
  });

  it("returns the date itself when given a Monday", () => {
    const monday = new Date(Date.UTC(2026, 7, 10));
    expect(getWeekStartUTC(monday).toISOString().split("T")[0]).toBe("2026-08-10");
  });
});

describe("computeGoalProgress", () => {
  it("returns null percentComplete when no goal is set", () => {
    const result = computeGoalProgress(null, 120);
    expect(result.percentComplete).toBeNull();
    expect(result.goalMet).toBe(false);
  });

  it("returns null percentComplete when goal is 0 or negative", () => {
    expect(computeGoalProgress(0, 60).percentComplete).toBeNull();
    expect(computeGoalProgress(-10, 60).percentComplete).toBeNull();
  });

  it("computes percent complete correctly for partial progress", () => {
    const result = computeGoalProgress(300, 150);
    expect(result.percentComplete).toBe(50);
    expect(result.goalMet).toBe(false);
  });

  it("caps percent complete at 100 even when goal is exceeded", () => {
    const result = computeGoalProgress(100, 250);
    expect(result.percentComplete).toBe(100);
    expect(result.goalMet).toBe(true);
  });

  it("marks the goal met exactly at the target", () => {
    const result = computeGoalProgress(200, 200);
    expect(result.percentComplete).toBe(100);
    expect(result.goalMet).toBe(true);
  });
});

describe("isValidWeeklyGoalMinutes", () => {
  it("accepts values within the valid range", () => {
    expect(isValidWeeklyGoalMinutes(300)).toBe(true);
    expect(isValidWeeklyGoalMinutes(30)).toBe(true);
    expect(isValidWeeklyGoalMinutes(4200)).toBe(true);
  });

  it("rejects values outside the valid range", () => {
    expect(isValidWeeklyGoalMinutes(29)).toBe(false);
    expect(isValidWeeklyGoalMinutes(4201)).toBe(false);
    expect(isValidWeeklyGoalMinutes(-5)).toBe(false);
  });

  it("rejects non-numeric or non-finite input", () => {
    expect(isValidWeeklyGoalMinutes("300")).toBe(false);
    expect(isValidWeeklyGoalMinutes(NaN)).toBe(false);
    expect(isValidWeeklyGoalMinutes(undefined)).toBe(false);
    expect(isValidWeeklyGoalMinutes(Infinity)).toBe(false);
  });
});
