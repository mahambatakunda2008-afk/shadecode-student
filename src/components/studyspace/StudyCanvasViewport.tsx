"use client";

import { useState } from "react";
import StudyCanvas from "./StudyCanvas";
import CanvasViewportControls from "./CanvasViewportControls";
import CanvasZoomControls from "./CanvasZoomControls";
import { DEFAULT_CANVAS_VIEW, type CanvasView } from "@/lib/studyspace/canvas-view-state";

export type StudyCanvasViewportProps = {
  storageKey?: string;
  height?: number;
  onChange?: (dataUrl: string) => void;
  className?: string;
};

export default function StudyCanvasViewport({ storageKey, height, onChange, className }: StudyCanvasViewportProps) {
  const [view, setView] = useState<CanvasView>(DEFAULT_CANVAS_VIEW);
  return (
    <section className={className} aria-label="Study canvas">
      <div className="mb-2 flex justify-end">
        <CanvasZoomControls value={view} onChange={setView} />
      </div>
      <div className="overflow-hidden rounded-xl touch-none">
        <CanvasViewportControls value={view} onChange={setView} className="origin-top-left" data-pan="true">
          <div style={{ transform: `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.zoom})`, transformOrigin: "0 0" }}>
            <StudyCanvas storageKey={storageKey} height={height} onChange={onChange} />
          </div>
        </CanvasViewportControls>
      </div>
    </section>
  );
}
