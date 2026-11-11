import { describe, expect, it } from "vitest";
import { allReviewableQuestions, isReviewVerdict, questionReviewId, REVIEW_BANKS } from "./registry";

describe("curated review registry", () => {
  const all = allReviewableQuestions();

  it("covers every question in every built-in bank", () => {
    const expected = REVIEW_BANKS.reduce((n, b) => n + b.topics.reduce((m, t) => m + t.questions.length, 0), 0);
    expect(all).toHaveLength(expected);
    expect(all.length).toBeGreaterThan(500);
  });

  it("gives every question a unique ID", () => {
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length);
  });

  it("changes the ID when the wording, answer or an option changes, but not when options are reordered", () => {
    const base = questionReviewId("biology", "Q?", ["a", "b", "c", "d"], "a");
    expect(questionReviewId("biology", "Q??", ["a", "b", "c", "d"], "a")).not.toBe(base);
    expect(questionReviewId("biology", "Q?", ["a", "b", "c", "d"], "b")).not.toBe(base);
    expect(questionReviewId("biology", "Q?", ["a", "b", "c", "x"], "a")).not.toBe(base);
    expect(questionReviewId("biology", "Q?", ["d", "c", "b", "a"], "a")).toBe(base);
  });

  it("always includes the answer among the options", () => {
    for (const q of all) expect(q.options).toContain(q.answer);
  });

  it("validates verdicts", () => {
    expect(isReviewVerdict("correct")).toBe(true);
    expect(isReviewVerdict("nonsense")).toBe(false);
  });
});
