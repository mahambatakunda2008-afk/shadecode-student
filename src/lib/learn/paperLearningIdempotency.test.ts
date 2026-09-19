import { describe, expect, it } from "vitest";
import {
  normalizeClientActionId,
  replayCompletion,
  shouldReplayPaperAction,
} from "./paperLearningIdempotency";

describe("paper learning action idempotency", () => {
  it("normalizes only usable client action identifiers", () => {
    expect(normalizeClientActionId(undefined)).toBeNull();
    expect(normalizeClientActionId("   ")).toBeNull();
    expect(normalizeClientActionId("  action-123  ")).toBe("action-123");
    expect(normalizeClientActionId("x".repeat(200))).toHaveLength(120);
  });

  it("claims an unclaimed action, replays the same action, and conflicts on a different action", () => {
    expect(shouldReplayPaperAction(null, "a")).toBe("claim");
    expect(shouldReplayPaperAction(undefined, "a")).toBe("claim");
    expect(shouldReplayPaperAction("a", "a")).toBe("replay");
    expect(shouldReplayPaperAction("a", "b")).toBe("conflict");
  });

  it("only a correct verdict completes the learning block", () => {
    expect(replayCompletion("correct")).toBe(true);
    expect(replayCompletion("partially_correct")).toBe(false);
    expect(replayCompletion("incorrect")).toBe(false);
  });
});
