"use client";

import { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

type StudyCanvasProps = {
  storageKey?: string;
  height?: number;
  onChange?: (dataUrl: string) => void;
};

const DEFAULT_HEIGHT = 520;

export default function StudyCanvas({ storageKey = "shadecode-study-canvas", height = DEFAULT_HEIGHT, onChange }: StudyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const paint = (context: CanvasRenderingContext2D, from: Point, to: Point) => {
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  };

  const snapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    try { localStorage.setItem(storageKey, data); } catch { /* storage may be unavailable */ }
    onChange?.(data);
  };

  const resize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const previous = canvas.toDataURL("image/png");
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(dpr, dpr);
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";
    if (previous !== "data:image/png;base64,iVBORw0KGgo=") {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, rect.width, height);
      image.src = previous;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    context.scale(dpr, dpr);
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";

    const saved = (() => { try { return localStorage.getItem(storageKey); } catch { return null; } })();
    if (saved) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, rect.width, height);
      image.src = saved;
      setHasInk(true);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [height, storageKey]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = point(event);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastPointRef.current) return;
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) return;
    const next = point(event);
    paint(context, lastPointRef.current, next);
    lastPointRef.current = next;
    setHasInk(true);
  };

  const stop = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    snapshot();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, height);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    setHasInk(false);
    onChange?.("");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div>
          <strong style={{ fontSize: 14 }}>Canvas</strong>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>Write equations, sketch diagrams, plan essays, or show your working.</p>
        </div>
        <button type="button" onClick={clear} disabled={!hasInk} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "7px 10px", background: "var(--muted)", color: "var(--foreground)", cursor: hasInk ? "pointer" : "not-allowed", opacity: hasInk ? 1 : 0.5 }}>Clear</button>
      </div>
      <div style={{ overflow: "hidden", border: "1px solid var(--card-border)", borderRadius: 12, background: "#fff", touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height, cursor: "crosshair", touchAction: "none" }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={stop}
          aria-label="Study canvas"
        />
      </div>
      <p style={{ margin: "7px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>Saved locally on this device. You can keep working without a network connection.</p>
    </div>
  );
}
