import { describe, expect, it } from "vitest";
import { isSafeOfflineRoute, shouldUseOfflineFallback } from "./navigation";

describe("offline navigation policy", () => {
  it("allows app routes but not API routes as document fallback targets", () => {
    expect(isSafeOfflineRoute("/dashboard")).toBe(true);
    expect(isSafeOfflineRoute("/studyspace")).toBe(true);
    expect(isSafeOfflineRoute("/api/learn")).toBe(false);
  });

  it("treats network fetch failures as offline fallback candidates", () => {
    expect(shouldUseOfflineFallback(new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldUseOfflineFallback(new Error("validation failed"))).toBe(false);
  });
});
