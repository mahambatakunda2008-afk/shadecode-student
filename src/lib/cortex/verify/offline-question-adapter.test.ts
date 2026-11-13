import { describe, expect, it } from "vitest";
import { buildOfflineVerifyRubric } from "./offline-question-adapter";
import type { ExamQuestion } from "@/lib/exam/types";

const base: ExamQuestion = {
  id: 1,
  type: "short_answer",
  question: "Calculate the answer.",
  marks: 3,
  topic: "Numerical skills",
};

describe("buildOfflineVerifyRubric", () => {
  it("maps a question with a validated numeric spec", () => {
    const rubric = buildOfflineVerifyRubric({
      ...base,
      numeric: { exact: 0.25, tolerance: 0.001, unit: "m" },
    });
    expect(rubric).toEqual({
      version: 1,
      kind: "exact-number",
      answer: 0.25,
      tolerance: 0.001,
      marks: 3,
      criterion: "Numerical answer",
      explanation: "Compare the numerical result and required unit (m) with the supplied answer key.",
    });
  });

  it("maps a multiple-choice question only when its answer key exists", () => {
    expect(buildOfflineVerifyRubric({
      ...base,
      type: "multiple_choice",
      options: ["A", "B", "C", "D"],
      modelAnswer: "B",
    })).toMatchObject({ kind: "multiple-choice", answer: "B", marks: 3 });
    expect(buildOfflineVerifyRubric({ ...base, type: "multiple_choice" })).toBeNull();
  });

  it("maps only an explicitly supplied structured offline marking rubric", () => {
    const rubric = buildOfflineVerifyRubric({
      ...base,
      type: "structured",
      offlineMarking: {
        version: 1,
        criteria: [
          { id: "p1", description: "First marking point", marks: 2, acceptedAnswers: ["first approved phrase"] },
          { id: "p2", description: "Second marking point", marks: 1, acceptedAnswers: ["second approved phrase"] },
        ],
      },
    });
    expect(rubric).toMatchObject({ kind: "structured-points", marks: 3, criteria: [{ id: "p1" }, { id: "p2" }] });
  });

  it("does not infer keys for short-answer, structured or essay questions", () => {
    expect(buildOfflineVerifyRubric({ ...base, modelAnswer: "Some text" })).toBeNull();
    expect(buildOfflineVerifyRubric({ ...base, type: "structured", modelAnswer: "A long model answer" })).toBeNull();
    expect(buildOfflineVerifyRubric({ ...base, type: "essay", modelAnswer: "An essay" })).toBeNull();
  });

  it("rejects malformed numeric metadata", () => {
    expect(buildOfflineVerifyRubric({
      ...base,
      numeric: { exact: Number.NaN, tolerance: 0.01 },
    })).toBeNull();
    expect(buildOfflineVerifyRubric({
      ...base,
      numeric: { exact: 2, tolerance: -1 },
    })).toBeNull();
  });
});
