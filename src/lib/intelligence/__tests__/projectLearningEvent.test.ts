import { describe, expect, it } from "vitest";
import { reduceLearningObservation } from "@/lib/cortex/learningState";
import { mapTopicMasteryRowToLearningState } from "../projectLearningEvent";

describe("legacy topic_mastery row compatibility", () => {
  it("uses attempts as exposure when the legacy exposure value is zero", () => {
    const previous = mapTopicMasteryRowToLearningState({
      topic: "waves",
      mastery_score: 80,
      attempts: 4,
      exposure: 0,
    });

    expect(previous?.exposure).toBe(4);
    expect(previous?.mastery).toBe(80);

    const next = reduceLearningObservation(previous!, {
      topicId: "waves",
      correct: false,
      evidenceScore: 0,
    });

    // Existing evidence must remain in the 70/30 transition; do not reset to 0.
    expect(next.mastery).toBe(56);
    expect(next.exposure).toBe(5);
  });

  it("uses attempts as exposure when legacy rows omit exposure", () => {
    const previous = mapTopicMasteryRowToLearningState({
      topic: "forces",
      mastery_score: 60,
      attempts: 2,
      exposure: null,
    });

    expect(previous?.exposure).toBe(2);
  });

  it("preserves a positive exposure value when present", () => {
    const previous = mapTopicMasteryRowToLearningState({
      topic: "algebra",
      mastery_score: 70,
      attempts: 9,
      exposure: 3,
    });

    expect(previous?.exposure).toBe(3);
  });

  it("returns null when no stored topic row exists", () => {
    expect(mapTopicMasteryRowToLearningState(null)).toBeNull();
  });
});
