import { describe, expect, it } from "vitest";
import { isDocumentNavigation, isSafeOfflineRoute, shouldUseOfflineFallback } from "./navigation";

describe("offline navigation policy", () => {
  it("identifies document navigations", () => {
    expect(isDocumentNavigation(new Request("https://example.com/dashboard", { method: "GET" }))).toBe(false);
    expect(isDocumentNavigation(new Request("https://example.com/dashboard", { headers: { Accept: "text/html" } }))).toBe(false);
  });

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
