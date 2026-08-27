import type { CanvasBounds } from "./canvas-objects";

export type Point = { x: number; y: number };

export function moveBoundsFromPointer(bounds: CanvasBounds, start: Point, current: Point): CanvasBounds {
  return { ...bounds, x: bounds.x + current.x - start.x, y: bounds.y + current.y - start.y };
}

export function pointInBounds(point: Point, bounds: CanvasBounds, padding = 0): boolean {
  return point.x >= bounds.x - padding && point.x <= bounds.x + bounds.width + padding && point.y >= bounds.y - padding && point.y <= bounds.y + bounds.height + padding;
}

export function boundsIntersect(a: CanvasBounds, b: CanvasBounds): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

export function boundsForRect(start: Point, current: Point): CanvasBounds {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  return { x, y, width: Math.abs(current.x - start.x), height: Math.abs(current.y - start.y), rotation: 0 };
}
