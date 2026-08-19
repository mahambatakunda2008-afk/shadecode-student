import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { saveDashboardCache, loadDashboardCache, formatCacheAge } from "../dashboardCache";

// This project's vitest environment is "node" (see vitest.config.ts), with
// no jsdom dependency installed. Rather than add one just for this module,
// stub a minimal in-memory localStorage/window -- exercises the exact same
// code paths (including the real typeof window === "undefined" SSR guard,
// which is what actually runs when this stub is absent) without adding a
// new dependency to a repo where many other agents are actively touching
// package.json concurrently.
function installLocalStorageStub() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
  vi.stubGlobal("window", { localStorage: localStorageMock });
  return localStorageMock;
}

describe("dashboardCache", () => {
  beforeEach(() => {
    installLocalStorageStub();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when nothing has been cached", () => {
    expect(loadDashboardCache("user-1", "core")).toBeNull();
  });

  it("returns null when window is unavailable (SSR)", () => {
    vi.unstubAllGlobals();
    expect(loadDashboardCache("user-1", "core")).toBeNull();
    expect(() => saveDashboardCache("user-1", "core", { x: 1 })).not.toThrow();
  });

  it("round-trips saved data", () => {
    const payload = { progress: 42, subjects: ["Math", "Physics"] };
    saveDashboardCache("user-1", "core", payload);
    const result = loadDashboardCache("user-1", "core");
    expect(result?.data).toEqual(payload);
  });

  it("scopes cache entries per user", () => {
    saveDashboardCache("user-1", "core", { value: "one" });
    saveDashboardCache("user-2", "core", { value: "two" });
    expect(loadDashboardCache("user-1", "core")?.data).toEqual({ value: "one" });
    expect(loadDashboardCache("user-2", "core")?.data).toEqual({ value: "two" });
  });

  it("scopes cache entries per data slice", () => {
    saveDashboardCache("user-1", "core", { kind: "core" });
    saveDashboardCache("user-1", "intel", { kind: "intel" });
    expect(loadDashboardCache("user-1", "core")?.data).toEqual({ kind: "core" });
    expect(loadDashboardCache("user-1", "intel")?.data).toEqual({ kind: "intel" });
  });

  it("overwrites a previous cache entry for the same user and slice", () => {
    saveDashboardCache("user-1", "core", { version: 1 });
    saveDashboardCache("user-1", "core", { version: 2 });
    expect(loadDashboardCache("user-1", "core")?.data).toEqual({ version: 2 });
  });

  it("tolerates corrupted stored JSON without throwing", () => {
    const stub = installLocalStorageStub();
    stub.setItem("shadecode:dashboard-cache:v1:user-1:core", "{not json");
    expect(() => loadDashboardCache("user-1", "core")).not.toThrow();
    expect(loadDashboardCache("user-1", "core")).toBeNull();
  });

  describe("formatCacheAge", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('shows "just now" for very recent timestamps', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      expect(formatCacheAge(now - 5_000)).toBe("just now");
    });

    it("shows minutes for entries under an hour old", () => {
      const now = Date.now();
      vi.setSystemTime(now);
      expect(formatCacheAge(now - 12 * 60_000)).toBe("12m ago");
    });

    it("shows hours for entries under a day old", () => {
      const now = Date.now();
      vi.setSystemTime(now);
      expect(formatCacheAge(now - 3 * 60 * 60_000)).toBe("3h ago");
    });

    it("shows days for older entries", () => {
      const now = Date.now();
      vi.setSystemTime(now);
      expect(formatCacheAge(now - 2 * 24 * 60 * 60_000)).toBe("2d ago");
    });
  });
});
