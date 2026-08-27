"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { boundsForPoints, nearestAlignment, resizeBounds, translateBounds, type CanvasBounds } from "@/lib/studyspace/canvas-objects";

type Point = { x: number; y: number };
type Stroke = { points: Point[] };
type CanvasObject = { id: string; bounds: CanvasBounds; strokeIndexes: number[] };
type PersistedCanvas = { strokes: Stroke[]; objects: CanvasObject[] };

type StudyCanvasProps = { storageKey?: string; height?: number; onChange?: (dataUrl: string) => void };
const DEFAULT_HEIGHT = 520;
const SNAP_TOLERANCE = 10;

export default function StudyCanvas({ storageKey = "shadecode-study-canvas", height = DEFAULT_HEIGHT, onChange }: StudyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const currentStrokeRef = useRef<Point[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<number | null>(null);
  const [tool, setTool] = useState<"pen" | "select">("pen");
  const [hasInk, setHasInk] = useState(false);

  const draw = useCallback((strokes: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
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
  }, []);

  const snapshot = useCallback((nextObjects = objects) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    const payload: PersistedCanvas = { strokes: strokesRef.current, objects: nextObjects };
    try { localStorage.setItem(storageKey, JSON.stringify(payload)); } catch { /* storage unavailable */ }
    onChange?.(data);
  }, [objects, onChange, storageKey]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    draw(strokesRef.current);
  }, [draw, height]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedCanvas;
        strokesRef.current = Array.isArray(parsed.strokes) ? parsed.strokes : [];
        setObjects(Array.isArray(parsed.objects) ? parsed.objects : []);
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
    if (tool === "select") {
      const index = objects.findIndex((object) => p.x >= object.bounds.x && p.x <= object.bounds.x + object.bounds.width && p.y >= object.bounds.y && p.y <= object.bounds.y + object.bounds.height);
      setSelectedObject(index >= 0 ? index : null);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = p;
    currentStrokeRef.current = [p];
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastPointRef.current) return;
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    currentStrokeRef.current.push(p);
    lastPointRef.current = p;
    setHasInk(true);
  };

  const stop = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (currentStrokeRef.current.length) {
      const strokeIndex = strokesRef.current.length;
      const stroke = { points: currentStrokeRef.current };
      strokesRef.current = [...strokesRef.current, stroke];
      const bounds = boundsForPoints(stroke.points.map((p) => p.x), stroke.points.map((p) => p.y));
      const nextObjects = [...objects, { id: crypto.randomUUID(), bounds, strokeIndexes: [strokeIndex] }];
      currentStrokeRef.current = [];
      setObjects(nextObjects);
      snapshot(nextObjects);
    }
  };

  const clear = () => {
    strokesRef.current = [];
    setObjects([]);
    setSelectedObject(null);
    setHasInk(false);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    resizeCanvas();
    onChange?.("");
  };

  const transformSelected = (kind: "snapX" | "snapY" | "resize") => {
    if (selectedObject === null) return;
    const nextObjects = objects.map((object, index) => {
      if (index !== selectedObject) return object;
      if (kind === "resize") return { ...object, bounds: resizeBounds(object.bounds, object.bounds.width + 10, object.bounds.height + 10) };
      const axis = kind === "snapX" ? "x" : "y";
      const guides = objects.filter((_, i) => i !== selectedObject).flatMap((item) => axis === "x" ? [item.bounds.x, item.bounds.x + item.bounds.width / 2] : [item.bounds.y, item.bounds.y + item.bounds.height / 2]);
      const value = axis === "x" ? object.bounds.x : object.bounds.y;
      const target = nearestAlignment(value, guides, SNAP_TOLERANCE);
      if (target === null) return object;
      return { ...object, bounds: axis === "x" ? translateBounds(object.bounds, target - value, 0) : translateBounds(object.bounds, 0, target - value) };
    });
    setObjects(nextObjects);
    snapshot(nextObjects);
  };

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
      <div><strong style={{ fontSize: 14 }}>Smart Canvas</strong><p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>Draw freely, select structured strokes, align and resize your working.</p></div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => setTool("pen")} aria-pressed={tool === "pen"} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "7px 10px", background: tool === "pen" ? "var(--primary)" : "var(--muted)", color: tool === "pen" ? "white" : "var(--foreground)" }}>Pen</button>
        <button type="button" onClick={() => setTool("select")} aria-pressed={tool === "select"} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "7px 10px", background: tool === "select" ? "var(--primary)" : "var(--muted)", color: tool === "select" ? "white" : "var(--foreground)" }}>Select</button>
        <button type="button" onClick={clear} disabled={!hasInk} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "7px 10px", background: "var(--muted)", color: "var(--foreground)", opacity: hasInk ? 1 : 0.5 }}>Clear</button>
      </div>
    </div>
    <div style={{ overflow: "hidden", border: "1px solid var(--card-border)", borderRadius: 12, background: "#fff", touchAction: "none" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height, cursor: tool === "pen" ? "crosshair" : "default", touchAction: "none" }} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} aria-label="Study canvas" />
    </div>
    {selectedObject !== null && objects[selectedObject] && <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, alignSelf: "center", color: "var(--muted-foreground)" }}>Object selected</span>
      <button type="button" onClick={() => transformSelected("snapX")} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "6px 9px", background: "var(--muted)" }}>Snap X</button>
      <button type="button" onClick={() => transformSelected("snapY")} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "6px 9px", background: "var(--muted)" }}>Snap Y</button>
      <button type="button" onClick={() => transformSelected("resize")} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "6px 9px", background: "var(--muted)" }}>Resize +</button>
    </div>}
    <p style={{ margin: "7px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>{objects.length} structured object{objects.length === 1 ? "" : "s"}. Saved locally on this device.</p>
  </div>;
}
