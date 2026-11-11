import { describe, expect, it } from "vitest";
import { recognizeShape, type Point } from "./SketchWorkspace";

describe("teacher sketch auto-correction", () => {
  it("snaps a clean straight freehand stroke to a line", () => {
    const points: Point[] = Array.from({ length: 16 }, (_, index) => ({
      x: index * 8,
      y: 2 + index * 0.1,
    }));
    expect(recognizeShape(points)?.tool).toBe("line");
  });

  it("fits a curve in the direction and orientation actually drawn", () => {
    const points: Point[] = Array.from({ length: 31 }, (_, index) => {
      const t = index / 30;
      return {
        x: 100 * t,
        y: 4 * (1 - t) * t * 60,
      };
    });
    const result = recognizeShape(points);
    expect(result?.tool).toBe("curve");
    expect(result?.control?.x).toBeCloseTo(50, 0);
    expect(result?.control?.y).toBeCloseTo(120, 0);
  });

  it("recognizes a closed circular stroke as an ellipse", () => {
    const points: Point[] = Array.from({ length: 41 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 40;
      return {
        x: 100 + Math.cos(angle) * 60,
        y: 80 + Math.sin(angle) * 40,
      };
    });
    expect(recognizeShape(points)?.tool).toBe("ellipse");
  });

  it("does not turn a short accidental mark into a diagram shape", () => {
    const points: Point[] = Array.from({ length: 5 }, (_, index) => ({
      x: 10 + index,
      y: 10 + index,
    }));
    expect(recognizeShape(points)).toBeNull();
  });
});
