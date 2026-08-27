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

export default function StudyCanvas({ storageKey = "shadecode-study-canvas", height = DEFAULT_HEIGHT, onChange }: StudyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const currentStrokeRef = useRef<Point[]>([]);
  const dragRef = useRef<{ start: Point; selected: number[]; originalStrokes: Stroke[]; originalObjects: CanvasObject[] } | null>(null);
  const lassoRef = useRef<Point | null>(null);
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<number[]>([]);
  const [tool, setTool] = useState<"pen" | "select">("pen");
  const [hasInk, setHasInk] = useState(false);

  const draw = useCallback((strokes: Stroke[], selected: number[] = []) => {
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
    for (const index of selected) {
      const b = objects[index]?.bounds;
      if (!b) continue;
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x - 5, b.y - 5, b.width + 10, b.height + 10);
      ctx.restore();
    }
    const lasso = lassoRef.current;
    if (lasso) {
      const end = lastPointRef.current ?? lasso;
      const b = boundsForRect(lasso, end);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#64748b";
      ctx.strokeRect(b.x, b.y, b.width, b.height);
      ctx.restore();
    }
  }, [objects]);

  const snapshot = useCallback((nextObjects = objects, nextStrokes = strokesRef.current) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ strokes: nextStrokes, objects: nextObjects } satisfies PersistedCanvas));
    } catch {}
    onChange?.(canvas.toDataURL("image/png"));
  }, [objects, onChange, storageKey]);

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
        const parsed = JSON.parse(raw) as PersistedCanvas;
        strokesRef.current = Array.isArray(parsed.strokes) ? parsed.strokes : [];
        setObjects(Array.isArray(parsed.objects) ? parsed.objects : []);
        setHasInk(strokesRef.current.length > 0);
      }
    } catch {}
    resizeCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [resizeCanvas, storageKey]);

  useEffect(() => {
    draw(strokesRef.current, selectedObjects);
  }, [draw, objects, selectedObjects]);

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
    const hit = objects.findIndex((o) => pointInBounds(p, o.bounds, 6));
    if (hit >= 0) {
      const selection = event.shiftKey
        ? selectedObjects.includes(hit) ? selectedObjects.filter((i) => i !== hit) : [...selectedObjects, hit]
        : [hit];
      setSelectedObjects(selection);
      dragRef.current = {
        start: p,
        selected: selection,
        originalStrokes: strokesRef.current.map((s) => ({ points: s.points.map((q) => ({ ...q })) })),
        originalObjects: objects.map((o) => ({ ...o, bounds: { ...o.bounds }, strokeIndexes: [...o.strokeIndexes] })),
      };
    } else {
      setSelectedObjects([]);
      lassoRef.current = p;
      lastPointRef.current = p;
      draw(strokesRef.current, []);
    }
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const p = point(event);
    if (drawingRef.current && lastPointRef.current) {
      const ctx = event.currentTarget.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      currentStrokeRef.current.push(p);
      lastPointRef.current = p;
      setHasInk(true);
      return;
    }
    if (dragRef.current) {
      const d = dragRef.current;
      const dx = p.x - d.start.x;
      const dy = p.y - d.start.y;
      const nextStrokes = d.originalStrokes.map((stroke, si) => d.originalObjects.some((o, oi) => d.selected.includes(oi) && o.strokeIndexes.includes(si))
        ? { points: stroke.points.map((q) => ({ x: q.x + dx, y: q.y + dy })) }
        : stroke);
      const nextObjects = d.originalObjects.map((o, oi) => d.selected.includes(oi) ? { ...o, bounds: moveBoundsFromPointer(o.bounds, d.start, p) } : o);
      strokesRef.current = nextStrokes;
      setObjects(nextObjects);
      draw(nextStrokes, selectedObjects);
      return;
    }
    if (lassoRef.current) {
      lastPointRef.current = p;
      draw(strokesRef.current, selectedObjects);
    }
  };

  const stop = (event?: PointerEvent<HTMLCanvasElement>) => {
    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drawingRef.current) {
      drawingRef.current = false;
      lastPointRef.current = null;
      if (currentStrokeRef.current.length) {
        const stroke = { points: currentStrokeRef.current };
        const index = strokesRef.current.length;
        const nextStrokes = [...strokesRef.current, stroke];
        strokesRef.current = nextStrokes;
        const bounds = boundsForPoints(stroke.points.map((p) => p.x), stroke.points.map((p) => p.y));
        const nextObjects = [...objects, { id: crypto.randomUUID(), bounds, strokeIndexes: [index] }];
        currentStrokeRef.current = [];
        setObjects(nextObjects);
        setHasInk(true);
        snapshot(nextObjects, nextStrokes);
      }
      return;
    }
    if (dragRef.current) {
      snapshot(objects, strokesRef.current);
      dragRef.current = null;
      return;
    }
    if (lassoRef.current) {
      const end = lastPointRef.current ?? lassoRef.current;
      const lasso = boundsForRect(lassoRef.current, end);
      const selected = objects.map((o, i) => boundsIntersect(lasso, o.bounds) ? i : -1).filter((i) => i >= 0);
      setSelectedObjects(selected);
      lassoRef.current = null;
      lastPointRef.current = null;
      draw(strokesRef.current, selected);
    }
  };

  const clear = () => {
    strokesRef.current = [];
    setObjects([]);
    setSelectedObjects([]);
    setHasInk(false);
    try { localStorage.removeItem(storageKey); } catch {}
    resizeCanvas();
    onChange?.("");
  };

  const transformSelected = (kind: "snapX" | "snapY" | "resize") => {
    if (!selectedObjects.length) return;
    let nextObjects = [...objects];
    selectedObjects.forEach((selectedObject) => {
      const object = nextObjects[selectedObject];
      if (!object) return;
      if (kind === "resize") {
        nextObjects[selectedObject] = { ...object, bounds: resizeBounds(object.bounds, object.bounds.width + 10, object.bounds.height + 10) };
        return;
      }
      const axis = kind === "snapX" ? "x" : "y";
      const guides = nextObjects.filter((_, i) => i !== selectedObject).flatMap((item) => axis === "x" ? [item.bounds.x, item.bounds.x + item.bounds.width / 2] : [item.bounds.y, item.bounds.y + item.bounds.height / 2]);
      const value = axis === "x" ? object.bounds.x : object.bounds.y;
      const target = nearestAlignment(value, guides, SNAP_TOLERANCE);
      if (target !== null) nextObjects[selectedObject] = { ...object, bounds: axis === "x" ? translateBounds(object.bounds, target - value, 0) : translateBounds(object.bounds, 0, target - value) };
    });
    setObjects(nextObjects);
    snapshot(nextObjects);
  };

  return <div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}><div><strong style={{ fontSize: 14 }}>Smart Canvas</strong><p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>Draw, select, drag and lasso your working.</p></div><div style={{ display: "flex", gap: 6 }}><button type="button" onClick={() => setTool("pen")} aria-pressed={tool === "pen"}>Pen</button><button type="button" onClick={() => setTool("select")} aria-pressed={tool === "select"}>Select</button><button type="button" onClick={clear} disabled={!hasInk}>Clear</button></div></div><div style={{ overflow: "hidden", border: "1px solid var(--card-border)", borderRadius: 12, background: "#fff", touchAction: "none" }}><canvas ref={canvasRef} style={{ display: "block", width: "100%", height, cursor: tool === "pen" ? "crosshair" : "default", touchAction: "none" }} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} aria-label="Study canvas" /></div>{selectedObjects.length > 0 && <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}><span style={{ fontSize: 12, alignSelf: "center", color: "var(--muted-foreground)" }}>{selectedObjects.length} selected</span><button type="button" onClick={() => transformSelected("snapX")}>Snap X</button><button type="button" onClick={() => transformSelected("snapY")}>Snap Y</button><button type="button" onClick={() => transformSelected("resize")}>Resize +</button></div>}<p style={{ margin: "7px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>{objects.length} structured object{objects.length === 1 ? "" : "s"}. Saved locally on this device.</p></div>;
}
