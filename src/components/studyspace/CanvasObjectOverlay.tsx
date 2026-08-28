"use client";

import { useMemo, useState } from "react";
import { AlignCenter, Move, RotateCw, ScanText, Trash2 } from "lucide-react";
import type { CanvasObject } from "@/lib/studyspace/canvas-objects";

type Props = { objects: CanvasObject[]; selectedId?: string; onSelect?: (id: string | undefined) => void; onMove?: (id: string, dx: number, dy: number) => void; onResize?: (id: string, width: number, height: number) => void; onRotate?: (id: string, degrees: number) => void; onAlign?: (id: string) => void; onDelete?: (id: string) => void; onRecognize?: (id: string) => void };

export default function CanvasObjectOverlay({ objects, selectedId, onSelect, onMove, onResize, onRotate, onAlign, onDelete, onRecognize }: Props) {
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const selected = useMemo(() => objects.find((object) => object.id === selectedId), [objects, selectedId]);
  if (!selected) return null;
  return <div className="pointer-events-none absolute inset-0">
    <div className="pointer-events-auto absolute rounded-lg border-2 border-primary/70" style={{ left: selected.bounds.x, top: selected.bounds.y, width: selected.bounds.width, height: selected.bounds.height, transform: `rotate(${selected.bounds.rotation}deg)` }} onPointerDown={(event) => { event.stopPropagation(); setDrag({ id: selected.id, x: event.clientX, y: event.clientY }); }} onPointerMove={(event) => { if (!drag || drag.id !== selected.id) return; onMove?.(selected.id, event.clientX - drag.x, event.clientY - drag.y); setDrag({ ...drag, x: event.clientX, y: event.clientY }); }} onPointerUp={() => setDrag(null)}>
      <div className="absolute -top-10 left-0 flex items-center gap-0.5 rounded-lg border bg-background p-1 shadow-sm">
        <button type="button" aria-label="Move object" title="Move" className="rounded p-1.5"><Move className="h-3.5 w-3.5" /></button>
        <button type="button" aria-label="Align object" title="Align" onClick={(event) => { event.stopPropagation(); onAlign?.(selected.id); }} className="rounded p-1.5"><AlignCenter className="h-3.5 w-3.5" /></button>
        <button type="button" aria-label="Rotate object" title="Rotate" onClick={(event) => { event.stopPropagation(); onRotate?.(selected.id, 90); }} className="rounded p-1.5"><RotateCw className="h-3.5 w-3.5" /></button>
        <button type="button" aria-label="Recognize object" title="Recognize" onClick={(event) => { event.stopPropagation(); onRecognize?.(selected.id); }} className="rounded p-1.5"><ScanText className="h-3.5 w-3.5" /></button>
        <button type="button" aria-label="Delete object" title="Delete" onClick={(event) => { event.stopPropagation(); onDelete?.(selected.id); }} className="rounded p-1.5"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <button type="button" aria-label="Resize object" title="Resize" className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background" onPointerDown={(event) => { event.stopPropagation(); const startW = selected.bounds.width; const startH = selected.bounds.height; const startX = event.clientX; const startY = event.clientY; const move = (e: PointerEvent) => onResize?.(selected.id, startW + e.clientX - startX, startH + e.clientY - startY); const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); }} />
    </div>
    <button type="button" aria-label="Select canvas object" className="absolute inset-0 -z-10 cursor-default" onClick={() => onSelect?.(undefined)} />
  </div>;
}
