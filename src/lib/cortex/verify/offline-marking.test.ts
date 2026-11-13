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

  it("accepts fractions, scientific notation and answers with units", () => {
    const fraction = markWithOfflineRubric("Calculate", "1/4", {
      ...base, kind: "exact-number", answer: 0.25,
    });
    const scientific = markWithOfflineRubric("Calculate", "3.0 × 10^8 m/s", {
      ...base, kind: "exact-number", answer: 3e8, tolerance: 1e5,
    });
    expect(fraction?.correct).toBe(true);
    expect(scientific?.correct).toBe(true);
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

  it("awards explicit structured partial credit criterion by criterion", () => {
    const result = markWithOfflineRubric("Explain the process", "Energy is transferred by conduction. Particles vibrate more and transfer energy.", {
      version: 1,
      kind: "structured-points",
      marks: 4,
      criteria: [
        { id: "transfer", description: "Identifies energy transfer by conduction", marks: 2, acceptedAnswers: ["energy is transferred by conduction", "conduction transfers energy"] },
        { id: "particles", description: "Explains particle vibration", marks: 2, acceptedAnswers: ["particles vibrate more", "increased particle vibration"] },
      ],
    });
    expect(result?.correct).toBe(true);
    expect(result?.score).toBe(100);
    expect(result?.marksBreakdown).toHaveLength(2);
  });

  it("awards partial marks without treating unapproved wording as a match", () => {
    const result = markWithOfflineRubric("Explain", "Conduction happens. Particles move.", {
      version: 1,
      kind: "structured-points",
      marks: 4,
      criteria: [
        { id: "transfer", description: "Energy transfer", marks: 2, acceptedAnswers: ["energy is transferred by conduction"] },
        { id: "particles", description: "Particle vibration", marks: 2, acceptedAnswers: ["particles vibrate more"] },
      ],
    });
    expect(result?.correct).toBe(false);
    expect(result?.score).toBe(0);
    expect(result?.marksBreakdown.reduce((sum, item) => sum + item.marksLost, 0)).toBe(4);
  });

  it("rejects inconsistent structured rubric totals", () => {
    expect(markWithOfflineRubric("Explain", "Some answer", {
      version: 1,
      kind: "structured-points",
      marks: 5,
      criteria: [{ id: "a", description: "Point A", marks: 2, acceptedAnswers: ["point a"] }],
    })).toBeNull();
  });

  it("declines malformed rubrics, blank answers and unparseable numbers", () => {
    expect(markWithOfflineRubric("Q", "A", { ...base, kind: "exact-number", answer: 4, marks: 0 })).toBeNull();
    expect(markWithOfflineRubric("Q", "", { ...base, kind: "multiple-choice", answer: "A" })).toBeNull();
    expect(markWithOfflineRubric("Q", "four", { ...base, kind: "exact-number", answer: 4 })).toBeNull();
  });
});
