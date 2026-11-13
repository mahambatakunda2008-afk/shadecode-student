import { describe, expect, it } from "vitest";
import { markWithOfflineRubric } from "./offline-marking";

const base = { version: 1 as const, marks: 2, criterion: "Final answer" };

describe("markWithOfflineRubric", () => {
  it("marks an exact numeric answer deterministically", () => {
    const result = markWithOfflineRubric("Calculate 2 + 2", "4", {
      ...base, kind: "exact-number", answer: 4,
    });
    expect(result?.correct).toBe(true);
    expect(result?.score).toBe(100);
    expect(result?.execution).toBe("browser-local");
  });

  it("respects an explicitly supplied numeric tolerance", () => {
    const result = markWithOfflineRubric("Calculate pi", "3.14", {
      ...base, kind: "exact-number", answer: 3.14159, tolerance: 0.002,
    });
    expect(result?.correct).toBe(true);
  });

  it("does not award marks for an incorrect numeric answer", () => {
    const result = markWithOfflineRubric("Calculate 2 + 2", "5", {
      ...base, kind: "exact-number", answer: 4,
    });
    expect(result?.correct).toBe(false);
    expect(result?.marksBreakdown[0].marksLost).toBe(2);
  });

  it("normalizes multiple-choice labels", () => {
    const result = markWithOfflineRubric("Choose an answer", "  OPTION B. ", {
      ...base, kind: "multiple-choice", answer: "option b",
    });
    expect(result?.correct).toBe(true);
  });

  it("supports only explicitly accepted text answers", () => {
    const result = markWithOfflineRubric("Name the process", "  photosynthesis ", {
      ...base, kind: "accepted-text", answers: ["Photosynthesis"],
    });
    expect(result?.correct).toBe(true);
  });

  it("declines malformed rubrics, blank answers and unparseable numbers", () => {
    expect(markWithOfflineRubric("Q", "A", { ...base, kind: "exact-number", answer: 4, marks: 0 })).toBeNull();
    expect(markWithOfflineRubric("Q", "", { ...base, kind: "multiple-choice", answer: "A" })).toBeNull();
    expect(markWithOfflineRubric("Q", "four", { ...base, kind: "exact-number", answer: 4 })).toBeNull();
  });
});
