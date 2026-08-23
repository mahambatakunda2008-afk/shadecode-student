import { describe, expect, it } from "vitest";
import { NAV_ITEMS, isRouteActive } from "./navigation";

describe("navigation", () => {
  it("keeps canonical tool routes discoverable", () => {
    expect(NAV_ITEMS.workmate.href).toBe("/workmate");
    expect(NAV_ITEMS.share.href).toBe("/share");
    expect(NAV_ITEMS.dashboard.href).toBe("/dashboard");
  });

  it("does not confuse nested routes with unrelated routes", () => {
    expect(isRouteActive("/workmate/history", "/workmate")).toBe(true);
    expect(isRouteActive("/workmate-extra", "/workmate")).toBe(false);
    expect(isRouteActive("/share", "/share")).toBe(true);
  });
});
