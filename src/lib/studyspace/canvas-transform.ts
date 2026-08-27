import type { CanvasView } from "./canvas-view-state";
import type { Point } from "./pointerGeometry";

/** Convert a screen/canvas-container point into document coordinates. */
export function screenToCanvas(point: Point, view: CanvasView): Point {
  return {
    x: (point.x - view.offsetX) / view.zoom,
    y: (point.y - view.offsetY) / view.zoom,
  };
}

/** Convert document coordinates into screen/canvas-container coordinates. */
export function canvasToScreen(point: Point, view: CanvasView): Point {
  return {
    x: point.x * view.zoom + view.offsetX,
    y: point.y * view.zoom + view.offsetY,
  };
}

export function applyCanvasView(ctx: CanvasRenderingContext2D, view: CanvasView): void {
  ctx.translate(view.offsetX, view.offsetY);
  ctx.scale(view.zoom, view.zoom);
}

export function resetCanvasTransform(ctx: CanvasRenderingContext2D): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
