"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { AlignCenter, Eraser, Highlighter, Loader2, Pen, Redo2, RotateCcw, ScanText, Undo2 } from "lucide-react";

type Stroke = { x: number[]; y: number[]; tool?: "pen" | "highlighter" | "eraser" };
type Props = { storageKey: string; onChange?: (dataUrl: string) => void; onRecognized?: (result: { text: string; latex: string; confidence: number | null }) => void };
type Point = { x: number; y: number };
const MAX_STROKES = 500;

export default function ExamCanvasTools({ storageKey, onChange, onRecognized }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const historyRef = useRef<Stroke[][]>([]);
  const redoRef = useRef<Stroke[][]>([]);
  const drawingRef = useRef(false);
  const lastRef = useRef<Point | null>(null);
  const [tool, setTool] = useState<"pen" | "eraser" | "highlighter">("pen");
  const [ink, setInk] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [message, setMessage] = useState("");

  const clone = (value: Stroke[]) => value.map((stroke) => ({ x: [...stroke.x], y: [...stroke.y], tool: stroke.tool }));
  const persist = () => {
    const canvas = canvasRef.current;
    const data = canvas?.toDataURL("image/png") ?? "";
    try { localStorage.setItem(storageKey, data); localStorage.setItem(`${storageKey}:strokes`, JSON.stringify(strokesRef.current)); } catch {}
    onChange?.(data);
  };
  const redraw = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); const width = canvas.clientWidth; const height = canvas.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height); ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const stroke of strokesRef.current) {
      if (stroke.x.length < 2) continue;
      ctx.beginPath(); ctx.moveTo(stroke.x[0], stroke.y[0]);
      for (let i = 1; i < stroke.x.length; i += 1) ctx.lineTo(stroke.x[i], stroke.y[i]);
      const mode = stroke.tool ?? "pen";
      ctx.globalCompositeOperation = mode === "eraser" ? "destination-out" : "source-over";
      ctx.globalAlpha = mode === "highlighter" ? 0.32 : 1;
      ctx.strokeStyle = mode === "highlighter" ? "#f5d90a" : "#111827";
      ctx.lineWidth = mode === "eraser" ? 20 : mode === "highlighter" ? 12 : 2.4;
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  };
  const resize = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const width = canvas.clientWidth || 1; const height = canvas.clientHeight || 1; const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr)); redraw();
  };
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    try { const saved = localStorage.getItem(`${storageKey}:strokes`); if (saved) strokesRef.current = JSON.parse(saved) as Stroke[]; setInk(strokesRef.current.length > 0); } catch {}
    resize(); const observer = new ResizeObserver(resize); observer.observe(canvas); return () => observer.disconnect();
  }, [storageKey]);
  const point = (event: PointerEvent<HTMLCanvasElement>): Point => { const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  const down = (event: PointerEvent<HTMLCanvasElement>) => { event.currentTarget.setPointerCapture(event.pointerId); historyRef.current.push(clone(strokesRef.current)); if (historyRef.current.length > 30) historyRef.current.shift(); redoRef.current = []; drawingRef.current = true; const p = point(event); lastRef.current = p; currentRef.current = { x: [p.x], y: [p.y], tool }; };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastRef.current || !currentRef.current) return;
    const p = point(event); currentRef.current.x.push(p.x); currentRef.current.y.push(p.y); lastRef.current = p;
    const ctx = event.currentTarget.getContext("2d"); if (!ctx) return;
    ctx.beginPath(); ctx.moveTo(currentRef.current.x.at(-2) ?? p.x, currentRef.current.y.at(-2) ?? p.y); ctx.lineTo(p.x, p.y);
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over"; ctx.globalAlpha = tool === "highlighter" ? 0.32 : 1; ctx.strokeStyle = tool === "highlighter" ? "#f5d90a" : "#111827"; ctx.lineWidth = tool === "eraser" ? 20 : tool === "highlighter" ? 12 : 2.4; ctx.lineCap = "round"; ctx.stroke(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  };
  const up = () => { if (!drawingRef.current || !currentRef.current) return; drawingRef.current = false; const stroke = currentRef.current; currentRef.current = null; if (stroke.x.length > 1 && strokesRef.current.length < MAX_STROKES) strokesRef.current.push(stroke); lastRef.current = null; setInk(strokesRef.current.length > 0); persist(); };
  const undo = () => { const previous = historyRef.current.pop(); if (!previous) return; redoRef.current.push(clone(strokesRef.current)); strokesRef.current = previous; redraw(); persist(); };
  const redo = () => { const next = redoRef.current.pop(); if (!next) return; historyRef.current.push(clone(strokesRef.current)); strokesRef.current = next; redraw(); persist(); };
  const clear = () => { historyRef.current.push(clone(strokesRef.current)); strokesRef.current = []; redoRef.current = []; redraw(); setInk(false); persist(); };
  const tidy = () => {
    if (!strokesRef.current.length) return; historyRef.current.push(clone(strokesRef.current));
    const averages = strokesRef.current.map((s) => s.y.reduce((a, b) => a + b, 0) / s.y.length); const bands: number[] = [];
    for (const y of [...averages].sort((a, b) => a - b)) { const last = bands.at(-1); if (last === undefined || Math.abs(y - last) > 12) bands.push(y); }
    strokesRef.current = strokesRef.current.map((s) => { const avg = s.y.reduce((a, b) => a + b, 0) / s.y.length; const nearest = bands.reduce((best, band) => Math.abs(band - avg) < Math.abs(best - avg) ? band : best, bands[0] ?? avg); const delta = nearest - avg; return { ...s, x: [...s.x], y: s.y.map((y) => y + delta) }; }); redraw(); persist(); setMessage("Working aligned");
  };
  const recognize = async () => {
    if (!strokesRef.current.length) return; setRecognizing(true); setMessage("");
    try {
      const response = await fetch("/api/studyspace/handwriting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ strokes: { strokes: { x: strokesRef.current.map((s) => s.x), y: strokesRef.current.map((s) => s.y) } } }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Recognition failed");
      onRecognized?.({ text: result.text ?? "", latex: result.latex ?? "", confidence: result.confidence ?? null }); setMessage(result.text || result.latex ? "Recognized" : "No handwriting detected");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Recognition unavailable"); } finally { setRecognizing(false); }
  };
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-1 rounded-xl border bg-background p-1">
      <button type="button" onClick={() => setTool("pen")} aria-label="Pen" className={`rounded-lg p-2 ${tool === "pen" ? "bg-muted" : ""}`}><Pen className="h-4 w-4" /></button>
      <button type="button" onClick={() => setTool("highlighter")} aria-label="Highlighter" className={`rounded-lg p-2 ${tool === "highlighter" ? "bg-muted" : ""}`}><Highlighter className="h-4 w-4" /></button>
      <button type="button" onClick={() => setTool("eraser")} aria-label="Eraser" className={`rounded-lg p-2 ${tool === "eraser" ? "bg-muted" : ""}`}><Eraser className="h-4 w-4" /></button>
      <button type="button" onClick={undo} disabled={!historyRef.current.length} aria-label="Undo" className="rounded-lg p-2 disabled:opacity-40"><Undo2 className="h-4 w-4" /></button>
      <button type="button" onClick={redo} disabled={!redoRef.current.length} aria-label="Redo" className="rounded-lg p-2 disabled:opacity-40"><Redo2 className="h-4 w-4" /></button>
      <button type="button" onClick={tidy} disabled={!ink} aria-label="Align working" className="rounded-lg p-2 disabled:opacity-40"><AlignCenter className="h-4 w-4" /></button>
      <button type="button" onClick={recognize} disabled={!ink || recognizing} aria-label="Recognize handwriting" className="rounded-lg p-2 disabled:opacity-40">{recognizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}</button>
      <button type="button" onClick={clear} disabled={!ink} aria-label="Clear canvas" className="ml-auto rounded-lg p-2 disabled:opacity-40"><RotateCcw className="h-4 w-4" /></button>
    </div>
    <div className="overflow-hidden rounded-xl border bg-white"><canvas ref={canvasRef} className="block h-[360px] w-full touch-none cursor-crosshair" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Exam working canvas" /></div>
    <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{message || "Your working is saved locally."}</span><span>{recognizing ? "Recognizing…" : "Offline drawing available"}</span></div>
  </div>;
}
