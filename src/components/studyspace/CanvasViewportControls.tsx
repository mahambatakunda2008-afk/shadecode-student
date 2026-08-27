"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { DEFAULT_CANVAS_VIEW, panView, zoomAtPoint, type CanvasView } from "@/lib/studyspace/canvas-view-state";
import { wheelZoom } from "@/lib/studyspace/canvas-interaction";

export type CanvasViewportControlsProps = {
  value?: CanvasView;
  onChange?: (view: CanvasView) => void;
  className?: string;
};

export default function CanvasViewportControls({ value = DEFAULT_CANVAS_VIEW, onChange, className }: CanvasViewportControlsProps) {
  const [view, setView] = useState(value);
  const panRef = useRef<{ x: number; y: number; view: CanvasView } | null>(null);

  useEffect(() => setView(value), [value]);
  const update = useCallback((next: CanvasView) => { setView(next); onChange?.(next); }, [onChange]);

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    update(wheelZoom(view, event.deltaY, event.clientX - rect.left, event.clientY - rect.top));
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!(event.button === 1 || event.button === 0 && (event.shiftKey || event.currentTarget.dataset.pan === "true"))) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { x: event.clientX, y: event.clientY, view };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = panRef.current; if (!start) return;
    update(panView(start.view, event.clientX - start.x, event.clientY - start.y));
  };
  const endPan = () => { panRef.current = null; };

  return <div className={className} data-zoom={view.zoom} data-offset-x={view.offsetX} data-offset-y={view.offsetY} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPan} onPointerCancel={endPan} />;
}
