import { describe, expect, it } from "vitest";
import { canonicalEventId, normalizeLearningEvent } from "@/lib/intelligence/learningEvents";

describe("canonical learning events", () => {
  it("creates a stable event id for the same user/source/event", () => {
    expect(canonicalEventId("u1", "learn", "lesson-view:l1")).toBe(canonicalEventId("u1", "learn", "lesson-view:l1"));
  });

  it("keeps users and source ids isolated", () => {
    expect(canonicalEventId("u1", "learn", "same")).not.toBe(canonicalEventId("u2", "learn", "same"));
    expect(canonicalEventId("u1", "learn", "same")).not.toBe(canonicalEventId("u1", "exam-sim", "same"));
  });

  it("rejects unsupported or incomplete events", () => {
    expect(normalizeLearningEvent({ userId: "u1", source: "learn", sourceEventId: "", type: "lesson.viewed" }).status).toBe("unsupported");
    expect(normalizeLearningEvent({ userId: "u1", source: "learn", sourceEventId: "x", type: "not-a-real-event" }).status).toBe("unsupported");
  });

  it("normalizes supported events without trusting a client user id", () => {
    const result = normalizeLearningEvent({ userId: "server-user", source: "learn", sourceEventId: "x", type: "lesson.viewed", metadata: { score: 4, ok: true } });
    expect(result.status).toBe("accepted");
    if (result.status === "accepted") {
      expect(result.event.userId).toBe("server-user");
      expect(result.event.kind).toBe("lesson_viewed");
      expect(result.event.metadata).toEqual({ score: 4, ok: true });
    }
  });
});
