import { describe, expect, it } from "vitest";
import { joinStrokes, lineFit, smooth, snapAngle, straighten } from "../geometry";

describe("intelligent canvas geometry", () => {
  it("recognizes a straight stroke", () => {
    const fit = lineFit([{ x: 0, y: 0 }, { x: 5, y: 1 }, { x: 10, y: 2 }]);
    expect(fit).not.toBeNull();
    expect(fit!.length).toBeCloseTo(Math.hypot(10, 2));
    expect(fit!.confidence).toBeGreaterThan(0.5);
  });

  it("snaps angles deterministically", () => {
    expect(snapAngle(0.03, Math.PI / 12)).toBe(0);
    expect(snapAngle(Math.PI / 2 + 0.02, Math.PI / 12)).toBe(Math.PI / 2);
  });

  it("returns a clean two-point line for a confident stroke", () => {
    const result = straighten([{ x: 0, y: 0 }, { x: 5, y: 0.2 }, { x: 10, y: 0.1 }]);
    expect(result).toHaveLength(2);
  });

  it("smooths without moving endpoints", () => {
    const points = [{ x: 0, y: 0 }, { x: 4, y: 10 }, { x: 8, y: 0 }];
    const result = smooth(points);
    expect(result[0]).toEqual(points[0]);
    expect(result[result.length - 1]).toEqual(points[points.length - 1]);
  });

  it("joins nearby strokes with a reversible bridge point", () => {
    const result = joinStrokes({ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] }, { points: [{ x: 14, y: 1 }, { x: 20, y: 0 }] }, 10);
    expect(result.points.length).toBe(3);
    expect(result.points[1].x).toBeCloseTo(12);
  });
});
