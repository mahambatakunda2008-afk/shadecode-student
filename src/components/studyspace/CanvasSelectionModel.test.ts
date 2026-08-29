import { describe, expect, it } from "vitest";
import { selectionBounds, selectionCenter, transformSelection } from "./CanvasSelectionModel";

describe("Canvas selection model", () => {
  it("calculates a shared selection box", () => {
    expect(selectionBounds([
      { x: 10, y: 20, width: 30, height: 10, rotation: 0 },
      { x: 50, y: 5, width: 20, height: 25, rotation: 0 },
    ])).toEqual({ x: 10, y: 5, width: 60, height: 25, rotation: 0 });
  });

  it("transforms without mutating the original bounds", () => {
    const original = { x: 10, y: 20, width: 30, height: 10, rotation: 0 };
    expect(transformSelection(original, { dx: 5, dy: -2, scaleX: 2, scaleY: 3, rotation: 15 })).toEqual({ x: 15, y: 18, width: 60, height: 30, rotation: 15 });
    expect(original).toEqual({ x: 10, y: 20, width: 30, height: 10, rotation: 0 });
  });

  it("finds the center of an object", () => expect(selectionCenter({ x: 10, y: 20, width: 30, height: 10, rotation: 0 })).toEqual({ x: 25, y: 25 }));
});
