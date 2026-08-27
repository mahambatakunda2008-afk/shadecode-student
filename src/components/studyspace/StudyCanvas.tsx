"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { boundsForPoints, nearestAlignment, resizeBounds, translateBounds, type CanvasBounds } from "@/lib/studyspace/canvas-objects";
import { boundsForRect, boundsIntersect, moveBoundsFromPointer, pointInBounds, type Point } from "@/lib/studyspace/pointerGeometry";

type Stroke = { points: Point[] };
type CanvasObject = { id: string; bounds: CanvasBounds; strokeIndexes: number[] };
type PersistedCanvas = { strokes: Stroke[]; objects: CanvasObject[] };
type StudyCanvasProps = { storageKey?: string; height?: number; onChange?: (dataUrl: string) => void };
const DEFAULT_HEIGHT = 520;
const SNAP_TOLERANCE = 10;
const LASSO_TOLERANCE = 4;

export default function StudyCanvas({ storageKey = "shadecode-study-canvas", height = DEFAULT_HEIGHT, onChange }: StudyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const currentStrokeRef = useRef<Point[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const objectsRef = useRef<CanvasObject[]>([]);
  const dragRef = useRef<{ objectIndex: number; start: Point; originalBounds: CanvasBounds; originalStrokes: Stroke[] } | null>(null);
  const lassoRef = useRef<{ start: Point; current: Point } | null>(null);
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<number[]>([]);
  const [tool, setTool] = useState<"pen" | "select">("pen");
  const [hasInk, setHasInk] = useState(false);

  const draw = useCallback((strokes: Stroke[], selection: number[] = [], lasso?: CanvasBounds) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const p of stroke.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#2563eb";
    for (const index of selection) {
      const object = objectsRef.current[index];
      if (object) ctx.strokeRect(object.bounds.x - 4, object.bounds.y - 4, object.bounds.width + 8, object.bounds.height + 8);
    }
    if (lasso) ctx.strokeRect(lasso.x, lasso.y, lasso.width, lasso.height);
    ctx.restore();
  }, []);

  const snapshot = useCallback((nextObjects: CanvasObject[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ strokes: strokesRef.current, objects: nextObjects } satisfies PersistedCanvas)); } catch { /* storage unavailable */ }
    onChange?.(canvas.toDataURL("image/png"));
  }, [onChange, storageKey]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    draw(strokesRef.current, selectedObjects);
  }, [draw, height, selectedObjects]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedCanvas>;
        strokesRef.current = Array.isArray(parsed.strokes) ? parsed.strokes : [];
        const restored = Array.isArray(parsed.objects) ? parsed.objects : [];
        objectsRef.current = restored;
        setObjects(restored);
        setHasInk(strokesRef.current.length > 0);
      }
    } catch { /* ignore corrupt or unavailable storage */ }
    resizeCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [resizeCanvas, storageKey]);

  const point = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const p = point(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === "pen") {
      drawingRef.current = true;
      lastPointRef.current = p;
      currentStrokeRef.current = [p];
      return;
    }
    const hit = objectsRef.current.findIndex((object) => pointInBounds(p, object.bounds, LASSO_TOLERANCE));
    if (hit >= 0) {
      const nextSelection = event.shiftKey ? (selectedObjects.includes(hit) ? selectedObjects.filter((i) => i !== hit) : [...selectedObjects, hit]) : [hit];
      setSelectedObjects(nextSelection);
      if (!event.shiftKey) dragRef.current = { objectIndex: hit, start: p, originalBounds: objectsRef.current[hit].bounds, originalStrokes: strokesRef.current };
      draw(strokesRef.current, nextSelection);
    } else {
      setSelectedObjects([]);
      lassoRef.current = { start: p, current: p };
    }
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const p = point(event);
    if (drawingRef.current && lastPointRef.current) {
      const ctx = event.currentTarget.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      currentStrokeRef.current.push(p);
      lastPointRef.current = p;
      setHasInk(true);
      return;
    }
    const drag = dragRef.current;
    if (drag) {
      const nextBounds = moveBoundsFromPointer(drag.originalBounds, drag.start, p);
      const dx = nextBounds.x - drag.originalBounds.x;
      const dy = nextBounds.y - drag.originalBounds.y;
      const strokeIndexes = objectsRef.current[drag.objectIndex]?.strokeIndexes ?? [];
      strokesRef.current = drag.originalStrokes.map((stroke, index) => strokeIndexes.includes(index) ? { points: stroke.points.map((item) => ({ x: item.x + dx, y: item.y + dy })) } : stroke);
      const nextObjects = objectsRef.current.map((object, index) => index === drag.objectIndex ? { ...object, bounds: nextBounds } : object);
      objectsRef.current = nextObjects;
      setObjects(nextObjects);
      draw(strokesRef.current, [drag.objectIndex]);
      return;
    }
    if (lassoRef.current) {
      lassoRef.current.current = p;
      draw(strokesRef.current, selectedObjects, boundsForRect(lassoRef.current.start, p));
    }
  };

  const stop = () => {
    if (drawingRef.current) {
      drawingRef.current = false;
      lastPointRef.current = null;
      if (currentStrokeRef.current.length) {
        const strokeIndex = strokesRef.current.length;
        const stroke = { points: currentStrokeRef.current };
        strokesRef.current = [...strokesRef.current, stroke];
        const bounds = boundsForPoints(stroke.points.map((p) => p.x), stroke.points.map((p) => p.y));
        const nextObjects = [...objectsRef.current, { id: crypto.randomUUID(), bounds, strokeIndexes: [strokeIndex] }];
        currentStrokeRef.current = [];
        objectsRef.current = nextObjects;
        setObjects(nextObjects);
        snapshot(nextObjects);
      }
      return;
    }
    if (dragRef.current) {
      dragRef.current = null;
      snapshot(objectsRef.current);
      draw(strokesRef.current, selectedObjects);
      return;
    }
    if (lassoRef.current) {
      const box = boundsForRect(lassoRef.current.start, lassoRef.current.current);
      const selected = objectsRef.current.reduce<number[]>((result, object, index) => boundsIntersect(box, object.bounds) ? [...result, index] : result, []);
      lassoRef.current = null;
      setSelectedObjects(selected);
      draw(strokesRef.current, selected);
    }
  };

  const clear = () => {
    strokesRef.current = [];
    objectsRef.current = [];
    setObjects([]);
    setSelectedObjects([]);
    setHasInk(false);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    resizeCanvas();
    onChange?.("");
  };

  const transformSelected = (kind: "snapX" | "snapY" | "resize") => {
    const targetIndex = selectedObjects[0];
    if (targetIndex === undefined) return;
    const nextObjects = objectsRef.current.map((object, index) => {
      if (index !== targetIndex) return object;
      if (kind === "resize") return { ...object, bounds: resizeBounds(object.bounds, object.bounds.width + 10, object.bounds.height + 10) };
      const axis = kind === "snapX" ? "x" : "y";
      const guides = objectsRef.current.filter((_, i) => i !== targetIndex).flatMap((item) => axis === "x" ? [item.bounds.x, item.bounds.x + item.bounds.width / 2] : [item.bounds.y, item.bounds.y + item.bounds.height / 2]);
      const value = axis === "x" ? object.bounds.x : object.bounds.y;
      const target = nearestAlignment(value, guides, SNAP_TOLERANCE);
      if (target === null) return object;
      return { ...object, bounds: axis === "x" ? translateBounds(object.bounds, target - value, 0) : translateBounds(object.bounds, 0, target - value) };
    });
    objectsRef.current = nextObjects;
    setObjects(nextObjects);
    draw(strokesRef.current, selectedObjects);
    snapshot(nextObjects);
  };

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
      <div><strong style={{ fontSize: 14 }}>Smart Canvas</strong><p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>Draw, select, drag, lasso, align and resize your working.</p></div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => { setTool("pen"); setSelectedObjects([]); }} aria-pressed={tool === "pen"} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "7px 10px", background: tool === "pen" ? "var(--primary)" : "var(--muted)", color: tool === "pen" ? "white" : "var(--foreground)" }}>Pen</button>
        <button type="button" onClick={() => setTool("select")} aria-pressed={tool === "select"} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "7px 10px", background: tool === "select" ? "var(--primary)" : "var(--muted)", color: tool === "select" ? "white" : "var(--foreground)" }}>Select</button>
        <button type="button" onClick={clear} disabled={!hasInk} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "7px 10px", background: "var(--muted)", color: "var(--foreground)", opacity: hasInk ? 1 : 0.5 }}>Clear</button>
      </div>
    </div>
    <div style={{ overflow: "hidden", border: "1px solid var(--card-border)", borderRadius: 12, background: "#fff", touchAction: "none" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height, cursor: tool === "pen" ? "crosshair" : "grab", touchAction: "none" }} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} aria-label="Study canvas" />
    </div>
    {selectedObjects.length > 0 && <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, alignSelf: "center", color: "var(--muted-foreground)" }}>{selectedObjects.length} object{selectedObjects.length === 1 ? "" : "s"} selected</span>
      {selectedObjects.length === 1 && <><button type="button" onClick={() => transformSelected("snapX")} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "6px 9px", background: "var(--muted)" }}>Snap X</button><button type="button" onClick={() => transformSelected("snapY")} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "6px 9px", background: "var(--muted)" }}>Snap Y</button><button type="button" onClick={() => transformSelected("resize")} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "6px 9px", background: "var(--muted)" }}>Resize +</button></>}
    </div>}
    <p style={{ margin: "7px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>{objects.length} structured object{objects.length === 1 ? "" : "s"}. Saved locally on this device.</p>
  </div>;
}
