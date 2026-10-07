import { describe, expect, it } from "vitest";
import { challengeFromResult, gradeForPercentage } from "./fromResult";

const row = { subject: " Physics ", topic: null, difficulty: "A-Level", score: 72.4, total_questions: 10, correct_answers: 7, time_taken: 640 };

describe("challengeFromResult", () => {
  it("derives every advertised field from the stored result", () => {
    expect(challengeFromResult(row)).toEqual({
      subject: "Physics", topic: null, difficulty: "A-Level", question_count: 10,
      percentage: 72, total_score: 7, max_score: 10, time_taken: 640, grade: "B",
    });
  });
  it("rejects missing, impossible or out-of-range rows", () => {
    expect(challengeFromResult(null)).toBeNull();
    expect(challengeFromResult({ ...row, subject: "" })).toBeNull();
    expect(challengeFromResult({ ...row, score: 140 })).toBeNull();
    expect(challengeFromResult({ ...row, total_questions: 0 })).toBeNull();
    expect(challengeFromResult({ ...row, total_questions: 99 })).toBeNull();
  });
  it("falls back to a percentage-derived score when correct answers are invalid", () => {
    expect(challengeFromResult({ ...row, correct_answers: 50 })?.total_score).toBe(7);
  });
});

describe("gradeForPercentage", () => {
  it("matches the exam workspace thresholds", () => {
    expect([95, 85, 75, 65, 55, 45, 10].map(gradeForPercentage)).toEqual(["A*", "A", "B", "C", "D", "E", "U"]);
  });
});
