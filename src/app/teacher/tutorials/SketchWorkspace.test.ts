import { describe, expect, it } from "vitest";
import { fitQuadraticCurve, fitQuadraticSegments, recognizeShape, type Point } from "./SketchWorkspace";

describe("teacher sketch auto-correction", () => {
  it("snaps a clean straight freehand stroke to a line", () => {
    const points: Point[] = Array.from({ length: 16 }, (_, index) => ({
      x: index * 8,
      y: 2 + index * 0.1,
    }));
    expect(recognizeShape(points)?.tool).toBe("line");
  });

  it("recognizes a freehand arrow with a retraced tip and two arrowhead wings", () => {
    const points: Point[] = [];
    for (let index = 0; index <= 10; index++) points.push({ x: index * 10, y: 100 });
    points.push({ x: 120, y: 100 }, { x: 110, y: 90 }, { x: 120, y: 100 }, { x: 110, y: 110 });
    expect(recognizeShape(points)).toMatchObject({
      tool: "arrow",
      from: { x: 0, y: 100 },
      to: { x: 120, y: 100 },
    });
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

  it("recognizes a hand-drawn rectangular outline", () => {
    const corners = [{ x: 20, y: 20 }, { x: 220, y: 20 }, { x: 220, y: 140 }, { x: 20, y: 140 }, { x: 20, y: 20 }];
    const points: Point[] = corners.slice(0, -1).flatMap((from, index) => {
      const to = corners[index + 1];
      return Array.from({ length: 11 }, (_, step) => {
        const t = step / 11;
        return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      });
    });
    points.push(corners[4]);
    expect(recognizeShape(points)?.tool).toBe("rectangle");
  });

  it("recognizes a hand-drawn triangular outline", () => {
    const corners = [{ x: 120, y: 10 }, { x: 230, y: 180 }, { x: 10, y: 180 }, { x: 120, y: 10 }];
    const points: Point[] = corners.slice(0, -1).flatMap((from, index) => {
      const to = corners[index + 1];
      return Array.from({ length: 16 }, (_, step) => {
        const t = step / 16;
        return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      });
    });
    points.push(corners[3]);
    expect(recognizeShape(points)?.tool).toBe("triangle");
  });

  it("preserves the five actual vertices of a hand-drawn pentagon", () => {
    const corners = [
      { x: 120, y: 10 }, { x: 230, y: 90 }, { x: 190, y: 210 },
      { x: 50, y: 210 }, { x: 10, y: 90 }, { x: 120, y: 10 },
    ];
    const points: Point[] = corners.slice(0, -1).flatMap((from, index) => {
      const to = corners[index + 1];
      return Array.from({ length: 18 }, (_, step) => {
        const t = step / 18;
        return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      });
    });
    points.push(corners[corners.length - 1]);
    const result = recognizeShape(points);
    expect(result?.tool).toBe("polygon");
    expect(result?.vertices).toHaveLength(5);
    expect(result?.vertices?.[0].x).toBeCloseTo(120, 0);
    expect(result?.vertices?.[0].y).toBeCloseTo(10, 0);
  });

  it("preserves six vertices instead of flattening a hexagon into a basic shape", () => {
    const corners = [
      { x: 100, y: 10 }, { x: 180, y: 55 }, { x: 180, y: 145 },
      { x: 100, y: 190 }, { x: 20, y: 145 }, { x: 20, y: 55 }, { x: 100, y: 10 },
    ];
    const points: Point[] = corners.slice(0, -1).flatMap((from, index) => {
      const to = corners[index + 1];
      return Array.from({ length: 20 }, (_, step) => {
        const t = step / 20;
        return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      });
    });
    points.push(corners[corners.length - 1]);
    const result = recognizeShape(points);
    expect(result?.tool).toBe("polygon");
    expect(result?.vertices).toHaveLength(6);
  });


  it("fits the whole quadratic stroke despite uneven sampling", () => {
    const points: Point[] = Array.from({ length: 37 }, (_, index) => {
      const t = Math.pow(index / 36, 1.45);
      return {
        x: 80 + 240 * t,
        y: 90 + 1.2 * (1 - t) * t * 150,
      };
    });
    const fit = fitQuadraticCurve(points);
    expect(fit).not.toBeNull();
    expect(fit!.control.x).toBeCloseTo(200, 0);
    expect(fit!.control.y).toBeCloseTo(180, 0);
    expect(fit!.rmsError).toBeLessThan(1);
    expect(recognizeShape(points)?.tool).toBe("curve");
  });

  it("fits an S-shaped stroke as multiple smooth quadratic segments", () => {
    const points: Point[] = Array.from({ length: 81 }, (_, index) => {
      const t = index / 80;
      return { x: 80 + 300 * t, y: 130 + 65 * Math.sin(2 * Math.PI * t) };
    });
    const segments = fitQuadraticSegments(points, 3);
    expect(segments).not.toBeNull();
    expect(segments!.length).toBeGreaterThan(1);
    expect(segments!.length).toBeLessThanOrEqual(3);
    expect(segments![0].from).toEqual(points[0]);
    expect(segments![segments!.length - 1].to).toEqual(points[points.length - 1]);
    for (let index = 1; index < segments!.length; index++) {
      expect(segments![index].from).toEqual(segments![index - 1].to);
    }
    expect(recognizeShape(points)?.tool).toBe("curve");
    expect(recognizeShape(points)?.segments?.length).toBeGreaterThan(1);
  });

  it("does not force an S-shaped stroke into a single quadratic curve", () => {
    const points: Point[] = Array.from({ length: 61 }, (_, index) => {
      const t = index / 60;
      return { x: 80 + 300 * t, y: 130 + 65 * Math.sin(2 * Math.PI * t) };
    });
    const fit = fitQuadraticCurve(points);
    expect(fit).not.toBeNull();
    expect(fit!.rmsError).toBeGreaterThan(12);
    expect(recognizeShape(points)?.tool).not.toBe("curve");
  });

  it("does not turn a short accidental mark into a diagram shape", () => {
    const points: Point[] = Array.from({ length: 5 }, (_, index) => ({
      x: 10 + index,
      y: 10 + index,
    }));
    expect(recognizeShape(points)).toBeNull();
  });
});
