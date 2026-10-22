import { describe, expect, it } from "vitest";
import { reduceLearningObservation } from "@/lib/cortex/learningState";
import { mapTopicMasteryRowToLearningState } from "@/lib/intelligence/projectLearningEvent";

describe("mapTopicMasteryRowToLearningState legacy exposure compatibility", () => {
  it.each([0, null, undefined])(
    "uses stored attempts when exposure is %s",
    (exposure) => {
      const previous = mapTopicMasteryRowToLearningState({
        topic: "waves",
        mastery_score: 80,
        attempts: 4,
        exposure,
        retention: 60,
        confidence: 70,
        stability: 65,
        error_rate: 20,
        response_speed: 50,
        prerequisite_health: 55,
        recent_improvement: 0,
        uncertainty: 30,
      });

      expect(previous).not.toBeNull();
      expect(previous?.exposure).toBe(4);

      const next = reduceLearningObservation(previous!, {
        topicId: "waves",
        correct: false,
        evidenceScore: 0,
      });

      // A legacy row with prior attempts must retain the 70/30 historical
      // transition, rather than treating this as the first observation (0).
      expect(next.mastery).toBe(56);
      expect(next.exposure).toBe(5);
    },
  );

  it("keeps a non-zero exposure count when it is already present", () => {
    const previous = mapTopicMasteryRowToLearningState({
      topic: "waves",
      mastery_score: 80,
      attempts: 9,
      exposure: 6,
    });

    expect(previous?.exposure).toBe(6);
  });
});
