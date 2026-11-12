import { describe, expect, it } from "vitest";
import { LearningEventInbox, canonicalEventId, isLearningEventDeliveryComplete, normalizeLearningEvent } from "./learningEvents";

describe("canonical learning events", () => {
  const base = {
    userId: "user-a",
    source: "learn",
    sourceEventId: "evt-123",
    type: "question.attempted",
    occurredAt: "2026-08-29T07:00:00.000Z",
    subjectId: "physics",
    topicId: "deformation",
  };

  it("creates one stable identity for the same source event", () => {
    const first = normalizeLearningEvent(base);
    const replay = normalizeLearningEvent({ ...base, occurredAt: "2026-08-29T08:00:00.000Z" });
    expect(first.status).toBe("accepted");
    expect(replay.status).toBe("accepted");
    if (first.status === "accepted" && replay.status === "accepted") {
      expect(first.event.eventId).toBe(replay.event.eventId);
      expect(first.event.sourceEventId).toBe("evt-123");
    }
  });

  it("uses a 128-bit hexadecimal identity", () => {
    const id = canonicalEventId("user-a", "learn", "evt-123");
    expect(id).toMatch(/^le_[0-9a-f]{32}$/);
  });

  it("keeps users isolated in the event identity", () => {
    expect(canonicalEventId("user-a", "learn", "evt-123")).not.toBe(canonicalEventId("user-b", "learn", "evt-123"));
  });

  it("keeps source boundaries isolated", () => {
    expect(canonicalEventId("user-a", "learn", "evt-123")).not.toBe(canonicalEventId("user-a", "exam", "evt-123"));
  });

  it("explicitly skips unsupported event types", () => {
    expect(normalizeLearningEvent({ ...base, type: "emotion.detected" }).status).toBe("unsupported");
  });

  it("rejects malformed timestamps instead of silently converting them to epoch time", () => {
    expect(normalizeLearningEvent({ ...base, occurredAt: "not-a-date" }).status).toBe("unsupported");
  });


  it("keeps a persisted event queued while its mastery projection is pending", () => {
    expect(isLearningEventDeliveryComplete(true, {
      accepted: true,
      persisted: true,
      projectionPending: true,
    })).toBe(false);
  });

  it("acknowledges a persisted event when no mastery projection is pending", () => {
    expect(isLearningEventDeliveryComplete(true, {
      accepted: true,
      persisted: true,
      projection: { projected: false, reason: "no-topic-observation" },
    })).toBe(true);
  });

  it("does not acknowledge a successful HTTP response without persistence confirmation", () => {
    expect(isLearningEventDeliveryComplete(true, { accepted: true })).toBe(false);
    expect(isLearningEventDeliveryComplete(false, { persisted: true })).toBe(false);
  });

  it("does not accept a replay twice", () => {
    const result = normalizeLearningEvent(base);
    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") return;
    const inbox = new LearningEventInbox();
    expect(inbox.accept(result.event)).toBe(true);
    expect(inbox.accept(result.event)).toBe(false);
    expect(inbox.has(result.event.eventId)).toBe(true);
  });
});