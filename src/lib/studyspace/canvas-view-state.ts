export type CanvasView = { zoom: number; offsetX: number; offsetY: number };

export const DEFAULT_CANVAS_VIEW: CanvasView = { zoom: 1, offsetX: 0, offsetY: 0 };

export function clampZoom(zoom: number): number {
  return Math.min(3, Math.max(0.5, zoom));
}

export function zoomAtPoint(view: CanvasView, factor: number, x: number, y: number): CanvasView {
  const nextZoom = clampZoom(view.zoom * factor);
  const ratio = nextZoom / view.zoom;
  return {
    zoom: nextZoom,
    offsetX: x - (x - view.offsetX) * ratio,
    offsetY: y - (y - view.offsetY) * ratio,
  };
}

export function panView(view: CanvasView, dx: number, dy: number): CanvasView {
  return { ...view, offsetX: view.offsetX + dx, offsetY: view.offsetY + dy };
}
