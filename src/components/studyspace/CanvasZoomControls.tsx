"use client";

import { clampZoom, DEFAULT_CANVAS_VIEW, type CanvasView } from "@/lib/studyspace/canvas-view-state";

type Props = { value?: CanvasView; onChange?: (view: CanvasView) => void; className?: string };

export default function CanvasZoomControls({ value = DEFAULT_CANVAS_VIEW, onChange, className }: Props) {
  const setZoom = (zoom: number) => onChange?.({ ...value, zoom: clampZoom(zoom) });
  return (
    <div className={className} role="group" aria-label="Canvas zoom controls">
      <button type="button" aria-label="Zoom out" onClick={() => setZoom(value.zoom - 0.1)}>−</button>
      <button type="button" aria-label="Reset zoom" onClick={() => onChange?.(DEFAULT_CANVAS_VIEW)}>{Math.round(value.zoom * 100)}%</button>
      <button type="button" aria-label="Zoom in" onClick={() => setZoom(value.zoom + 0.1)}>+</button>
    </div>
  );
}
