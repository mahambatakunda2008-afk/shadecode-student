import { describe, expect, it } from "vitest";
import { LearningEventInbox, canonicalEventId, normalizeLearningEvent } from "./learningEvents";

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

  it("keeps users isolated in the event identity", () => {
    expect(canonicalEventId("user-a", "learn", "evt-123")).not.toBe(canonicalEventId("user-b", "learn", "evt-123"));
  });

  it("explicitly skips unsupported event types", () => {
    expect(normalizeLearningEvent({ ...base, type: "emotion.detected" }).status).toBe("unsupported");
  });

  it("rejects malformed timestamps instead of silently converting them to epoch time", () => {
    expect(normalizeLearningEvent({ ...base, occurredAt: "not-a-date" }).status).toBe("unsupported");
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