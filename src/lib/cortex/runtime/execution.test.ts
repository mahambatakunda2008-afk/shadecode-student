import { afterEach, describe, expect, it, vi } from "vitest";

const callAIMock = vi.fn();

vi.mock("@/lib/ai", () => ({
  callAI: callAIMock,
}));

import { executeCortexText } from "./execution";
import {
  classifyCortexExecutionFailure,
  clearCortexExecutionEventsForTests,
  getRecentCortexExecutionEvents,
} from "./executionEvents";

describe("Cortex execution boundary", () => {
  afterEach(() => {
    callAIMock.mockReset();
    clearCortexExecutionEventsForTests();
  });

  it("forwards model work through the shared AI runtime and emits lifecycle events", async () => {
    callAIMock.mockResolvedValueOnce("generated answer");

    await expect(
      executeCortexText("Explain this.", 900, {
        operation: "test.answer",
        userId: "user-1",
      }),
    ).resolves.toBe("generated answer");

    expect(getRecentCortexExecutionEvents()).toMatchObject([
      { type: "cortex.execution.started", operation: "test.answer", status: "started" },
      { type: "cortex.execution.completed", operation: "test.answer", status: "completed" },
    ]);
    expect(getRecentCortexExecutionEvents()).toHaveLength(2);
  });

  it("classifies a null AI result as an empty response", async () => {
    callAIMock.mockResolvedValueOnce(null);

    await expect(
      executeCortexText("Explain this.", 900, { operation: "test.answer" }),
    ).resolves.toBeNull();

    expect(getRecentCortexExecutionEvents()[1]).toMatchObject({
      type: "cortex.execution.failed",
      failureClass: "empty_response",
    });
  });

  it("contains an execution exception and classifies provider failure", async () => {
    callAIMock.mockRejectedValueOnce(new Error("provider unavailable"));

    await expect(
      executeCortexText("Explain this.", 900, { operation: "test.answer" }),
    ).resolves.toBeNull();

    expect(getRecentCortexExecutionEvents()[1]).toMatchObject({
      type: "cortex.execution.failed",
      failureClass: "provider_unavailable",
    });
  });
});

describe("Cortex execution failure classification", () => {
  it.each([
    ["request timed out", "timeout"],
    ["429 rate limit exceeded", "rate_limited"],
    ["invalid response schema", "invalid_response"],
    ["curriculum grounding unavailable", "grounding_unavailable"],
    ["operation aborted", "aborted"],
  ])("classifies %s", (message, expected) => {
    expect(classifyCortexExecutionFailure(new Error(message))).toBe(expected);
  });

  it("falls back to execution_exception", () => {
    expect(classifyCortexExecutionFailure(new Error("something broke"))).toBe("execution_exception");
  });
});
