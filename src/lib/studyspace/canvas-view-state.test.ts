import { describe, expect, it } from "vitest";
import { clampZoom, DEFAULT_CANVAS_VIEW, panView, zoomAtPoint } from "./canvas-view-state";

describe("canvas view state", () => {
  it("clamps zoom to a usable range", () => {
    expect(clampZoom(0.1)).toBe(0.5);
    expect(clampZoom(8)).toBe(3);
  });

  it("keeps the zoom focus point stable", () => {
    const view = zoomAtPoint(DEFAULT_CANVAS_VIEW, 2, 100, 80);
    expect(view.zoom).toBe(2);
    expect(view.offsetX).toBe(-100);
    expect(view.offsetY).toBe(-80);
  });

  it("pans without changing zoom", () => {
    expect(panView({ zoom: 1.5, offsetX: 10, offsetY: 20 }, 5, -4)).toEqual({ zoom: 1.5, offsetX: 15, offsetY: 16 });
  });
});
