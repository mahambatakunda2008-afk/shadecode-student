import { describe, expect, it } from "vitest";
import { learningEventToObservation } from "./learningObservation";
import type { LearningEvent } from "./learningEvents";

function event(
  kind: LearningEvent["kind"],
  metadata: LearningEvent["metadata"] = {},
): LearningEvent {
  return {
    eventId: "event-1",
    userId: "learner-1",
    kind,
    occurredAt: "2026-11-12T10:00:00.000Z",
    source: "test",
    sourceEventId: "source-1",
    subjectId: "physics",
    topicId: "waves",
    attemptId: "attempt-1",
    metadata,
  };
}

describe("learningEventToObservation", () => {
  it("does not turn missing correctness into an incorrect response", () => {
    expect(learningEventToObservation(event("question_attempted"))).toBeNull();
  });

  it("does not assume that completing a lesson proves a correct response", () => {
    expect(learningEventToObservation(event("lesson_completed"))).toBeNull();
  });

  it("accepts explicit incorrect evidence", () => {
    expect(learningEventToObservation(event("question_attempted", { correct: false }))).toMatchObject({
      topicId: "waves",
      correct: false,
      observedAt: "2026-11-12T10:00:00.000Z",
    });
  });

  it("accepts explicit correct evidence", () => {
    expect(learningEventToObservation(event("question_attempted", { correct: true }))).toMatchObject({
      topicId: "waves",
      correct: true,
    });
  });

  it("does not interpret arbitrary numeric values as booleans", () => {
    expect(learningEventToObservation(event("question_attempted", { correct: 2 }))).toBeNull();
  });

  it("does not project aggregate-only events", () => {
    expect(learningEventToObservation(event("question_attempted", {
      correct: true,
      aggregateOnly: true,
    }))).toBeNull();
  });

  it("does not project events without a curriculum topic", () => {
    const withoutTopic = { ...event("question_attempted", { correct: true }), topicId: undefined };
    expect(learningEventToObservation(withoutTopic)).toBeNull();
  });
});
