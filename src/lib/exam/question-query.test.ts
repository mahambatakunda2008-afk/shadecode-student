import { describe, expect, it } from "vitest";
import { normalizeQuestionQuery } from "./question-query";

describe("normalizeQuestionQuery", () => {
  it("requires at least one search selector", () => {
    expect(() => normalizeQuestionQuery({})).toThrow("q, paperId, or topicId is required");
  });

  it("normalizes and caps limits", () => {
    expect(normalizeQuestionQuery({ q: "  momentum  ", limit: "999" })).toEqual({
      q: "momentum",
      paperId: undefined,
      topicId: undefined,
      difficulty: undefined,
      limit: 50,
    });
  });

  it("accepts only supported difficulty values", () => {
    expect(normalizeQuestionQuery({ topicId: "topic-1", difficulty: "HARD" }).difficulty).toBe("hard");
    expect(() => normalizeQuestionQuery({ topicId: "topic-1", difficulty: "impossible" })).toThrow("difficulty must be easy, medium, or hard");
  });
});
