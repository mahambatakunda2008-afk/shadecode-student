import { describe, expect, it } from "vitest";
import { deriveRepeatedTopicErrors } from "./mistake-patterns";

const event = (attemptId: string, correct: boolean, topicId = "Differentiation", subjectId = "Mathematics") => ({
  type: "question_attempted",
  data: { attemptId, topicId, subjectId, occurredAt: "2026-11-12T10:00:00.000Z", metadata: { correct } },
});

describe("deriveRepeatedTopicErrors", () => {
  it("requires incorrect responses across at least two distinct attempts", () => {
    expect(deriveRepeatedTopicErrors([
      event("exam-1", false),
      event("exam-1", false),
      event("exam-2", false),
    ])).toEqual([{
      subjectKey: "Mathematics",
      topicId: "Differentiation",
      incorrectResponses: 3,
      distinctAttempts: 2,
      lastObservedAt: "2026-11-12T10:00:00.000Z",
      evidenceState: "repeated_topic_errors",
    }]);
  });

  it("does not treat several wrong questions in one exam as a recurring weakness", () => {
    expect(deriveRepeatedTopicErrors([
      event("exam-1", false),
      event("exam-1", false),
    ])).toEqual([]);
  });

  it("keeps subjects separate and ignores correct or unscoped events", () => {
    expect(deriveRepeatedTopicErrors([
      event("exam-1", false, "Functions", "Mathematics"),
      event("exam-2", false, "Functions", "Physics"),
      event("exam-3", true, "Functions", "Mathematics"),
      { type: "question_attempted", data: { attemptId: "exam-4", topicId: "Functions", metadata: { correct: false } } },
    ])).toEqual([]);
  });

  it("ignores events without explicit correctness evidence", () => {
    expect(deriveRepeatedTopicErrors([{
      type: "question_attempted",
      data: { attemptId: "exam-1", subjectId: "Mathematics", topicId: "Functions", metadata: {} },
    }])).toEqual([]);
  });
});
