import { beforeEach, describe, expect, it, vi } from "vitest";

let mockPath = "/";
vi.mock("next/navigation", () => ({ usePathname: () => mockPath }));

import { RouteNavigationGuard } from "./RouteNavigationGuard";

describe("RouteNavigationGuard", () => {
  beforeEach(() => { mockPath = "/"; });

  it("does not render on the landing page, which has its own header", () => {
    mockPath = "/";
    expect(RouteNavigationGuard()).toBeNull();
  });

  it("does not render inside the app shell", () => {
    for (const path of ["/dashboard", "/timetable", "/learn/abc", "/auth/login", "/admin/exam-hub"]) {
      mockPath = path;
      expect(RouteNavigationGuard(), path).toBeNull();
    }
  });

  it("still renders on genuinely public, unmanaged routes", () => {
    for (const path of ["/privacy", "/terms"]) {
      mockPath = path;
      expect(RouteNavigationGuard(), path).not.toBeNull();
    }
  });
});
