import { describe, expect, it } from "vitest";
import { buildFallbackExam } from "@/lib/exam/fallbackExam";

describe("buildFallbackExam", () => {
  it("does not repeat core questions when the requested count is within the bank", () => {
    const exam = buildFallbackExam("Physics", "Deformation of solids", "medium", 10);
    expect(exam.questions).toHaveLength(10);
    expect(new Set(exam.questions.map((question) => question.question)).size).toBe(10);
  });

  it("keeps the fallback markable and topic-scoped", () => {
    const exam = buildFallbackExam("Mathematics", "Trigonometry", "medium", 10);
    expect(exam.questions.every((question) => question.marks > 0)).toBe(true);
    expect(exam.questions.every((question) => question.topic === "Trigonometry")).toBe(true);
    expect(exam.questions.every((question) => question.question.trim().length >= 24)).toBe(true);
  });

  it("never exceeds the number of genuinely distinct bank questions", () => {
    const exam = buildFallbackExam("Computer Science", "Data structures", "medium", 20);
    expect(exam.questions.length).toBeLessThanOrEqual(10);
    expect(new Set(exam.questions.map((question) => question.question)).size).toBe(exam.questions.length);
  });
});
