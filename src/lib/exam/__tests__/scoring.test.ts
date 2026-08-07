/**
 * /lib/exam/__tests__/scoring.test.ts
 *
 * Exam Scoring - Tests
 *
 * Focused on the AI-grader clamp: flagged as an outstanding risk in
 * docs/FINAL_AUDIT_REPORT_2026-08.md ("no observed occurrence" at the
 * time, but undefended). These tests lock in the defense so a future
 * refactor can't silently drop it.
 */

import { describe, it, expect } from "vitest";
import { getGrade, calculateExamScore } from "../scoring";

describe("getGrade", () => {
  it("maps percentages to the correct grade boundary", () => {
    expect(getGrade(95)).toBe("A*");
    expect(getGrade(90)).toBe("A*");
    expect(getGrade(89)).toBe("A");
    expect(getGrade(80)).toBe("A");
    expect(getGrade(79)).toBe("B");
    expect(getGrade(70)).toBe("B");
    expect(getGrade(69)).toBe("C");
    expect(getGrade(60)).toBe("C");
    expect(getGrade(59)).toBe("D");
    expect(getGrade(50)).toBe("D");
    expect(getGrade(49)).toBe("E");
    expect(getGrade(40)).toBe("E");
    expect(getGrade(39)).toBe("U");
    expect(getGrade(0)).toBe("U");
  });
});

describe("calculateExamScore", () => {
  const questions = [
    { id: "q1", marks: 10 },
    { id: "q2", marks: 5 },
    { id: "q3", marks: 1 },
  ];

  it("sums correctly-scored results with no clamping needed", () => {
    const results = [
      { questionId: "q1", score: 8 },
      { questionId: "q2", score: 5 },
      { questionId: "q3", score: 0 },
    ];
    const summary = calculateExamScore(questions, results);
    expect(summary.totalScore).toBe(13);
    expect(summary.maxScore).toBe(16);
    expect(summary.percentage).toBe(Math.round((13 / 16) * 100));
    expect(summary.grade).toBe(getGrade(summary.percentage));
  });

  it("clamps a score above the question's max marks (hallucinating grader)", () => {
    const results = [
      { questionId: "q1", score: 500 }, // way over the 10-mark cap
      { questionId: "q2", score: 5 },
      { questionId: "q3", score: 1 },
    ];
    const summary = calculateExamScore(questions, results);
    // Without the clamp this would be 506/16 = way over 100%.
    expect(summary.totalScore).toBe(16); // 10 + 5 + 1, q1 clamped to its max
    expect(summary.percentage).toBe(100);
    expect(summary.percentage).toBeLessThanOrEqual(100);
  });

  it("clamps a negative score to zero", () => {
    const results = [
      { questionId: "q1", score: -7 },
      { questionId: "q2", score: 5 },
      { questionId: "q3", score: 1 },
    ];
    const summary = calculateExamScore(questions, results);
    expect(summary.totalScore).toBe(6); // 0 + 5 + 1
    expect(summary.totalScore).toBeGreaterThanOrEqual(0);
  });

  it("never lets percentage exceed 100 even with multiple inflated scores", () => {
    const results = [
      { questionId: "q1", score: 9999 },
      { questionId: "q2", score: 9999 },
      { questionId: "q3", score: 9999 },
    ];
    const summary = calculateExamScore(questions, results);
    expect(summary.percentage).toBe(100);
    expect(summary.totalScore).toBe(16); // sum of each question's own max
  });

  it("treats a missing/falsy score as zero rather than NaN", () => {
    const results = [
      { questionId: "q1", score: 0 },
      { questionId: "q2", score: undefined as unknown as number },
      { questionId: "q3", score: 1 },
    ];
    const summary = calculateExamScore(questions, results);
    expect(summary.totalScore).toBe(1);
    expect(Number.isNaN(summary.totalScore)).toBe(false);
  });

  it("floors an unknown questionId's score at zero without dropping it or its marks from maxScore", () => {
    const results = [
      { questionId: "q1", score: 10 },
      { questionId: "unknown-id", score: -5 },
    ];
    const summary = calculateExamScore(questions, results);
    // maxScore always comes from `questions`, unaffected by unknown result IDs
    expect(summary.maxScore).toBe(16);
    // unknown id: no upper clamp available, but floor of 0 still applies
    expect(summary.totalScore).toBe(10);
  });

  it("returns 0% rather than dividing by zero when total marks is 0", () => {
    const summary = calculateExamScore([], []);
    expect(summary.maxScore).toBe(0);
    expect(summary.percentage).toBe(0);
    expect(summary.grade).toBe("U");
    expect(Number.isNaN(summary.percentage)).toBe(false);
  });
});
