import { describe, expect, it } from "vitest";
import { beginPan, updatePan, wheelZoom } from "./canvas-interaction";

describe("canvas interaction", () => {
  it("updates a pan gesture from its starting point", () => {
    const start = beginPan({ zoom: 1, offsetX: 10, offsetY: 20 }, 100, 100);
    expect(updatePan(start, 120, 85)).toEqual({ zoom: 1, offsetX: 30, offsetY: 5 });
  });

  it("zooms around the wheel position", () => {
    const next = wheelZoom({ zoom: 1, offsetX: 0, offsetY: 0 }, -100, 100, 100);
    expect(next.zoom).toBeGreaterThan(1);
    expect(next.offsetX).toBeLessThan(0);
    expect(next.offsetY).toBeLessThan(0);
  });
});
