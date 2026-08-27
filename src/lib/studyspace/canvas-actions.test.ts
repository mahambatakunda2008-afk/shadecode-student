import { describe, expect, it } from "vitest";
import { cloneCanvas, deleteObjects, duplicateObjects, type CanvasSnapshot } from "./canvas-actions";

const base: CanvasSnapshot = {
  strokes: [{ points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }],
  objects: [{ id: "a", bounds: { x: 1, y: 2, width: 2, height: 2, rotation: 0 }, strokeIndexes: [0] }],
};

describe("canvas actions", () => {
  it("clones without sharing nested data", () => {
    const copy = cloneCanvas(base);
    copy.strokes[0].points[0].x = 99;
    expect(base.strokes[0].points[0].x).toBe(1);
  });
  it("duplicates strokes and offsets the object", () => {
    const copy = duplicateObjects(base, [0]);
    expect(copy.objects).toHaveLength(2);
    expect(copy.strokes).toHaveLength(2);
    expect(copy.objects[1].bounds.x).toBe(17);
  });
  it("deletes selected objects and unreferenced strokes", () => {
    expect(deleteObjects(base, [0])).toEqual({ strokes: [], objects: [] });
  });
});
