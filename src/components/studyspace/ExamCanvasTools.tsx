"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Pen, Redo2, RotateCcw, Undo2 } from "lucide-react";

type Props = { storageKey: string; onChange?: (dataUrl: string) => void };
type Point = { x: number; y: number };

export default function ExamCanvasTools({ storageKey, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);
  const drawingRef = useRef(false);
  const lastRef = useRef<Point | null>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [ink, setInk] = useState(false);

  const snapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    return canvas.toDataURL("image/png");
  };
  const restore = (data?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!data) { setInk(false); return; }
    const image = new Image();
    image.onload = () => { ctx.drawImage(image, 0, 0); setInk(true); };
    image.src = data;
  };
  const commit = () => {
    const data = snapshot();
    historyRef.current.push(data);
    if (historyRef.current.length > 20) historyRef.current.shift();
    redoRef.current = [];
    onChange?.(data);
    try { localStorage.setItem(storageKey, data); } catch {}
  };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const old = snapshot();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      restore(old);
    };
    resize();
    try { const saved = localStorage.getItem(storageKey); if (saved) restore(saved); } catch {}
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [storageKey]);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => { e.currentTarget.setPointerCapture(e.pointerId); drawingRef.current = true; lastRef.current = point(e); historyRef.current.push(snapshot()); };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastRef.current) return;
    const ctx = e.currentTarget.getContext("2d"); if (!ctx) return;
    const next = point(e); ctx.strokeStyle = tool === "eraser" ? "#ffffff" : "#111827"; ctx.lineWidth = tool === "eraser" ? 18 : 2.4; ctx.beginPath(); ctx.moveTo(lastRef.current.x, lastRef.current.y); ctx.lineTo(next.x, next.y); ctx.stroke(); lastRef.current = next; setInk(true);
  };
  const up = () => { if (!drawingRef.current) return; drawingRef.current = false; lastRef.current = null; commit(); };
  const undo = () => { const current = snapshot(); const previous = historyRef.current.pop(); if (!previous) return; redoRef.current.push(current); restore(historyRef.current.at(-1)); onChange?.(historyRef.current.at(-1) ?? ""); };
  const redo = () => { const next = redoRef.current.pop(); if (!next) return; historyRef.current.push(next); restore(next); onChange?.(next); };
  const clear = () => { historyRef.current.push(snapshot()); redoRef.current = []; restore(); onChange?.(""); try { localStorage.removeItem(storageKey); } catch {} };
  return <div className="space-y-2">
    <div className="flex items-center gap-1 rounded-xl border bg-background p-1">
      <button type="button" onClick={() => setTool("pen")} aria-label="Pen" className={`rounded-lg p-2 ${tool === "pen" ? "bg-muted" : ""}`}><Pen className="h-4 w-4" /></button>
      <button type="button" onClick={() => setTool("eraser")} aria-label="Eraser" className={`rounded-lg p-2 ${tool === "eraser" ? "bg-muted" : ""}`}><Eraser className="h-4 w-4" /></button>
      <button type="button" onClick={undo} disabled={!historyRef.current.length} aria-label="Undo" className="rounded-lg p-2 disabled:opacity-40"><Undo2 className="h-4 w-4" /></button>
      <button type="button" onClick={redo} disabled={!redoRef.current.length} aria-label="Redo" className="rounded-lg p-2 disabled:opacity-40"><Redo2 className="h-4 w-4" /></button>
      <button type="button" onClick={clear} disabled={!ink} aria-label="Clear canvas" className="ml-auto rounded-lg p-2 disabled:opacity-40"><RotateCcw className="h-4 w-4" /></button>
    </div>
    <div className="overflow-hidden rounded-xl border bg-white">
      <canvas ref={canvasRef} className="block h-[360px] w-full touch-none cursor-crosshair" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Exam working canvas" />
    </div>
  </div>;
}
