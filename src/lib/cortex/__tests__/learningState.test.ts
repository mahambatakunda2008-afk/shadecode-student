import { describe, expect, it } from "vitest";
import {
  createInitialLearningState,
  updateLearningState,
  type LearningObservation,
} from "../learningState";

describe("Shadecode Learning State", () => {
  it("starts conservatively uncertain", () => {
    const state = createInitialLearningState("algebra");
    expect(state.topicId).toBe("algebra");
    expect(state.mastery).toBe(50);
    expect(state.uncertainty).toBe(80);
    expect(state.exposure).toBe(0);
  });

  it("updates observable state after a correct response", () => {
    const state = createInitialLearningState("algebra");
    const observation: LearningObservation = {
      topicId: "algebra",
      correct: true,
      kind: "assessment",
      confidence: 80,
      responseSeconds: 30,
      difficulty: 70,
      observedAt: "2026-08-10T20:00:00Z",
    };

    const next = updateLearningState(state, observation);
    expect(next.mastery).toBeGreaterThan(state.mastery);
    expect(next.errorRate).toBeLessThan(state.errorRate);
    expect(next.exposure).toBe(1);
    expect(next.uncertainty).toBeLessThan(state.uncertainty);
    expect(next.lastObservedAt).toBe(observation.observedAt);
  });

  it("responds to an incorrect answer without destroying the state", () => {
    const state = createInitialLearningState("algebra");
    const next = updateLearningState(state, {
      topicId: "algebra",
      correct: false,
      kind: "assessment",
      confidence: 30,
      difficulty: 60,
    });

    expect(next.mastery).toBeLessThan(state.mastery);
    expect(next.errorRate).toBeGreaterThan(state.errorRate);
    expect(next.mastery).toBeGreaterThanOrEqual(0);
    expect(next.mastery).toBeLessThanOrEqual(100);
  });

  it("treats lesson completion as exposure, not mastery evidence", () => {
    const state = {
      ...createInitialLearningState("algebra"),
      mastery: 82,
      retention: 74,
      confidence: 77,
      uncertainty: 55,
      exposure: 4,
    };

    const next = updateLearningState(state, {
      topicId: "algebra",
      correct: false,
      kind: "exposure",
      observedAt: "2026-09-10T17:00:00Z",
    });

    expect(next.mastery).toBe(state.mastery);
    expect(next.errorRate).toBe(state.errorRate);
    expect(next.confidence).toBe(state.confidence);
    expect(next.retention).toBe(state.retention);
    expect(next.exposure).toBe(5);
    expect(next.uncertainty).toBeLessThan(state.uncertainty);
    expect(next.lastObservedAt).toBe("2026-09-10T17:00:00Z");
  });

  it("rejects observations for another topic", () => {
    const state = createInitialLearningState("algebra");
    expect(() => updateLearningState(state, { topicId: "calculus", correct: true })).toThrow();
  });

  it("keeps bounded state values within safe ranges", () => {
    let state = createInitialLearningState("algebra");
    for (let i = 0; i < 100; i += 1) {
      state = updateLearningState(state, {
        topicId: "algebra",
        correct: i % 2 === 0,
        kind: "assessment",
        responseSeconds: 1,
        difficulty: 100,
      });
    }

    for (const value of [state.mastery, state.retention, state.confidence, state.stability, state.exposure, state.errorRate, state.responseSpeed, state.uncertainty]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});
