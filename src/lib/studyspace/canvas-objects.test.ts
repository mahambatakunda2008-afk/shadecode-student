import { describe, expect, it } from "vitest";
import { boundsForPoints, nearestAlignment, resizeBounds, translateBounds } from "./canvas-objects";

describe("canvas objects", () => {
  it("computes bounds from ink", () => expect(boundsForPoints([4, 20], [8, 30])).toEqual({ x: 4, y: 8, width: 16, height: 22, rotation: 0 }));
  it("moves and resizes an object without mutating the source", () => {
    const bounds = { x: 1, y: 2, width: 10, height: 12, rotation: 0 };
    expect(translateBounds(bounds, 3, 4)).toEqual({ x: 4, y: 6, width: 10, height: 12, rotation: 0 });
    expect(resizeBounds(bounds, 20, 30)).toEqual({ x: 1, y: 2, width: 20, height: 30, rotation: 0 });
    expect(bounds).toEqual({ x: 1, y: 2, width: 10, height: 12, rotation: 0 });
  });
  it("snaps to a nearby alignment guide", () => {
    expect(nearestAlignment(98, [0, 100])).toBe(100);
    expect(nearestAlignment(85, [100])).toBeNull();
  });
});
