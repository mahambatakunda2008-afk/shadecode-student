import { describe, expect, it } from "vitest";
import { canvasToScreen, screenToCanvas } from "./canvas-transform";

describe("canvas transforms", () => {
  it("round-trips document coordinates", () => {
    const view = { zoom: 2, offsetX: 30, offsetY: -10 };
    const point = { x: 40, y: 25 };
    expect(screenToCanvas(canvasToScreen(point, view), view)).toEqual(point);
  });

  it("accounts for pan and zoom", () => {
    expect(screenToCanvas({ x: 50, y: 30 }, { zoom: 2, offsetX: 10, offsetY: 10 })).toEqual({ x: 20, y: 10 });
  });
});
