import { describe, expect, it } from "vitest";
import { learningEventBackoffMs, shouldSendQueuedLearningEvent } from "@/lib/intelligence/emitLearningEvent";

describe("learning event queue safety", () => {
  it("never sends a queued event while a different account is signed in", () => {
    expect(shouldSendQueuedLearningEvent("user-a", "user-b", 0, 100)).toBe(false);
    expect(shouldSendQueuedLearningEvent("user-a", "user-a", 0, 100)).toBe(true);
  });

  it("does not release an event before its retry time", () => {
    expect(shouldSendQueuedLearningEvent("user-a", "user-a", 1_001, 1_000)).toBe(false);
    expect(shouldSendQueuedLearningEvent("user-a", "user-a", 1_000, 1_000)).toBe(true);
  });

  it("uses bounded exponential retry backoff", () => {
    expect(learningEventBackoffMs(0)).toBe(1_000);
    expect(learningEventBackoffMs(1)).toBe(2_000);
    expect(learningEventBackoffMs(6)).toBe(60_000);
    expect(learningEventBackoffMs(20)).toBe(60_000);
  });
});
