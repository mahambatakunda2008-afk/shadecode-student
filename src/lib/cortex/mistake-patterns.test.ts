import { describe, expect, it } from "vitest";
import { deriveRecurringMistakes, deriveRepeatedTopicErrors } from "./mistake-patterns";

const event = (attemptId: string, correct: boolean, topicId = "Differentiation", subjectId = "Mathematics") => ({
  type: "question_attempted",
  data: { attemptId, topicId, curriculumTopicKey: topicId, subjectId, occurredAt: "2026-11-12T10:00:00.000Z", metadata: { correct } },
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
      { type: "question_attempted", data: { attemptId: "exam-4", topicId: "Functions", curriculumTopicKey: "functions", metadata: { correct: false } } },
    ])).toEqual([]);
  });

  it("does not treat self-assessed practical marks as verified recurring errors", () => {
    const selfAssessed = (attemptId: string) => ({
      type: "question_attempted",
      data: {
        attemptId,
        subjectId: "Biology",
        topicId: "Practical skills",
        curriculumTopicKey: "practical-skills",
        metadata: { correct: false, selfAssessment: true, practiceMode: "self_assessed_practical" },
      },
    });
    expect(deriveRepeatedTopicErrors([
      selfAssessed("practice-1"),
      selfAssessed("practice-2"),
    ])).toEqual([]);
  });

  it("ignores events without explicit correctness evidence", () => {
    expect(deriveRepeatedTopicErrors([{
      type: "question_attempted",
      data: { attemptId: "exam-1", subjectId: "Mathematics", topicId: "Functions", curriculumTopicKey: "functions", metadata: {} },
    }])).toEqual([]);
  });
});

describe("deriveRecurringMistakes", () => {
  it("does not promote self-assessed practical diagnoses into recurring mistakes", () => {
    const selfAssessed = (attemptId: string) => ({
      type: "question_attempted",
      data: {
        attemptId,
        subjectId: "Biology",
        topicId: "Practical skills",
        curriculumTopicKey: "practical-skills",
        metadata: { correct: false, selfAssessment: true, mistakeId: "weak-evaluation" },
      },
    });
    expect(deriveRecurringMistakes([
      selfAssessed("practice-1"),
      selfAssessed("practice-2"),
    ])).toEqual([]);
  });

  it("requires the same diagnosed mistake ID across distinct attempts", () => {
    const diagnosed = (attemptId: string, mistakeId: string) => ({
      type: "question_attempted",
      data: {
        attemptId,
        subjectId: "Mathematics",
        topicId: "Differentiation",
        curriculumTopicKey: "differentiation",
        occurredAt: "2026-11-12T10:00:00.000Z",
        metadata: { correct: false, mistakeId },
      },
    });
    expect(deriveRecurringMistakes([
      diagnosed("exam-1", "chain-rule-omitted-inner-derivative"),
      diagnosed("exam-1", "chain-rule-omitted-inner-derivative"),
      diagnosed("exam-2", "chain-rule-omitted-inner-derivative"),
      diagnosed("exam-3", "sign-error"),
    ])).toEqual([{
      subjectKey: "Mathematics",
      topicId: "Differentiation",
      mistakeId: "chain-rule-omitted-inner-derivative",
      incorrectResponses: 3,
      distinctAttempts: 2,
      lastObservedAt: "2026-11-12T10:00:00.000Z",
      evidenceState: "recurring_mistake",
    }]);
  });
});
