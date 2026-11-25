import { describe, expect, it } from "vitest";
import { sanitizeClientLearningEvidenceMetadata } from "./clientEventEvidence";
import { learningEventToObservation } from "./learningObservation";
import { normalizeLearningEvent } from "./learningEvents";

describe("client learning event evidence boundary", () => {
  it("removes browser-supplied correctness, scores and trust claims", () => {
    const safe = sanitizeClientLearningEvidenceMetadata({
      correct: true,
      evidenceScore: 100,
      percentage: 100,
      score: 10,
      maxScore: 10,
      confidence: 1,
      responseSeconds: 12,
      difficulty: 2,
      verified: true,
      serverVerified: true,
      teacherReviewed: true,
      reviewerId: "claimed-reviewer",
      evidenceClass: "teacher-reviewed",
      markingAuthority: "official",
      markingMethod: "exact",
      answerKeyVersion: "v9",
      questionSetHash: "forged-hash",
      marksAwarded: 10,
      topicLabel: "Kinematics",
      attemptId: "attempt-123",
      aggregateOnly: true,
    });

    expect(safe).toEqual({
      topicLabel: "Kinematics",
      attemptId: "attempt-123",
      aggregateOnly: true,
    });
  });

  it("cannot turn a forged browser correctness claim into a mastery observation", () => {
    const normalized = normalizeLearningEvent({
      userId: "learner-1",
      source: "server",
      sourceEventId: "forged-attempt",
      type: "question.attempted",
      subjectId: "physics",
      topicId: "Kinematics",
      metadata: sanitizeClientLearningEvidenceMetadata({
        correct: true,
        percentage: 100,
        score: 10,
        maxScore: 10,
        verified: true,
        serverVerified: true,
      }),
    });

    expect(normalized.status).toBe("accepted");
    if (normalized.status === "accepted") {
      expect(learningEventToObservation(normalized.event)).toBeNull();
    }
  });

  it("preserves safe activity metadata and leaves absent metadata absent", () => {
    expect(sanitizeClientLearningEvidenceMetadata({
      action: "opened",
      questionCount: 5,
      offline: false,
    })).toEqual({
      action: "opened",
      questionCount: 5,
      offline: false,
    });
    expect(sanitizeClientLearningEvidenceMetadata(undefined)).toBeUndefined();
  });
});
