import { describe, expect, it } from "vitest";
import { alignSelection, distributeSelection, getSelectionBounds, snapTranslationToGrid, translateSelectionWithinCanvas } from "./diagram-selection";
import type { DiagramObject } from "./diagram-objects";

const style = { stroke: "#172033", fill: "none", strokeWidth: 3 };
const box = (id: string, x: number, y: number, width = 20, height = 10): DiagramObject => ({ id, type: "rectangle", x, y, width, height, style });

describe("diagram group selection geometry", () => {
  it("computes bounds around all selected objects", () => {
    expect(getSelectionBounds([box("a", 10, 20), box("b", 80, 60, 30, 15)])).toEqual({ x: 10, y: 20, width: 100, height: 55 });
    expect(getSelectionBounds([])).toBeNull();
  });

  it("moves a group together and clamps the group as one unit", () => {
    const moved = translateSelectionWithinCanvas([box("a", 10, 20), box("b", 80, 60)], -50, 900);
    expect(moved[0]).toMatchObject({ x: 0, y: 650 });
    expect(moved[1]).toMatchObject({ x: 70, y: 690 });
  });

  it("aligns selected objects by their edges or centers", () => {
    const objects = [box("a", 10, 10, 20, 10), box("b", 80, 50, 40, 20)];
    expect(alignSelection(objects, "horizontal", "start").map(item => getSelectionBounds([item])?.x)).toEqual([10, 10]);
    const centered = alignSelection(objects, "vertical", "center");
    expect(centered.map(item => { const b = getSelectionBounds([item])!; return b.y + b.height / 2; })).toEqual([40, 40]);
  });

  it("distributes three or more objects evenly while preserving their order", () => {
    const distributed = distributeSelection([box("a", 0, 0, 20), box("b", 50, 0, 10), box("c", 100, 0, 20)], "horizontal");
    expect(distributed.map(item => getSelectionBounds([item])!.x)).toEqual([0, 55, 100]);
  });

  it("snaps movement deltas to a configurable grid", () => {
    expect(snapTranslationToGrid(13, -16, 8)).toEqual({ x: 16, y: -16 });
    expect(snapTranslationToGrid(13, -16, 0)).toEqual({ x: 10, y: -20 });
  });
});
