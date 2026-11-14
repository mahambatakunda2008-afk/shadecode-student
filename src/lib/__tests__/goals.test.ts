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

import { suggestWeeklyGoalMinutes, weeklyTotalsBefore } from "../goals";

describe("suggestWeeklyGoalMinutes", () => {
  it("never invents a target without at least two active weeks", () => {
    expect(suggestWeeklyGoalMinutes([])).toBeNull();
    expect(suggestWeeklyGoalMinutes([0, 0, 0, 0])).toBeNull();
    expect(suggestWeeklyGoalMinutes([120, 0, 0, 0])).toBeNull();
  });
  it("averages active weeks and rounds to 15 minutes", () => {
    expect(suggestWeeklyGoalMinutes([100, 140, 0, 0])).toBe(120);
    expect(suggestWeeklyGoalMinutes([100, 130, 95, 110])).toBe(105);
  });
  it("stays inside the valid goal range", () => {
    expect(suggestWeeklyGoalMinutes([10, 12])).toBe(30);
    expect(suggestWeeklyGoalMinutes([9000, 9000])).toBe(4200);
  });
});

describe("weeklyTotalsBefore", () => {
  const weekStart = new Date("2026-11-09T00:00:00Z");
  it("buckets only completed prior weeks and ignores the current week", () => {
    const rows = [
      { created_at: "2026-11-08T10:00:00Z", duration_minutes: 30 },
      { created_at: "2026-11-02T00:00:00Z", duration_minutes: 20 },
      { created_at: "2026-10-30T10:00:00Z", duration_minutes: 45 },
      { created_at: "2026-11-09T01:00:00Z", duration_minutes: 99 },
      { created_at: "2026-09-01T00:00:00Z", duration_minutes: 99 },
      { created_at: "bad", duration_minutes: 99 },
    ];
    expect(weeklyTotalsBefore(rows, weekStart)).toEqual([50, 45, 0, 0]);
  });
});
