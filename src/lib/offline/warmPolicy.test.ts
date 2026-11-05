import { describe, expect, it } from "vitest";
import { CORE_OFFLINE_ROUTES, WARM_INTERVAL_MS, coreRouteHrefs, shouldWarmRoutes, warmStorageKey, warmSucceeded } from "./warmPolicy";
import { classifyRouteError } from "./classifyError";

const base = { hasServiceWorker: true, online: true, saveData: false, effectiveType: "4g", lastWarmAt: null, now: 1_000_000_000 };

describe("shouldWarmRoutes", () => {
  it("saves on a first visit over a normal connection", () => {
    expect(shouldWarmRoutes(base)).toBe(true);
  });
  it("never saves without a service worker or without a connection", () => {
    expect(shouldWarmRoutes({ ...base, hasServiceWorker: false })).toBe(false);
    expect(shouldWarmRoutes({ ...base, online: false })).toBe(false);
  });
  it("respects data-saver and 2G connections", () => {
    expect(shouldWarmRoutes({ ...base, saveData: true })).toBe(false);
    expect(shouldWarmRoutes({ ...base, effectiveType: "2g" })).toBe(false);
    expect(shouldWarmRoutes({ ...base, effectiveType: "slow-2g" })).toBe(false);
    expect(shouldWarmRoutes({ ...base, effectiveType: "3g" })).toBe(true);
    expect(shouldWarmRoutes({ ...base, effectiveType: undefined })).toBe(true);
  });
  it("only repeats after the interval", () => {
    expect(shouldWarmRoutes({ ...base, lastWarmAt: base.now - 1000 })).toBe(false);
    expect(shouldWarmRoutes({ ...base, lastWarmAt: base.now - WARM_INTERVAL_MS + 1 })).toBe(false);
    expect(shouldWarmRoutes({ ...base, lastWarmAt: base.now - WARM_INTERVAL_MS })).toBe(true);
  });
});

describe("core routes and storage key", () => {
  it("lists unique, app-relative, non-API routes", () => {
    const hrefs = coreRouteHrefs();
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) expect(href).toMatch(/^\/[a-z-]+$/);
    expect(hrefs).toEqual(expect.arrayContaining(["/dashboard", "/learn", "/exam-sim"]));
    expect(CORE_OFFLINE_ROUTES.every((route) => route.label.length > 2)).toBe(true);
  });
  it("is saved per learner and per worker version", () => {
    expect(warmStorageKey("a")).not.toBe(warmStorageKey("b"));
    expect(warmStorageKey("a")).toContain("v7");
  });
});

describe("classifyRouteError", () => {
  const chunk = { name: "ChunkLoadError", message: "Loading chunk 482 failed." };
  const dynamic = { message: "Failed to fetch dynamically imported module: https://x/_next/static/chunks/a.js" };
  const network = { name: "TypeError", message: "Failed to fetch" };

  it("treats missing build files or failed fetches without a connection as offline", () => {
    expect(classifyRouteError(chunk, false)).toBe("offline");
    expect(classifyRouteError(dynamic, false)).toBe("offline");
    expect(classifyRouteError(network, false)).toBe("offline");
    expect(classifyRouteError({ message: "Load failed" }, false)).toBe("offline");
  });
  it("treats a missing build file while online as an app update", () => {
    expect(classifyRouteError(chunk, true)).toBe("stale-build");
    expect(classifyRouteError(dynamic, true)).toBe("stale-build");
  });
  it("never hides a real bug as an offline problem", () => {
    expect(classifyRouteError({ message: "Cannot read properties of undefined (reading 'map')" }, false)).toBe("other");
    expect(classifyRouteError({ message: "Cannot read properties of undefined" }, true)).toBe("other");
    expect(classifyRouteError(network, true)).toBe("other");
    expect(classifyRouteError(null, false)).toBe("other");
    expect(classifyRouteError(undefined, true)).toBe("other");
  });
});

describe("warmSucceeded", () => {
  it("counts a mostly-successful save and retries a mostly-failed one", () => {
    expect(warmSucceeded({ pages: 13, skipped: 0, failed: 0 })).toBe(true);
    expect(warmSucceeded({ pages: 10, skipped: 2, failed: 3 })).toBe(true);
    expect(warmSucceeded({ pages: 2, skipped: 0, failed: 8 })).toBe(false);
    expect(warmSucceeded({ pages: 0, skipped: 0, failed: 0 })).toBe(false);
  });
  it("accepts pages that were already fresh", () => {
    expect(warmSucceeded({ pages: 0, skipped: 13, failed: 0 })).toBe(true);
  });
});
