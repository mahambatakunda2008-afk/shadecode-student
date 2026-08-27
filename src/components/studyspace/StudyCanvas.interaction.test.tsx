import { describe, expect, it } from "vitest";
import { boundsForPoints, nearestAlignment, resizeBounds, translateBounds } from "@/lib/studyspace/canvas-objects";

describe("StudyCanvas interaction model", () => {
  it("creates a stable object bounds from a stroke", () => {
    expect(boundsForPoints([10, 40, 25], [20, 60, 35])).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });
  it("translates selected bounds without changing size", () => {
    expect(translateBounds({ x: 10, y: 20, width: 30, height: 40 }, 15, -5)).toEqual({ x: 25, y: 15, width: 30, height: 40 });
  });
  it("resizes selected bounds", () => {
    expect(resizeBounds({ x: 10, y: 20, width: 30, height: 40 }, 50, 60)).toEqual({ x: 10, y: 20, width: 50, height: 60 });
  });
  it("finds nearby alignment guides", () => {
    expect(nearestAlignment(101, [40, 100, 200], 5)).toBe(100);
    expect(nearestAlignment(101, [40, 200], 5)).toBeNull();
  });
});
