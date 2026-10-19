import { describe, expect, it, vi } from "vitest";
import { runBestEffortSideEffects } from "./runBestEffortSideEffects";

describe("runBestEffortSideEffects", () => {
  it("does not reject when a non-critical effect fails", async () => {
    const onFailure = vi.fn();
    await expect(
      runBestEffortSideEffects([
        Promise.resolve("saved"),
        Promise.reject(new Error("XP service unavailable")),
      ], onFailure),
    ).resolves.toBeUndefined();

    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ message: "XP service unavailable" }), 1);
  });

  it("continues reporting independent failures and isolates a throwing reporter", async () => {
    const onFailure = vi.fn((error: unknown, index: number) => {
      if (index === 0) throw new Error("logger failed");
    });

    await expect(
      runBestEffortSideEffects([
        Promise.reject(new Error("memory unavailable")),
        Promise.reject(new Error("XP unavailable")),
        Promise.resolve(),
      ], onFailure),
    ).resolves.toBeUndefined();

    expect(onFailure).toHaveBeenCalledTimes(2);
  });
});
