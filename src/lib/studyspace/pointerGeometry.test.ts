import { describe, expect, it } from "vitest";
import { boundsForRect, boundsIntersect, moveBoundsFromPointer, pointInBounds } from "./pointerGeometry";

const bounds = { x: 10, y: 20, width: 30, height: 40, rotation: 0 };

describe("pointer geometry", () => {
  it("moves bounds by pointer delta", () => expect(moveBoundsFromPointer(bounds, { x: 5, y: 5 }, { x: 15, y: 0 })).toEqual({ x: 20, y: 15, width: 30, height: 40, rotation: 0 }));
  it("detects points inside bounds", () => expect(pointInBounds({ x: 20, y: 30 }, bounds)).toBe(true));
  it("detects rectangle intersection", () => expect(boundsIntersect(bounds, { x: 35, y: 50, width: 10, height: 10, rotation: 0 })).toBe(true));
  it("normalizes a lasso rectangle", () => expect(boundsForRect({ x: 50, y: 40 }, { x: 10, y: 20 })).toEqual({ x: 10, y: 20, width: 40, height: 20, rotation: 0 }));
});
