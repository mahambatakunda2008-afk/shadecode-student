import { describe, expect, it } from "vitest";
import { learningEventToObservation } from "../learningObservation";
import type { LearningEvent } from "../learningEvents";

const baseEvent: LearningEvent = {
  eventId: "le_test",
  userId: "user-1",
  kind: "question_attempted",
  occurredAt: "2026-09-01T10:00:00.000Z",
  source: "student",
  sourceEventId: "attempt-1",
  topicId: "fractions",
  metadata: {
    correct: true,
    confidence: 85,
    responseSeconds: 12,
    difficulty: 60,
  },
};

describe("canonical learning event → observation adapter", () => {
  it("maps question evidence without changing the canonical event", () => {
    const observation = learningEventToObservation(baseEvent);

    expect(observation).toEqual({
      topicId: "fractions",
      correct: true,
      evidenceScore: undefined,
      confidence: 85,
      responseSeconds: 12,
      difficulty: 60,
      observedAt: "2026-09-01T10:00:00.000Z",
    });
  });

  it("preserves a graded percentage as richer evidence", () => {
    const observation = learningEventToObservation({
      ...baseEvent,
      metadata: { ...baseEvent.metadata, percentage: 72 },
    });

    expect(observation?.evidenceScore).toBe(72);
  });

  it("does not invent topic observations for events without a topic", () => {
    expect(
      learningEventToObservation({ ...baseEvent, topicId: undefined }),
    ).toBeNull();
  });

  it("treats completed learning work as positive evidence by default", () => {
    const observation = learningEventToObservation({
      ...baseEvent,
      kind: "lesson_completed",
      metadata: {},
    });

    expect(observation?.correct).toBe(true);
  });

  it("does not turn aggregate completion records into a second mastery observation", () => {
    const observation = learningEventToObservation({
      ...baseEvent,
      kind: "quiz_completed",
      metadata: { percentage: 100, aggregateOnly: true },
    });

    expect(observation).toBeNull();
  });

  it("ignores events that are not evidence observations", () => {
    expect(
      learningEventToObservation({ ...baseEvent, kind: "lesson_viewed" }),
    ).toBeNull();
  });
});
