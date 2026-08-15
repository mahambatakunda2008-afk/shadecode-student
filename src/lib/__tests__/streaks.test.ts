import { describe, it, expect } from "vitest";
import { computeStreakUpdate, getISOWeekKey, isFreezeAvailable, dateKey } from "../streaks";

describe("getISOWeekKey", () => {
  it("computes the correct ISO week for a known date", () => {
    // 2026-08-13 is a Thursday in ISO week 33 of 2026.
    expect(getISOWeekKey(new Date(Date.UTC(2026, 7, 13)))).toBe("2026-W33");
  });

  it("handles the year-boundary edge case correctly", () => {
    // 2026-01-01 is a Thursday, so it falls in ISO week 1 of 2026.
    expect(getISOWeekKey(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-W01");
  });
});

describe("isFreezeAvailable", () => {
  const now = new Date(Date.UTC(2026, 7, 13));

  it("is available when no freeze has been used", () => {
    expect(isFreezeAvailable(undefined, now)).toBe(true);
  });

  it("is unavailable when already used this ISO week", () => {
    expect(isFreezeAvailable(getISOWeekKey(now), now)).toBe(false);
  });

  it("is available again in a new ISO week", () => {
    expect(isFreezeAvailable("2026-W20", now)).toBe(true);
  });
});

describe("computeStreakUpdate", () => {
  const day = (offset: number) => {
    const d = new Date(Date.UTC(2026, 7, 13));
    d.setUTCDate(d.getUTCDate() + offset);
    return d;
  };

  it("makes no change when already studied today", () => {
    const today = day(0);
    const result = computeStreakUpdate(
      { currentStreak: 5, longestStreak: 10, lastStudyDate: dateKey(today) },
      true,
      today
    );
    expect(result).toEqual({ streak: 5, longestStreak: 10, freezeWeek: undefined, freezeConsumed: false });
  });

  it("increments the streak on a consecutive day", () => {
    const today = day(0);
    const yesterday = dateKey(day(-1));
    const result = computeStreakUpdate(
      { currentStreak: 5, longestStreak: 10, lastStudyDate: yesterday },
      true,
      today
    );
    expect(result.streak).toBe(6);
    expect(result.longestStreak).toBe(10);
    expect(result.freezeConsumed).toBe(false);
  });

  it("raises longestStreak when the new streak exceeds it", () => {
    const today = day(0);
    const yesterday = dateKey(day(-1));
    const result = computeStreakUpdate(
      { currentStreak: 10, longestStreak: 10, lastStudyDate: yesterday },
      true,
      today
    );
    expect(result.streak).toBe(11);
    expect(result.longestStreak).toBe(11);
  });

  it("resets the streak to 1 on a gap of 2+ days with no freeze available", () => {
    const today = day(0);
    const twoDaysAgo = dateKey(day(-2));
    const result = computeStreakUpdate(
      { currentStreak: 5, longestStreak: 10, lastStudyDate: twoDaysAgo, freezeWeek: getISOWeekKey(today) },
      true,
      today
    );
    expect(result.streak).toBe(1);
    expect(result.freezeConsumed).toBe(false);
  });

  it("consumes the weekly freeze to forgive a single missed day", () => {
    const today = day(0);
    const twoDaysAgo = dateKey(day(-2));
    const result = computeStreakUpdate(
      { currentStreak: 5, longestStreak: 10, lastStudyDate: twoDaysAgo },
      true,
      today
    );
    expect(result.streak).toBe(6);
    expect(result.freezeConsumed).toBe(true);
    expect(result.freezeWeek).toBe(getISOWeekKey(today));
  });

  it("does not grant a second freeze in the same ISO week", () => {
    const today = day(0);
    const twoDaysAgo = dateKey(day(-2));
    const result = computeStreakUpdate(
      { currentStreak: 5, longestStreak: 10, lastStudyDate: twoDaysAgo, freezeWeek: getISOWeekKey(today) },
      true,
      today
    );
    expect(result.streak).toBe(1);
    expect(result.freezeConsumed).toBe(false);
  });

  it("resets to 1 on a gap larger than one missed day even with a freeze available", () => {
    const today = day(0);
    const fourDaysAgo = dateKey(day(-4));
    const result = computeStreakUpdate(
      { currentStreak: 5, longestStreak: 10, lastStudyDate: fourDaysAgo },
      true,
      today
    );
    expect(result.streak).toBe(1);
    expect(result.freezeConsumed).toBe(false);
  });

  it("starts a fresh streak at 1 on first-ever activity", () => {
    const today = day(0);
    const result = computeStreakUpdate({ currentStreak: 0, longestStreak: 0 }, true, today);
    expect(result.streak).toBe(1);
  });

  it("breaks the streak to 0 when explicitly checked with studiedToday=false after a gap", () => {
    const today = day(0);
    const threeDaysAgo = dateKey(day(-3));
    const result = computeStreakUpdate(
      { currentStreak: 5, longestStreak: 10, lastStudyDate: threeDaysAgo },
      false,
      today
    );
    expect(result.streak).toBe(0);
  });
});
