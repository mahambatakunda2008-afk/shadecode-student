import { describe, expect, it } from "vitest";
import { scoreAnswer } from "./scoring";

describe("Cortex deterministic answer scoring", () => {
  it("awards a score only for a normalized exact reference match", async () => {
    await expect(scoreAnswer({
      answer: "  X = 2  ",
      correctAnswer: "x = 2",
      topic: "Quadratic equations",
    })).resolves.toMatchObject({
      score: 100,
      needsReview: false,
      weakTopics: [],
    });
  });

  it("collapses repeated spaces and line breaks before exact comparison", async () => {
    const result = await scoreAnswer({
      answer: "cellular\n\nrespiration",
      correctAnswer: "Cellular respiration",
    });

    expect(result.score).toBe(100);
    expect(result.needsReview).toBe(false);
  });

  it("does not infer correctness from a long answer", async () => {
    const result = await scoreAnswer({
      answer: "This is a long explanation that could still be completely incorrect.",
      topic: "Photosynthesis",
    });

    expect(result.score).toBeNull();
    expect(result.needsReview).toBe(true);
    expect(result.weakTopics).toEqual([]);
  });

  it("does not mark different wording as incorrect without a marking guide", async () => {
    const result = await scoreAnswer({
      answer: "The cell releases energy through respiration.",
      correctAnswer: "Energy is released by cellular respiration.",
      topic: "Cell biology",
    });

    expect(result.score).toBeNull();
    expect(result.needsReview).toBe(true);
    expect(result.weakTopics).toEqual([]);
  });

  it("does not grade an unanswered prompt as a confirmed zero", async () => {
    const result = await scoreAnswer({
      answer: "",
      correctAnswer: "42",
    });

    expect(result.score).toBeNull();
    expect(result.needsReview).toBe(true);
  });
});
