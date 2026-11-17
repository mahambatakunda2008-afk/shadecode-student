import { describe, expect, it, vi } from "vitest";
import { runOptionalOperation } from "./optional-operation";

describe("runOptionalOperation", () => {
  it("returns the enrichment value when the operation succeeds", async () => {
    await expect(runOptionalOperation(async () => "recommendation")).resolves.toEqual({
      ok: true,
      value: "recommendation",
    });
  });

  it("contains an enrichment failure without throwing into the primary flow", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("database unavailable"));

    await expect(runOptionalOperation(operation)).resolves.toEqual({ ok: false });
    expect(operation).toHaveBeenCalledOnce();
  });
});
