import { describe, expect, it } from "vitest";
import { deriveEvidenceBasedReviewSuggestions } from "./review-suggestions";
import type { RepeatedTopicError, RecurringMistake } from "./mistake-patterns";
import type { SpacedRetrievalEvidence } from "./spaced-retrieval";

const repeated: RepeatedTopicError = {
  subjectKey: "physics",
  topicId: "waves",
  incorrectResponses: 4,
  distinctAttempts: 2,
  lastObservedAt: "2026-02-05T10:00:00.000Z",
  evidenceState: "repeated_topic_errors",
};

const spaced: SpacedRetrievalEvidence = {
  subjectKey: "mathematics",
  topicId: "calculus",
  distinctAttempts: 3,
  observedSpanDays: 5,
  intervalsDays: [2, 3],
  medianIntervalDays: 2.5,
  lastRetrievedAt: "2026-02-06T10:00:00.000Z",
  evidenceState: "observed_spacing",
  interpretation: "descriptive_only",
};

describe("deriveEvidenceBasedReviewSuggestions", () => {
  it("prioritises topics with errors across distinct attempts", () => {
    const result = deriveEvidenceBasedReviewSuggestions({
      repeatedTopicErrors: [repeated],
      recurringMistakes: [],
      spacedRetrieval: [spaced],
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      subjectKey: "physics",
      topicId: "waves",
      priority: "high",
      reason: "repeated_errors",
      incorrectResponses: 4,
    });
  });

  it("uses observed retrieval spacing only as a standard practice suggestion", () => {
    const result = deriveEvidenceBasedReviewSuggestions({
      repeatedTopicErrors: [],
      recurringMistakes: [],
      spacedRetrieval: [spaced],
    });

    expect(result).toEqual([expect.objectContaining({
      priority: "standard",
      reason: "retrieval_practice",
      observedMedianIntervalDays: 2.5,
      lastObservedAt: spaced.lastRetrievedAt,
      evidenceState: "evidence_backed_suggestion",
    })]);
    expect(result[0]).not.toHaveProperty("dueAt");
    expect(result[0]).not.toHaveProperty("retentionProbability");
  });

  it("does not duplicate a topic present in both error and spacing evidence", () => {
    const result = deriveEvidenceBasedReviewSuggestions({
      repeatedTopicErrors: [repeated],
      recurringMistakes: [],
      spacedRetrieval: [{ ...spaced, subjectKey: "Physics", topicId: "WAVES" }],
    });

    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe("high");
  });

  it("uses recurring diagnosed mistakes to preserve the strongest attempt count", () => {
    const diagnosed: RecurringMistake = {
      subjectKey: "physics",
      topicId: "waves",
      mistakeId: "unit-conversion",
      incorrectResponses: 2,
      distinctAttempts: 3,
      lastObservedAt: "2026-02-07T10:00:00.000Z",
      evidenceState: "recurring_mistake",
    };
    const result = deriveEvidenceBasedReviewSuggestions({
      repeatedTopicErrors: [repeated],
      recurringMistakes: [diagnosed],
      spacedRetrieval: [],
    });

    expect(result[0]).toMatchObject({
      distinctAttempts: 3,
      lastObservedAt: diagnosed.lastObservedAt,
    });
  });
});
