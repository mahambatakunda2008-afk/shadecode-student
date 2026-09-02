import { describe, expect, it } from "vitest";
import {
  LearningEventInbox,
  canonicalEventId,
  normalizeLearningEvent,
} from "../learningEvents";

describe("canonical learning events", () => {
  const base = {
    userId: "00000000-0000-0000-0000-000000000001",
    source: "learn",
    sourceEventId: "lesson-complete:lesson-1",
    type: "lesson.completed",
    occurredAt: "2026-09-02T10:00:00.000Z",
    topicId: "topic-1",
  };

  it("creates a stable id for the same learner/source/source-event", () => {
    expect(canonicalEventId(base.userId, base.source, base.sourceEventId))
      .toBe(canonicalEventId(base.userId, base.source, base.sourceEventId));
  });

  it("keeps identities separated across learners and source events", () => {
    const first = canonicalEventId(base.userId, base.source, base.sourceEventId);
    const otherLearner = canonicalEventId("00000000-0000-0000-0000-000000000002", base.source, base.sourceEventId);
    const otherAttempt = canonicalEventId(base.userId, base.source, "lesson-complete:lesson-2");
    expect(otherLearner).not.toBe(first);
    expect(otherAttempt).not.toBe(first);
  });

  it("normalizes supported lesson completion without losing metadata", () => {
    const result = normalizeLearningEvent({
      ...base,
      metadata: { progress: 100, aggregateOnly: false },
    });

    expect(result.status).toBe("accepted");
    if (result.status === "accepted") {
      expect(result.event.kind).toBe("lesson_completed");
      expect(result.event.topicId).toBe("topic-1");
      expect(result.event.metadata).toEqual({ progress: 100, aggregateOnly: false });
    }
  });

  it("rejects malformed timestamps and unsupported event types", () => {
    expect(normalizeLearningEvent({ ...base, occurredAt: "not-a-date" }).status).toBe("unsupported");
    expect(normalizeLearningEvent({ ...base, type: "unknown.event" }).status).toBe("unsupported");
  });

  it("accepts the first delivery and rejects a replay in the inbox", () => {
    const result = normalizeLearningEvent(base);
    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") return;

    const inbox = new LearningEventInbox();
    expect(inbox.accept(result.event)).toBe(true);
    expect(inbox.accept(result.event)).toBe(false);
    expect(inbox.has(result.event.eventId)).toBe(true);
  });
});
