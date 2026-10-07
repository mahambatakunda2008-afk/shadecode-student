import { describe, expect, it, vi } from "vitest";

const callAIMock = vi.fn();

vi.mock("@/lib/ai", () => ({
  callAI: callAIMock,
}));

import { executeCortexText } from "./execution";

describe("Cortex execution boundary", () => {
  it("forwards model work through the shared AI runtime", async () => {
    callAIMock.mockResolvedValueOnce("generated answer");

    await expect(
      executeCortexText("Explain this.", 900, {
        operation: "test.answer",
        userId: "user-1",
      }),
    ).resolves.toBe("generated answer");

    expect(callAIMock).toHaveBeenCalledWith("Explain this.", 900, {
      userId: "user-1",
      feature: "cortex",
      subfeature: "test.answer",
    });
  });

  it("contains an execution exception instead of leaking provider failure", async () => {
    callAIMock.mockRejectedValueOnce(new Error("provider exploded"));

    await expect(
      executeCortexText("Explain this.", 900, {
        operation: "test.answer",
        userId: "user-1",
      }),
    ).resolves.toBeNull();
  });
});
