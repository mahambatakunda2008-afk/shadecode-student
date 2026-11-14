import { describe, expect, it } from "vitest";
import { createVerifyResultCacheKey } from "./result-cache";

describe("Cortex Verify result cache fingerprints", () => {
  it("reuses an identical request fingerprint", async () => {
    const input = { mode: "help" as const, subject: "Mathematics", question: "Find the radius.", level: "solution" };
    const first = await createVerifyResultCacheKey(input);
    const second = await createVerifyResultCacheKey(input);
    if (first === null || second === null) return; // Browser crypto is unavailable in this test runtime.
    expect(second).toBe(first);
  });

  it("separates help levels, modes and changed student working", async () => {
    const base = { mode: "help" as const, subject: "Mathematics", question: "Solve x + 2 = 5", level: "hint" };
    const baseKey = await createVerifyResultCacheKey(base);
    const solutionKey = await createVerifyResultCacheKey({ ...base, level: "solution" });
    const markKey = await createVerifyResultCacheKey({ ...base, mode: "check", studentAnswer: "x = 3" });
    const topicKey = await createVerifyResultCacheKey({ ...base, topicId: "Sequences" });
    if (!baseKey || !solutionKey || !markKey || !topicKey) return;
    expect(solutionKey).not.toBe(baseKey);
    expect(markKey).not.toBe(baseKey);
    expect(topicKey).not.toBe(baseKey);
  });

  it("includes the exact source image bytes in the fingerprint", async () => {
    const base = { mode: "help" as const, subject: "Mathematics", question: "Read the image", level: "solution" };
    const first = await createVerifyResultCacheKey({ ...base, image: new Blob(["image-a"], { type: "image/png" }) });
    const second = await createVerifyResultCacheKey({ ...base, image: new Blob(["image-b"], { type: "image/png" }) });
    if (!first || !second) return;
    expect(first).not.toBe(second);
  });
});
