import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCortexCacheKey,
  getCachedCortexValue,
  setCachedCortexValue,
} from "./cache";

describe("Cortex response cache resilience", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not fail the primary operation when browser storage writes are blocked", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      },
    });

    expect(() => setCachedCortexValue("user-1:lesson", { answer: "verified" })).not.toThrow();
    expect(getCachedCortexValue("user-1:lesson")).toBeNull();
  });

  it("ignores corrupt browser cache data and continues without a cached value", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "{not-json",
        setItem: () => undefined,
      },
    });

    expect(getCachedCortexValue("user-1:lesson")).toBeNull();
    expect(() => setCachedCortexValue("user-1:lesson", { answer: "fresh" })).not.toThrow();
  });

  it("keeps cache keys explicitly scoped to their caller-provided identity", () => {
    expect(createCortexCacheKey("user-a", "lesson-1"))
      .not.toBe(createCortexCacheKey("user-b", "lesson-1"));
  });
});
