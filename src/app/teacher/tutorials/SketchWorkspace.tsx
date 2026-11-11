"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

type Tool = "pen" | "eraser" | "line" | "arrow" | "rectangle" | "ellipse" | "label";
type Point = { x: number; y: number };

export function SketchWorkspace({ onSave, onCancel, saving }: {
  onSave: (file: File) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const startRef = useRef<Point | null>(null);
  const previousRef = useRef<Point | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [label, setLabel] = useState("");
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 1200;
    canvas.height = 700;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  }, []);

  function pointFromEvent(event: PointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }

  function drawShape(ctx: CanvasRenderingContext2D, from: Point, to: Point, selected: Tool) {
    ctx.strokeStyle = "#172033";
    ctx.fillStyle = "#172033";
    ctx.lineWidth = 4;
    if (selected === "line" || selected === "arrow") {
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
      if (selected === "arrow") {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const size = 22;
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    } else if (selected === "rectangle") {
      ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
    } else if (selected === "ellipse") {
      ctx.beginPath();
      ctx.ellipse((from.x + to.x) / 2, (from.y + to.y) / 2, Math.abs(to.x - from.x) / 2, Math.abs(to.y - from.y) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function begin(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const point = pointFromEvent(event);
    if (tool === "label") {
      if (!label.trim()) return;
      ctx.fillStyle = "#172033"; ctx.font = "bold 30px Arial"; ctx.fillText(label.trim().slice(0, 100), point.x, point.y);
      pushHistory(ctx); return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true; startRef.current = point; previousRef.current = point;
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (tool === "pen" || tool === "eraser") {
      ctx.beginPath(); ctx.moveTo(point.x, point.y);
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : "#172033";
      ctx.lineWidth = tool === "eraser" ? 28 : 4;
    }
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const from = startRef.current; const previous = previousRef.current;
    if (!canvas || !ctx || !from || !previous) return;
    const point = pointFromEvent(event);
    if (tool === "pen" || tool === "eraser") {
      ctx.lineTo(point.x, point.y); ctx.stroke(); previousRef.current = point; return;
    }
    if (snapshotRef.current) ctx.putImageData(snapshotRef.current, 0, 0);
    drawShape(ctx, from, point, tool);
  }

  function pushHistory(ctx: CanvasRenderingContext2D) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    historyRef.current = [...historyRef.current.slice(-29), ctx.getImageData(0, 0, canvas.width, canvas.height)];
    setCanUndo(historyRef.current.length > 1);
  }

  function finish() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) pushHistory(ctx);
    startRef.current = null; previousRef.current = null; snapshotRef.current = null;
  }

  function undo() {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || historyRef.current.length < 2) return;
    historyRef.current = historyRef.current.slice(0, -1);
    ctx.putImageData(historyRef.current[historyRef.current.length - 1], 0, 0);
    setCanUndo(historyRef.current.length > 1);
  }

  function clear() {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    pushHistory(ctx);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      onSave(new File([blob], "teacher-sketch.png", { type: "image/png" }));
    }, "image/png");
  }

  const tools: { id: Tool; name: string }[] = [
    { id: "pen", name: "Pen" }, { id: "eraser", name: "Eraser" }, { id: "line", name: "Line" },
    { id: "arrow", name: "Arrow" }, { id: "rectangle", name: "Rectangle" }, { id: "ellipse", name: "Ellipse" }, { id: "label", name: "Label" },
  ];

  return <section className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-3" aria-label="Sketch workspace">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h4 className="font-semibold">Diagram & sketch workspace</h4><p className="text-xs text-[var(--muted-foreground)]">Draw scientific diagrams, maths sketches, labelled illustrations and process flows.</p></div>
      <div className="flex gap-2"><button type="button" onClick={undo} disabled={!canUndo} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm disabled:opacity-40">Undo</button><button type="button" onClick={clear} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm">Clear</button></div>
    </div>
    <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Drawing tools">
      {tools.map((item) => <button key={item.id} type="button" aria-pressed={tool === item.id} onClick={() => setTool(item.id)} className={`rounded-lg border px-3 py-2 text-sm ${tool === item.id ? "border-[var(--primary)] bg-[var(--primary)]/10 font-semibold" : "border-[var(--card-border)]"}`}>{item.name}</button>)}
    </div>
    {tool === "label" && <label className="block text-sm">Label text<input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={100} placeholder="Type a label, then click the drawing" className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2" /></label>}
    <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-white">
      <canvas ref={canvasRef} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onPointerLeave={finish} className="block h-auto w-full touch-none" style={{ aspectRatio: "12 / 7", cursor: tool === "label" ? "text" : "crosshair" }} aria-label="Drawing canvas. Use the selected tool to create a diagram." />
    </div>
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" onClick={onCancel} disabled={saving} className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm">Close workspace</button>
      <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save sketch to lesson"}</button>
    </div>
  </section>;
}
