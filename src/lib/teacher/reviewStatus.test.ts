import { describe, expect, it } from "vitest";
import { summarizeReviews } from "./reviewStatus";

describe("summarizeReviews", () => {
  it("verifies when a teacher marked it correct and nobody flagged it", () => {
    const m = summarizeReviews([{ question_id: "a", verdict: "correct" }, { question_id: "a", verdict: "correct" }]);
    expect(m.get("a")).toEqual({ verified: true, reviewers: 2 });
  });
  it("does not verify when any reviewer flagged it, even if others said correct", () => {
    const m = summarizeReviews([{ question_id: "a", verdict: "correct" }, { question_id: "a", verdict: "ambiguous" }]);
    expect(m.get("a")?.verified).toBe(false);
  });
  it("does not verify content with only flags, and omits content with no reviews", () => {
    const m = summarizeReviews([{ question_id: "b", verdict: "wrong_answer" }]);
    expect(m.get("b")).toEqual({ verified: false, reviewers: 0 });
    expect(m.has("c")).toBe(false);
  });
});
