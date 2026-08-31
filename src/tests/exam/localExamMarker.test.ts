import { describe, expect, it } from "vitest";
import { markExamOffline } from "@/lib/local-first/exam-marker";
import type { ExamQuestion } from "@/components/exam/ExamWorkspace";

const questions: ExamQuestion[] = [
  { id: 1, type: "multiple_choice", question: "Which quantity is force divided by area?", options: ["Stress", "Strain", "Extension", "Length"], marks: 1, topic: "Deformation" },
  { id: 2, type: "short_answer", question: "Define Young modulus.", marks: 3, topic: "Deformation" },
];

it("marks a stored MCQ deterministically", () => {
  const result = markExamOffline(questions, [
    { questionId: 1, answer: "Stress", timeSpent: 10 },
    { questionId: 2, answer: "Young modulus is stress divided by strain.", timeSpent: 20 },
  ], 30);
  expect(result.totalScore).toBe(1);
  expect(result.maxScore).toBe(4);
  expect(result.results[0].correct).toBe(true);
  expect(result.results[1].feedback).toContain("Saved for marking");
  expect(result.source).toBe("local-deterministic");
});

it("does not guess written-answer partial credit", () => {
  const result = markExamOffline(questions, [
    { questionId: 1, answer: "Strain", timeSpent: 10 },
    { questionId: 2, answer: "something plausible", timeSpent: 20 },
  ], 30);
  expect(result.results[0].score).toBe(0);
  expect(result.results[1].score).toBe(0);
  expect(result.weakAreas).toContain("Deformation");
});
