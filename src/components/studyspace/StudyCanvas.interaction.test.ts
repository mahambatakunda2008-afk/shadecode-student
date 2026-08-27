import { describe, expect, it } from "vitest";
import { boundsForPoints, nearestAlignment, resizeBounds, translateBounds } from "@/lib/studyspace/canvas-objects";

describe("StudyCanvas interaction geometry", () => {
  it("creates a structured object bounds from a stroke", () => {
    expect(boundsForPoints([10, 30], [20, 45])).toEqual({ x: 10, y: 20, width: 20, height: 25, rotation: 0 });
  });
  it("moves and resizes a selected object immutably", () => {
    const bounds = { x: 20, y: 30, width: 40, height: 50, rotation: 0 };
    expect(translateBounds(bounds, 10, -5)).toEqual({ x: 30, y: 25, width: 40, height: 50, rotation: 0 });
    expect(resizeBounds(bounds, 0, -3)).toMatchObject({ width: 1, height: 1 });
    expect(bounds).toEqual({ x: 20, y: 30, width: 40, height: 50, rotation: 0 });
  });
  it("snaps a selected object to a nearby guide", () => expect(nearestAlignment(101, [100], 10)).toBe(100));
});
