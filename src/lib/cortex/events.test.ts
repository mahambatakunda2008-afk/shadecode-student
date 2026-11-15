import { describe, expect, it } from "vitest";
import { recordVerifiedPracticeAttempt } from "./events";

describe("Cortex practice evidence trust boundary", () => {
  it("refuses to persist evidence when the reference answer is client supplied", async () => {
    await expect(recordVerifiedPracticeAttempt()).resolves.toEqual({
      recorded: false,
      reason: "untrusted_reference",
    });
  });
});
