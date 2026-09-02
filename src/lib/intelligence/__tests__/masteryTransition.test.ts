import { describe, expect, it } from "vitest";
import {
  MASTERY_EVIDENCE_WEIGHT,
  MASTERY_HISTORY_WEIGHT,
  observationScore,
  transitionMastery,
} from "../masteryTransition";
import { createInitialLearningState, reduceLearningObservation } from "@/lib/cortex/learningState";

describe("shared mastery transition", () => {
  it("uses the shared history/evidence weights", () => {
    expect(MASTERY_HISTORY_WEIGHT).toBe(0.7);
    expect(MASTERY_EVIDENCE_WEIGHT).toBe(0.3);
    expect(transitionMastery(50, 100)).toBe(65);
    expect(transitionMastery(50, 0)).toBe(35);
  });

  it("uses a raw first score when there is no prior mastery", () => {
    expect(transitionMastery(null, 83)).toBe(83);
  });

  it("clamps invalid and out-of-range evidence safely", () => {
    expect(transitionMastery(50, 150)).toBe(65);
    expect(transitionMastery(50, -20)).toBe(35);
    expect(transitionMastery(50, Number.NaN)).toBe(35);
  });

  it("maps correctness to deterministic evidence scores", () => {
    expect(observationScore(true)).toBe(100);
    expect(observationScore(false)).toBe(0);
  });

  it("treats the initial placeholder mastery as non-evidence", () => {
    const initial = createInitialLearningState("fractions");
    const first = reduceLearningObservation(initial, {
      topicId: "fractions",
      correct: true,
      evidenceScore: 83,
      observedAt: "2026-09-02T10:00:00.000Z",
    });

    expect(first.mastery).toBe(83);
    expect(first.exposure).toBe(1);
  });

  it("uses the shared rounded transition after the baseline observation", () => {
    const initial = createInitialLearningState("fractions");
    const first = reduceLearningObservation(initial, {
      topicId: "fractions",
      correct: true,
      evidenceScore: 83,
    });
    const second = reduceLearningObservation(first, {
      topicId: "fractions",
      correct: false,
      evidenceScore: 0,
    });

    expect(second.mastery).toBe(58);
  });
});
