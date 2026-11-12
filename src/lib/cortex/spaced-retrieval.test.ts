import { describe, expect, it } from "vitest";
import { deriveSpacedRetrievalEvidence } from "./spaced-retrieval";

const day = 24 * 60 * 60 * 1000;
function event(attemptId: string, dayOffset: number, correct: boolean, subjectId = "physics", topicId = "waves") {
  return {
    type: "question_attempted",
    created_at: new Date(Date.UTC(2026, 0, 1) + dayOffset * day).toISOString(),
    data: {
      subjectId,
      topicId,
      attemptId,
      occurredAt: new Date(Date.UTC(2026, 0, 1) + dayOffset * day).toISOString(),
      metadata: { correct },
    },
  };
}

describe("deriveSpacedRetrievalEvidence", () => {
  it("describes intervals across at least three distinct retrieval attempts", () => {
    const result = deriveSpacedRetrievalEvidence([
      event("a1", 0, true),
      event("a2", 2, false),
      event("a3", 5, true),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      distinctAttempts: 3,
      observedSpanDays: 5,
      intervalsDays: [2, 3],
      medianIntervalDays: 2.5,
      evidenceState: "observed_spacing",
      interpretation: "descriptive_only",
    });
  });

  it("does not count multiple questions from one attempt as spaced retrieval", () => {
    const result = deriveSpacedRetrievalEvidence([
      event("same", 0, true),
      event("same", 3, false),
      event("same", 7, true),
    ]);
    expect(result).toEqual([]);
  });

  it("requires a minimum two-day observed span", () => {
    const result = deriveSpacedRetrievalEvidence([
      event("a1", 0, true),
      event("a2", 0.5, true),
      event("a3", 1, true),
    ]);
    expect(result).toEqual([]);
  });

  it("keeps subject and topic evidence separate", () => {
    const result = deriveSpacedRetrievalEvidence([
      event("a1", 0, true, "physics", "waves"),
      event("a2", 2, true, "mathematics", "waves"),
      event("a3", 5, true, "physics", "electricity"),
    ]);
    expect(result).toEqual([]);
  });

  it("ignores unscoped or non-explicit correctness events", () => {
    const rows = [
      event("a1", 0, true),
      event("a2", 2, true),
      event("a3", 5, true),
      { ...event("a4", 8, true), data: { ...event("a4", 8, true).data, metadata: {} } },
      { ...event("a5", 10, true), data: { ...event("a5", 10, true).data, subjectId: "" } },
    ];
    const result = deriveSpacedRetrievalEvidence(rows);
    expect(result).toHaveLength(1);
    expect(result[0].distinctAttempts).toBe(3);
  });
});
