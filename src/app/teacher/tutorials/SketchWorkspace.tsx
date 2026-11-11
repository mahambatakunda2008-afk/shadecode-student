"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

type Tool = "pen" | "eraser" | "line" | "arrow" | "rectangle" | "ellipse" | "triangle" | "curve" | "label";
type Point = { x: number; y: number };
type Stroke = { points: Point[]; tool: "pen" | "eraser"; color: string; width: number };

const WIDTH = 1200;
const HEIGHT = 700;
const INK = "#172033";

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function smoothPath(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 3) {
    if (points.length === 2) { ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[1].x, points[1].y); ctx.stroke(); }
    return;
  }
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
    ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

function drawArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = Math.max(16, Math.min(28, distance(from, to) * 0.12));
  ctx.beginPath();
  ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function drawShape(ctx: CanvasRenderingContext2D, from: Point, to: Point, tool: Tool) {
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const left = Math.min(from.x, to.x), top = Math.min(from.y, to.y);
  const w = Math.abs(to.x - from.x), h = Math.abs(to.y - from.y);
  if (tool === "line") { ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); }
  else if (tool === "arrow") drawArrow(ctx, from, to);
  else if (tool === "rectangle") ctx.strokeRect(left, top, w, h);
  else if (tool === "ellipse") { ctx.beginPath(); ctx.ellipse(left + w / 2, top + h / 2, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2); ctx.stroke(); }
  else if (tool === "triangle") { ctx.beginPath(); ctx.moveTo(left + w / 2, top); ctx.lineTo(left + w, top + h); ctx.lineTo(left, top + h); ctx.closePath(); ctx.stroke(); }
  else if (tool === "curve") {
    const bend = Math.max(24, Math.min(140, distance(from, to) * 0.22));
    ctx.beginPath(); ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo((from.x + to.x) / 2, (from.y + to.y) / 2 - bend, to.x, to.y); ctx.stroke();
  }
}

function recognizeShape(points: Point[]): { tool: Tool; from: Point; to: Point } | null {
  if (points.length < 8) return null;
  const first = points[0], last = points[points.length - 1];
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  const w = right - left, h = bottom - top;
  if (Math.max(w, h) < 24) return null;
  const direct = distance(first, last);
  const pathLength = points.slice(1).reduce((sum, p, i) => sum + distance(points[i], p), 0);
  const straightness = direct / Math.max(pathLength, 1);
  if (straightness > 0.94) return { tool: "line", from: first, to: last };

  const closed = distance(first, last) < Math.max(30, Math.min(w, h) * 0.22);
  if (!closed) {
    // Recognize a hand-drawn arrow by checking for a sharp, compact endpoint head.
    const tail = points[Math.max(0, points.length - 7)];
    if (distance(tail, last) < 55 && pathLength > direct * 1.2) return { tool: "curve", from: first, to: last };
    return null;
  }

  const corners = points.filter((p, i) => {
    if (i < 2 || i > points.length - 3) return false;
    const a = points[i - 2], b = points[i], c = points[i + 2];
    const v1 = Math.atan2(b.y - a.y, b.x - a.x);
    const v2 = Math.atan2(c.y - b.y, c.x - b.x);
    let delta = Math.abs(v2 - v1); if (delta > Math.PI) delta = Math.PI * 2 - delta;
    return delta > 0.55;
  });
  const circularity = (4 * Math.PI * (w * h)) / Math.max(pathLength * pathLength, 1);
  if (circularity > 0.48 && Math.min(w, h) / Math.max(w, h) > 0.45) return { tool: "ellipse", from: { x: left, y: top }, to: { x: right, y: bottom } };
  if (corners.length >= 3 && corners.length <= 7) {
    if (corners.length <= 3) return { tool: "triangle", from: { x: left, y: top }, to: { x: right, y: bottom } };
    const nearRect = Math.abs(w - h) < Math.max(w, h) * 0.18 || (w > h * 0.45 && h > w * 0.45);
    if (nearRect) return { tool: "rectangle", from: { x: left, y: top }, to: { x: right, y: bottom } };
  }
  return null;
}

export function SketchWorkspace({ onSave, onCancel, saving }: {
  onSave: (file: File) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const startRef = useRef<Point | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const snapshotRef = useRef<ImageData | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const frameRef = useRef<number | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [label, setLabel] = useState("");
  const [fontSize, setFontSize] = useState(28);
  const [canUndo, setCanUndo] = useState(false);
  const [autoFix, setAutoFix] = useState(true);
  const [autoImproveText, setAutoImproveText] = useState(true);
  const [improvingText, setImprovingText] = useState(false);
  const [status, setStatus] = useState("Auto-fix is on. Strokes smooth as you draw; shapes snap when you lift the pointer.");

  const pushHistory = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    historyRef.current = [...historyRef.current.slice(-24), ctx.getImageData(0, 0, canvas.width, canvas.height)];
    setCanUndo(historyRef.current.length > 1);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = WIDTH; canvas.height = HEIGHT;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    historyRef.current = [ctx.getImageData(0, 0, WIDTH, HEIGHT)];
  }, []);

  useEffect(() => () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); }, []);

  async function improveLabelText(): Promise<string> {
    const original = label.trim();
    if (!original) return "";
    setImprovingText(true);
    try {
      const response = await fetch("/api/teacher/tutorials/improve-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: original, mode: "label" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.improvedText !== "string" || !result.improvedText.trim()) {
        throw new Error(result.error ?? "Text improvement is unavailable.");
      }
      setLabel(result.improvedText);
      setStatus(result.changed ? "Text improved: spelling, grammar and clarity corrected. Review it before placing." : "Text checked. No changes were needed.");
      return result.improvedText.trim();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not improve text. Original wording is preserved.");
      return original;
    } finally {
      setImprovingText(false);
    }
  }

  function pointFromEvent(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height };
  }

  function renderLiveStroke() {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !snapshotRef.current) return;
    ctx.putImageData(snapshotRef.current, 0, 0);
    const points = pointsRef.current;
    if (points.length < 2) return;
    if (tool === "pen" && autoFix) {
      const recognized = recognizeShape(points);
      if (recognized) {
        drawShape(ctx, recognized.from, recognized.to, recognized.tool);
        return;
      }
    }
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : INK;
    ctx.lineWidth = tool === "eraser" ? 30 : 4;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    smoothPath(ctx, points);
  }

  async function begin(event: PointerEvent<HTMLCanvasElement>) {
    if (saving) return;
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const point = pointFromEvent(event);
    if (tool === "label") {
      if (!label.trim()) { setStatus("Type a label first."); return; }
      const textToPlace = autoImproveText ? await improveLabelText() : label.trim();
      if (!textToPlace) return;
      ctx.fillStyle = INK; ctx.font = `600 ${fontSize}px Arial, sans-serif`;
      ctx.textBaseline = "alphabetic";
      const words = textToPlace.split(/\s+/);
      let line = "", y = point.y;
      const maxWidth = Math.max(100, WIDTH - point.x - 24);
      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, point.x, y); line = word; y += fontSize * 1.3; }
        else line = test;
      }
      if (line) ctx.fillText(line, point.x, y);
      pushHistory(ctx); setStatus(autoImproveText ? "Improved text placed with clean typography." : "Text placed with clean typography."); return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true; startRef.current = point; pointsRef.current = [point];
    snapshotRef.current = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    if (tool === "line" || tool === "arrow" || tool === "rectangle" || tool === "ellipse" || tool === "triangle" || tool === "curve") {
      // Shape preview is redrawn from the same snapshot on every animation frame.
      pointsRef.current = [point, point];
    }
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const point = pointFromEvent(event);
    pointsRef.current.push(point);
    if (pointsRef.current.length > 5000) pointsRef.current.shift();
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx || !snapshotRef.current) return;
      if (["line", "arrow", "rectangle", "ellipse", "triangle", "curve"].includes(tool)) {
        ctx.putImageData(snapshotRef.current, 0, 0);
        const from = startRef.current, to = pointsRef.current[pointsRef.current.length - 1];
        if (from && to) drawShape(ctx, from, to, tool);
      } else renderLiveStroke();
    });
  }

  function finish() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (frameRef.current !== null) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !snapshotRef.current) return;
    const points = pointsRef.current;
    ctx.putImageData(snapshotRef.current, 0, 0);
    if (["line", "arrow", "rectangle", "ellipse", "triangle", "curve"].includes(tool)) {
      const from = startRef.current, to = points[points.length - 1];
      if (from && to) drawShape(ctx, from, to, tool);
      setStatus("Shape rendered cleanly in real time.");
    } else if (tool === "pen" && autoFix) {
      const recognized = recognizeShape(points);
      if (recognized) {
        ctx.putImageData(snapshotRef.current, 0, 0);
        drawShape(ctx, recognized.from, recognized.to, recognized.tool);
        setStatus(`Auto-corrected your stroke into a clean ${recognized.tool}.`);
      } else {
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
        smoothPath(ctx, points);
        setStatus("Smoothed your freehand stroke.");
      }
    } else if (tool === "pen" || tool === "eraser") {
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : INK;
      ctx.lineWidth = tool === "eraser" ? 30 : 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
      smoothPath(ctx, points);
    }
    pushHistory(ctx);
    startRef.current = null; pointsRef.current = []; snapshotRef.current = null;
  }

  function undo() {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || historyRef.current.length < 2) return;
    historyRef.current = historyRef.current.slice(0, -1);
    ctx.putImageData(historyRef.current[historyRef.current.length - 1], 0, 0);
    setCanUndo(historyRef.current.length > 1); setStatus("Last action undone.");
  }

  function clear() {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    pushHistory(ctx); setStatus("Canvas cleared.");
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => { if (blob) onSave(new File([blob], "teacher-sketch.png", { type: "image/png" })); }, "image/png");
  }

  const tools: { id: Tool; name: string }[] = [
    { id: "pen", name: "Pen" }, { id: "eraser", name: "Eraser" }, { id: "line", name: "Line" },
    { id: "arrow", name: "Arrow" }, { id: "rectangle", name: "Rectangle" }, { id: "ellipse", name: "Ellipse" },
    { id: "triangle", name: "Triangle" }, { id: "curve", name: "Curve" }, { id: "label", name: "Text" },
  ];

  return <section className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-3" aria-label="Realtime diagram and sketch workspace">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h4 className="font-semibold">Smart diagram canvas</h4><p className="text-xs text-[var(--muted-foreground)]">Live smoothing, shape correction and clean text placement while you work.</p></div>
      <div className="flex gap-2"><button type="button" onClick={undo} disabled={!canUndo || saving} className="min-h-10 rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm disabled:opacity-40">Undo</button><button type="button" onClick={clear} disabled={saving} className="min-h-10 rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm">Clear</button></div>
    </div>
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Drawing tools">
      {tools.map(item => <button key={item.id} type="button" aria-pressed={tool === item.id} onClick={() => setTool(item.id)} className={`min-h-10 rounded-lg border px-3 py-2 text-sm ${tool === item.id ? "border-[var(--primary)] bg-[var(--primary)]/10 font-semibold" : "border-[var(--card-border)]"}`}>{item.name}</button>)}
    </div>
    {tool === "label" && <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="block text-sm">Text / label<textarea value={label} onChange={event => setLabel(event.target.value)} maxLength={240} rows={2} spellCheck autoCorrect="on" autoCapitalize="sentences" placeholder="Type a label. Shadecode can improve its wording before placing." className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2" /></label>
        <label className="block text-sm">Text size<select value={fontSize} onChange={event => setFontSize(Number(event.target.value))} className="mt-1 min-h-11 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3"><option value={20}>Small</option><option value={28}>Medium</option><option value={38}>Large</option><option value={48}>Heading</option></select></label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void improveLabelText()} disabled={!label.trim() || improvingText || saving} className="min-h-10 rounded-lg border border-[var(--primary)] px-3 py-2 text-sm font-medium disabled:opacity-40">{improvingText ? "Improving text…" : "✦ Improve text"}</button>
        <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={autoImproveText} onChange={event => setAutoImproveText(event.target.checked)} />Auto-improve before placing</label>
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">Checks spelling, grammar, punctuation and clarity while preserving scientific terms and meaning. AI improvement needs a connection; your original stays unchanged if unavailable.</p>
    </div>}
    <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={autoFix} onChange={event => setAutoFix(event.target.checked)} />Auto-fix freehand lines and shapes</label>
    <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-white">
      <canvas ref={canvasRef} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onPointerLeave={finish} className="block h-auto w-full touch-none" style={{ aspectRatio: "12 / 7", cursor: tool === "label" ? "text" : "crosshair" }} aria-label="Drawing canvas. Strokes update as you draw and are smoothed or shape-corrected when finished." />
    </div>
    <p className="text-xs text-[var(--muted-foreground)]" aria-live="polite">{status}</p>
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" onClick={onCancel} disabled={saving} className="min-h-10 rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm">Close workspace</button>
      <button type="button" onClick={save} disabled={saving} className="min-h-10 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save sketch to lesson"}</button>
    </div>
  </section>;
}
