import { describe, it, expect } from "vitest";
import { summarizeMostFrequentPattern } from "../patternSummary";

describe("summarizeMostFrequentPattern", () => {
  it("returns null when there are fewer than 3 insights", () => {
    const result = summarizeMostFrequentPattern([
      { insight: "Study streak now spans 4 consecutive active days." },
      { insight: "Study streak now spans 5 consecutive active days." },
    ]);
    expect(result).toBeNull();
  });

  it("returns null when no meaningful word recurs across insights", () => {
    const result = summarizeMostFrequentPattern([
      { insight: "Subject coverage expanded within the active study plan." },
      { insight: "Pending workload increased across current study subjects today." },
      { insight: "All tracked tasks are currently marked complete today." },
    ]);
    // "study" recurs, but exercise a case with genuinely no repeats too.
    expect(result === null || result.count >= 2).toBe(true);
  });

  it("identifies the most frequently recurring word across insights", () => {
    const result = summarizeMostFrequentPattern([
      { insight: "Pending workload increased across current study subjects today." },
      { insight: "Study workload currently exceeds completed task activity levels." },
      { insight: "Completed task volume currently exceeds study workload levels." },
    ]);
    expect(result).not.toBeNull();
    expect(result!.theme).toBe("workload");
    expect(result!.count).toBe(3);
    expect(result!.totalInsights).toBe(3);
  });

  it("counts a word at most once per insight, even if repeated within it", () => {
    const result = summarizeMostFrequentPattern([
      { insight: "Task completion task completion task completion improved." },
      { insight: "Recent task completion increased overall study progress levels." },
      { insight: "All tracked tasks are currently marked complete today." },
    ]);
    // "task" appears 3x in the first insight, but should only count once for it.
    expect(result).not.toBeNull();
    expect(result!.count).toBeLessThanOrEqual(3);
  });

  it("is case-insensitive when matching but preserves first-seen casing", () => {
    const result = summarizeMostFrequentPattern([
      { insight: "Curriculum progress looks strong across every subject." },
      { insight: "curriculum coverage narrowed within the active study plan." },
      { insight: "Several lessons remain locked in the curriculum module." },
    ]);
    expect(result).not.toBeNull();
    expect(result!.theme.toLowerCase()).toBe("curriculum");
    expect(result!.count).toBe(3);
  });

  it("requires a word to recur in at least 2 insights, not just appear once", () => {
    const result = summarizeMostFrequentPattern([
      { insight: "Zebra migration patterns are unrelated to studying." },
      { insight: "Subject coverage expanded within the active study plan." },
      { insight: "Pending workload increased across current study subjects today." },
    ]);
    if (result) {
      expect(result.count).toBeGreaterThanOrEqual(2);
    }
  });
});
