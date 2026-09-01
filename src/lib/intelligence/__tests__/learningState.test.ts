import { describe, expect, it } from "vitest";
import {
  createInitialLearningState,
  projectTopicMastery,
  reduceLearningObservation,
} from "@/lib/cortex/learningState";

describe("richer learning state reducer", () => {
  it("updates all observable dimensions deterministically", () => {
    const previous = createInitialLearningState("fractions");
    const next = reduceLearningObservation(previous, {
      topicId: "fractions",
      correct: true,
      confidence: 90,
      responseSeconds: 12,
      observedAt: "2026-09-01T20:00:00.000Z",
    });

    expect(next.mastery).toBe(65);
    expect(next.retention).toBe(51.5);
    expect(next.confidence).toBe(58);
    expect(next.stability).toBe(51);
    expect(next.exposure).toBe(1);
    expect(next.errorRate).toBe(42.5);
    expect(next.responseSpeed).toBe(96);
    expect(next.recentImprovement).toBe(15);
    expect(next.uncertainty).toBe(73.6);
    expect(next.lastObservedAt).toBe("2026-09-01T20:00:00.000Z");
  });

  it("uses graded evidence when binary correctness is too coarse", () => {
    const previous = createInitialLearningState("algebra");
    const next = reduceLearningObservation(previous, {
      topicId: "algebra",
      correct: true,
      evidenceScore: 40,
    });

    expect(next.mastery).toBe(47);
  });

  it("does not fabricate response speed when timing is absent", () => {
    const previous = createInitialLearningState("physics");
    const next = reduceLearningObservation(previous, {
      topicId: "physics",
      correct: false,
    });

    expect(next.responseSpeed).toBe(previous.responseSpeed);
  });

  it("projects the reduced state without applying another mastery transition", () => {
    const previous = createInitialLearningState("geometry");
    const next = reduceLearningObservation(previous, {
      topicId: "geometry",
      correct: true,
    });
    const projection = projectTopicMastery(previous, next, 100, 1);

    expect(projection.mastery_score).toBe(next.mastery);
    expect(projection.last_score).toBe(100);
    expect(projection.attempts).toBe(1);
    expect(projection.trend).toBe(15);
    expect(projection.exposure).toBe(1);
    expect(projection.uncertainty).toBe(next.uncertainty);
  });

  it("rejects observations for another topic", () => {
    const previous = createInitialLearningState("fractions");

    expect(() => reduceLearningObservation(previous, {
      topicId: "geometry",
      correct: true,
    })).toThrow("Learning observation topic does not match state topic");
  });
});
