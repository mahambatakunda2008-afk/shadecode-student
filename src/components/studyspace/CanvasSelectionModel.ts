import type { CanvasBounds } from "@/lib/studyspace/canvas-objects";

export type SelectionTransform = { dx: number; dy: number; scaleX?: number; scaleY?: number; rotation?: number };

export function selectionBounds(bounds: CanvasBounds[]): CanvasBounds | null {
  if (!bounds.length) return null;
  const minX = Math.min(...bounds.map((b) => b.x));
  const minY = Math.min(...bounds.map((b) => b.y));
  const maxX = Math.max(...bounds.map((b) => b.x + b.width));
  const maxY = Math.max(...bounds.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, rotation: 0 };
}

export function transformSelection(bounds: CanvasBounds, transform: SelectionTransform): CanvasBounds {
  return {
    ...bounds,
    x: bounds.x + transform.dx,
    y: bounds.y + transform.dy,
    width: Math.max(1, bounds.width * (transform.scaleX ?? 1)),
    height: Math.max(1, bounds.height * (transform.scaleY ?? 1)),
    rotation: bounds.rotation + (transform.rotation ?? 0),
  };
}

export function selectionCenter(bounds: CanvasBounds) {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}
