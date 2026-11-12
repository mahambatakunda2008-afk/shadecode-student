import { describe, expect, it } from "vitest";
import { findReviewId } from "./lookup";
import { allReviewableQuestions } from "./registry";

describe("findReviewId", () => {
  const q = allReviewableQuestions()[0];

  it("finds a built-in question, even with its options in a different order", () => {
    expect(findReviewId(q.question, [...q.options].reverse(), q.answer)).toBe(q.id);
  });
  it("returns null when the answer, an option or the wording differs, or details are missing", () => {
    const wrong = q.options.find((o) => o !== q.answer)!;
    expect(findReviewId(q.question, q.options, wrong)).toBeNull();
    expect(findReviewId(q.question + " ", q.options.map((o, i) => (i === 0 ? o + "!" : o)), q.answer)).toBeNull();
    expect(findReviewId("An AI generated question?", ["a", "b"], "a")).toBeNull();
    expect(findReviewId(q.question, undefined, q.answer)).toBeNull();
  });
});
