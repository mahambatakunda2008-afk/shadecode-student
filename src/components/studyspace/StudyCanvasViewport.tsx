"use client";

import { useState, type CSSProperties } from "react";
import StudyCanvas from "./StudyCanvas";
import CanvasViewportControls from "./CanvasViewportControls";
import CanvasZoomControls from "./CanvasZoomControls";
import { DEFAULT_CANVAS_VIEW, type CanvasView } from "@/lib/studyspace/canvas-view-state";

type Props = { storageKey?: string; height?: number; onChange?: (dataUrl: string) => void; className?: string };

export default function StudyCanvasViewport({ storageKey, height, onChange, className }: Props) {
  const [view, setView] = useState<CanvasView>(DEFAULT_CANVAS_VIEW);
  const canvasStyle: CSSProperties = {
    transform: `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.zoom})`,
    transformOrigin: "0 0",
    width: "max-content",
  };

  return (
    <section className={className} aria-label="Study canvas">
      <div className="mb-2 flex justify-end">
        <CanvasZoomControls value={view} onChange={setView} />
      </div>
      <div className="overflow-hidden rounded-xl touch-none">
        <CanvasViewportControls value={view} onChange={setView} className="relative overflow-hidden">
          <div data-pan="true" style={canvasStyle}>
            <StudyCanvas storageKey={storageKey} height={height} onChange={onChange} />
          </div>
        </CanvasViewportControls>
      </div>
    </section>
  );
}
