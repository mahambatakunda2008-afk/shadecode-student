import { describe, expect, it } from "vitest";
import { createInitialLearningState } from "../learningState";
import { applyLearningEvents, eventToObservation, type LearningEvent } from "../learningEvents";

describe("Learning event pipeline", () => {
  it("normalizes product events into observations", () => {
    const event: LearningEvent = {
      type: "question_answered",
      topicId: "algebra",
      correct: true,
      confidence: 75,
      responseSeconds: 20,
      difficulty: 60,
      observedAt: "2026-08-10T20:00:00Z",
    };
    expect(eventToObservation(event)).toEqual({
      topicId: "algebra",
      correct: true,
      confidence: 75,
      responseSeconds: 20,
      difficulty: 60,
      observedAt: "2026-08-10T20:00:00Z",
    });
  });

  it("replays events in order", () => {
    const state = applyLearningEvents(createInitialLearningState("algebra"), [
      { type: "question_answered", topicId: "algebra", correct: true, difficulty: 60 },
      { type: "question_answered", topicId: "algebra", correct: false, difficulty: 80 },
      { type: "practice_completed", topicId: "algebra", correct: true, difficulty: 70 },
    ]);

    expect(state.exposure).toBe(3);
    expect(state.uncertainty).toBeLessThan(80);
  });

  it("is deterministic for the same event history", () => {
    const events: LearningEvent[] = [
      { type: "question_answered", topicId: "algebra", correct: true, difficulty: 50 },
      { type: "question_answered", topicId: "algebra", correct: true, difficulty: 70 },
    ];
    expect(applyLearningEvents(createInitialLearningState("algebra"), events)).toEqual(
      applyLearningEvents(createInitialLearningState("algebra"), events),
    );
  });
});
