import { describe, expect, it } from "vitest";
import { averageMetric, daysSinceLastLesson, progressMetric, welcomeLine } from "./realData";

describe("progressMetric", () => {
  it("is null until there is at least one lesson", () => {
    expect(progressMetric(0, 0)).toBeNull();
    expect(progressMetric(0, 40)).toBeNull();
  });
  it("rounds and clamps real values, including a genuine 0%", () => {
    expect(progressMetric(3, 33.4)).toBe(33);
    expect(progressMetric(3, 0)).toBe(0);
    expect(progressMetric(3, 140)).toBe(100);
  });
  it("rejects non-numeric input", () => {
    expect(progressMetric(3, undefined)).toBeNull();
    expect(progressMetric(3, Number.NaN)).toBeNull();
  });
});

describe("averageMetric", () => {
  it("never shows the 0 default when there are no exams", () => {
    expect(averageMetric(0, 0)).toBeNull();
  });
  it("shows a real average, including a genuine 0%", () => {
    expect(averageMetric(2, 71.6)).toBe(72);
    expect(averageMetric(1, 0)).toBe(0);
  });
});

describe("daysSinceLastLesson / welcomeLine", () => {
  const now = Date.parse("2026-11-14T12:00:00Z");
  it("is null with no attempts or bad dates", () => {
    expect(daysSinceLastLesson([], now)).toBeNull();
    expect(daysSinceLastLesson([{ lastAttempted: null }, { lastAttempted: "nope" }], now)).toBeNull();
  });
  it("uses the most recent attempt", () => {
    const lessons = [{ lastAttempted: "2026-11-01T00:00:00Z" }, { lastAttempted: "2026-11-11T12:00:00Z" }];
    expect(daysSinceLastLesson(lessons, now)).toBe(3);
  });
  it("only says welcome back after a real gap", () => {
    expect(welcomeLine({ hour: 9, loading: false, daysSinceLesson: 3 })).toMatch(/pick up where you left off/);
    expect(welcomeLine({ hour: 9, loading: false, daysSinceLesson: 1 })).toBe("Good morning.");
    expect(welcomeLine({ hour: 20, loading: false, daysSinceLesson: null })).toBe("Good evening.");
    expect(welcomeLine({ hour: 14, loading: true, daysSinceLesson: null })).toBe("Good afternoon, welcome back");
  });
});
