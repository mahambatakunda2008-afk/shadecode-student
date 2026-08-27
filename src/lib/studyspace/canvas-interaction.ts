import { panView, zoomAtPoint, type CanvasView } from "./canvas-view-state";

export type PanGesture = { startX: number; startY: number; view: CanvasView };

export function beginPan(view: CanvasView, x: number, y: number): PanGesture {
  return { startX: x, startY: y, view };
}

export function updatePan(gesture: PanGesture, x: number, y: number): CanvasView {
  return panView(gesture.view, x - gesture.startX, y - gesture.startY);
}

export function wheelZoom(view: CanvasView, deltaY: number, x: number, y: number): CanvasView {
  const factor = Math.exp(-deltaY * 0.0015);
  return zoomAtPoint(view, factor, x, y);
}
