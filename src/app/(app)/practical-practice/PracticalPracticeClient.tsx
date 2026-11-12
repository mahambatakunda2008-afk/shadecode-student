"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Download, Upload, Eye, EyeOff, FlaskConical, RotateCcw, Save, Target } from "lucide-react";
import practiceData from "@/lib/curriculum/practice/biology-9700-practical-practice-2028-2030.json";
import { emitLearningEvent } from "@/lib/intelligence/emitLearningEvent";
import { normalizeLearningContext } from "@/lib/intelligence/learningContextKey";
import { getPracticalQuestionFeedback, getPracticalQuestionSkills } from "@/lib/curriculum/practice/biology-practical-attempt";
import {
  canAttemptPracticalSet,
  ratePracticalSkill,
  restorePracticalAttempt,
  retryPracticalQuestion,
  revealPracticalGuidance,
  savePracticalAnswer,
  selfAwardPracticalMarks,
  startPracticalAttempt,
  summarizePracticalAttempt,
  togglePracticalAnswerPoint,
  type PracticalAttempt,
  type PracticalPracticeSet,
  type PracticeSkillRating,
} from "@/lib/curriculum/practice/biology-practical-attempt";

type Question = { id: string; marks: number; prompt: string; answer: string[]; data?: { columns: string[]; rows: (string | number)[][] } };
type Task = { id: string; paper: "Paper 3" | "Paper 5"; title: string; format: string; skills: string[]; scenario: string; questions: Question[]; markingGuide?: { totalPracticeMarks: number; principle: string } };
type PracticeSet = PracticalPracticeSet & { title: string; subject: string; assessmentNotice: string; tasks: Task[] };

const set = practiceData as PracticeSet;
const STORAGE_KEY = `shadecode:practical-attempt:${set.id}`;

function readAttempt(): PracticalAttempt {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        return restorePracticalAttempt(set, parsed);
      }
    } catch { /* Start clean if local storage is unavailable or malformed. */ }
  }
  return startPracticalAttempt(set);
}

type PracticalGraphData = { columns: string[]; rows: (string | number)[][] };
type PlottedPoint = { x: number; y: number };


type DrawingStroke = { points: { x: number; y: number }[] };

type MeasurementUnit = "mm" | "µm" | "nm";

function MagnificationCalculator() {
  const [imageSize, setImageSize] = useState("");
  const [imageUnit, setImageUnit] = useState<MeasurementUnit>("mm");
  const [actualSize, setActualSize] = useState("");
  const [actualUnit, setActualUnit] = useState<MeasurementUnit>("µm");
  const factors: Record<MeasurementUnit, number> = { mm: 1000, "µm": 1, nm: 0.001 };
  const image = Number(imageSize) * factors[imageUnit];
  const actual = Number(actualSize) * factors[actualUnit];
  const valid = imageSize.trim() !== "" && actualSize.trim() !== "" && Number.isFinite(image) && Number.isFinite(actual) && image > 0 && actual > 0;
  const magnification = valid ? image / actual : null;
  return <section className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 sm:p-4" aria-label="Magnification calculator">
    <h4 className="text-xs font-bold">Measurement tool · magnification</h4>
    <p className="mt-1 text-[11px] leading-5 text-[var(--muted-foreground)]">Enter the measured image size and actual specimen size. The calculator converts both to micrometres before dividing.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-medium">Image size<div className="mt-1 flex gap-2"><input type="number" min="0" step="any" inputMode="decimal" value={imageSize} onChange={(event) => setImageSize(event.target.value)} placeholder="e.g. 36" className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm" /><select value={imageUnit} onChange={(event) => setImageUnit(event.target.value as MeasurementUnit)} className="h-10 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-2 text-sm">{(["mm", "µm", "nm"] as const).map((unit) => <option key={unit}>{unit}</option>)}</select></div></label>
      <label className="text-xs font-medium">Actual size<div className="mt-1 flex gap-2"><input type="number" min="0" step="any" inputMode="decimal" value={actualSize} onChange={(event) => setActualSize(event.target.value)} placeholder="e.g. 120" className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm" /><select value={actualUnit} onChange={(event) => setActualUnit(event.target.value as MeasurementUnit)} className="h-10 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-2 text-sm">{(["mm", "µm", "nm"] as const).map((unit) => <option key={unit}>{unit}</option>)}</select></div></label>
    </div>
    <div className="mt-3 rounded-lg bg-[var(--surface)] p-3" aria-live="polite"><p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Magnification = image size ÷ actual size</p>{magnification !== null ? <><p className="mt-1 text-2xl font-bold tabular-nums text-[var(--primary)]">×{Number(magnification.toPrecision(6)).toLocaleString()}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{image.toLocaleString()} µm ÷ {actual.toLocaleString()} µm. Magnification has no units.</p></> : <p className="mt-1 text-xs text-[var(--muted-foreground)]">Enter two positive measurements to calculate.</p>}</div>
  </section>;
}

function PracticalDrawingPad({ storageKey }: { storageKey: string }) {
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [current, setCurrent] = useState<DrawingStroke | null>(null);
  const [keyboardPoint, setKeyboardPoint] = useState({ x: 300, y: 180 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as DrawingStroke[];
        if (Array.isArray(parsed)) {
          const safeStrokes = parsed.slice(-500).filter((stroke) =>
            stroke && Array.isArray(stroke.points) && stroke.points.length > 0 &&
            stroke.points.length <= 5000 &&
            stroke.points.every((point) => point && typeof point === "object" &&
              Number.isFinite(point.x) && Number.isFinite(point.y) &&
              point.x >= 0 && point.x <= 600 && point.y >= 0 && point.y <= 360),
          );
          setStrokes(safeStrokes);
        }
      }
    } catch { /* Keep the drawing pad available if a saved sketch is damaged. */ }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    // Persist an in-progress stroke too, so an interrupted pointer session loses
    // at most the short debounce window rather than the entire unfinished line.
    const persist = () => {
      try {
        const recoverable = [...strokes, ...(current?.points.length ? [current] : [])].slice(-500);
        window.localStorage.setItem(storageKey, JSON.stringify(recoverable));
      } catch { /* Drawing remains usable when storage is full or disabled. */ }
    };
    const timeout = window.setTimeout(persist, 250);
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("pagehide", persist);
    window.addEventListener("shadecode:flush-practical-workspaces", persist);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("shadecode:flush-practical-workspaces", persist);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [current, ready, storageKey, strokes]);

  const locate = (event: import("react").PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = ((event.clientX - rect.left) / rect.width) * 600;
    const rawY = ((event.clientY - rect.top) / rect.height) * 360;
    // Keep every stroke inside the microscope field, even when a pointer drifts beyond its edge.
    const dx = rawX - 300;
    const dy = rawY - 180;
    const distance = Math.hypot(dx, dy);
    const radius = 148;
    const scale = distance > radius ? radius / distance : 1;
    return { x: 300 + dx * scale, y: 180 + dy * scale };
  };
  const begin = (event: import("react").PointerEvent<SVGSVGElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setCurrent({ points: [locate(event)] });
  };
  const draw = (event: import("react").PointerEvent<SVGSVGElement>) => {
    if (!current) return;
    const point = locate(event);
    setCurrent((stroke) => stroke ? { points: [...stroke.points.slice(-4999), point] } : stroke);
  };
  const finish = () => {
    if (current?.points.length) setStrokes((saved) => [...saved, current].slice(-500));
    setCurrent(null);
  };
  const handleDrawingKey = (event: import("react").KeyboardEvent<SVGSVGElement>) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Enter") {
      setStrokes((saved) => [...saved, { points: [keyboardPoint] }].slice(-500));
      return;
    }
    const step = event.shiftKey ? 15 : 5;
    const next = {
      x: keyboardPoint.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
      y: keyboardPoint.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0),
    };
    const dx = next.x - 300, dy = next.y - 180, distance = Math.hypot(dx, dy), radius = 148;
    const scale = distance > radius ? radius / distance : 1;
    setKeyboardPoint({ x: 300 + dx * scale, y: 180 + dy * scale });
  };
  const renderStroke = (stroke: DrawingStroke, index: number) => stroke.points.length === 1
    ? <circle key={index} cx={stroke.points[0].x} cy={stroke.points[0].y} r="1.8" fill="currentColor" />
    : <polyline key={index} points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;

  return <section className="mt-5 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 sm:p-4" aria-label="Biological drawing workspace">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-xs font-bold">Biological drawing workspace</h4><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Practise a large, clear specimen drawing. Draw with a finger, stylus or mouse.</p></div><div className="flex gap-2"><button type="button" disabled={!strokes.length} onClick={() => setStrokes((saved) => saved.slice(0, -1))} className="min-h-9 rounded-lg border border-[var(--card-border)] px-3 text-xs font-semibold disabled:opacity-40">Undo</button><button type="button" onClick={() => { setStrokes([]); setCurrent(null); }} className="min-h-9 rounded-lg border border-[var(--card-border)] px-3 text-xs font-semibold">Clear</button></div></div>
    <div className="mt-3 overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--surface)]"><svg viewBox="0 0 600 360" role="img" aria-label="Specimen drawing field. Use a pointer to draw freehand, or focus this field and use arrow keys to move the cursor and Enter to place individual marks. Hold Shift with an arrow key for larger steps." tabIndex={0} onKeyDown={handleDrawingKey} onPointerDown={begin} onPointerMove={draw} onPointerUp={finish} onPointerCancel={finish} className="block w-full touch-none cursor-crosshair text-[var(--foreground)] focus:outline focus:outline-2 focus:outline-[var(--primary)]"><rect width="600" height="360" fill="var(--surface)" /><circle cx="300" cy="180" r="150" fill="var(--background)" stroke="currentColor" strokeWidth="1.5" opacity=".9" />{strokes.map(renderStroke)}{current && renderStroke(current, -1)}<g aria-hidden="true" pointerEvents="none"><circle cx={keyboardPoint.x} cy={keyboardPoint.y} r="5" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="2 2" /></g></svg></div>
    <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-[var(--muted-foreground)]"><span>{strokes.length} stroke{strokes.length === 1 ? "" : "s"} · {ready ? "Saved on this device" : "Loading sketch…"}</span><span>Use single, clear lines. Add labels in your written answer.</span></div>
    <p className="mt-2 text-[11px] leading-5 text-[var(--muted-foreground)]">Keyboard drawing: focus the specimen field, move the cursor with the arrow keys, press Enter to place a mark, and hold Shift for larger movements. Pointer, touch and stylus drawing remain available.</p>
    <p className="mt-2 text-[11px] leading-5 text-[var(--muted-foreground)]">Practical drawing checklist: draw only what is observed, use unbroken pencil-style outlines, keep cells large and in proportion, avoid shading, and use straight ruled label lines that do not cross.</p>
  </section>;
}

function PracticalGraphPlotter({ data, storageKey }: { data: PracticalGraphData; storageKey: string }) {
  const numericColumns = useMemo(() => data.columns.map((label, index) => ({ label, index, values: data.rows.map((row) => Number(row[index])) })).filter((column) => column.values.length > 1 && column.values.every(Number.isFinite)), [data]);
  const [xIndex, setXIndex] = useState(numericColumns[0]?.index ?? 0);
  const defaultYIndex = numericColumns.find((column) => column.index !== numericColumns[0]?.index && /mean|relative rate|rate|yield|percentage/i.test(column.label))?.index ?? numericColumns[1]?.index ?? numericColumns[0]?.index ?? 0;
  const [yIndex, setYIndex] = useState(defaultYIndex);
  const [points, setPoints] = useState<PlottedPoint[]>([]);
  const [showBestFit, setShowBestFit] = useState(false);
  const [coordinateX, setCoordinateX] = useState("");
  const [coordinateY, setCoordinateY] = useState("");
  const [ready, setReady] = useState(false);
  const plot = { left: 58, top: 18, width: 540, height: 270 };
  const clipId = `practical-graph-${storageKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const values = (index: number) => data.rows.map((row) => Number(row[index])).filter(Number.isFinite);
  const bounds = (items: number[]) => { const min = Math.min(...items), max = Math.max(...items), span = max - min || 1; return { min: Math.min(0, min), max: max + span * 0.08 }; };
  const xb = bounds(values(xIndex)), yb = bounds(values(yIndex));
  const sx = (value: number) => plot.left + ((value - xb.min) / (xb.max - xb.min)) * plot.width;
  const sy = (value: number) => plot.top + plot.height - ((value - yb.min) / (yb.max - yb.min)) * plot.height;

  const regressionLine = useMemo(() => {
    if (points.length < 2) return null;
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    if (!denominator) return null;
    const slope = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / denominator;
    const intercept = meanY - slope * meanX;
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    return { x1: minX, y1: slope * minX + intercept, x2: maxX, y2: slope * maxX + intercept };
  }, [points]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { xIndex?: number; yIndex?: number; points?: PlottedPoint[]; coordinateX?: string; coordinateY?: string; showBestFit?: boolean };
        const validIndex = (index: number | undefined) => numericColumns.some((column) => column.index === index);
        const savedXIndex = validIndex(parsed.xIndex) ? parsed.xIndex! : numericColumns[0]?.index;
        const savedYIndex = validIndex(parsed.yIndex) && parsed.yIndex !== savedXIndex
          ? parsed.yIndex!
          : numericColumns.find((column) => column.index !== savedXIndex)?.index;
        const axisBounds = (index: number | undefined) => {
          const axisValues = index === undefined ? [] : data.rows.map((row) => Number(row[index])).filter(Number.isFinite);
          const min = Math.min(...axisValues);
          const max = Math.max(...axisValues);
          const span = max - min || 1;
          return { min: Math.min(0, min), max: max + span * 0.08 };
        };
        const savedXBounds = axisBounds(savedXIndex);
        const savedYBounds = axisBounds(savedYIndex);
        if (savedXIndex !== undefined) setXIndex(savedXIndex);
        if (savedYIndex !== undefined) setYIndex(savedYIndex);
        if (typeof parsed.coordinateX === "string" && parsed.coordinateX.length <= 32) setCoordinateX(parsed.coordinateX);
        if (typeof parsed.coordinateY === "string" && parsed.coordinateY.length <= 32) setCoordinateY(parsed.coordinateY);
        if (parsed.showBestFit === true) setShowBestFit(true);
        if (Array.isArray(parsed.points)) {
          const safePoints = parsed.points.slice(-500).filter((point) =>
            point && typeof point === "object" && !Array.isArray(point) &&
            Number.isFinite(point.x) && Number.isFinite(point.y) &&
            point.x >= savedXBounds.min && point.x <= savedXBounds.max &&
            point.y >= savedYBounds.min && point.y <= savedYBounds.max,
          );
          setPoints(safePoints);
        }
      }
    } catch { /* A damaged graph draft must not block the practical attempt. */ }
    setReady(true);
  }, [numericColumns, storageKey]);

  useEffect(() => {
    if (!ready) return;
    // Keep partial coordinate entry and graph display settings with the plotted data.
    const persist = () => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({
          xIndex, yIndex, points: points.slice(-500), coordinateX: coordinateX.slice(0, 32),
          coordinateY: coordinateY.slice(0, 32), showBestFit,
        }));
      } catch { /* Graphing remains usable without persistence. */ }
    };
    const timeout = window.setTimeout(persist, 250);
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("pagehide", persist);
    window.addEventListener("shadecode:flush-practical-workspaces", persist);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("shadecode:flush-practical-workspaces", persist);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [coordinateX, coordinateY, points, ready, showBestFit, storageKey, xIndex, yIndex]);

  if (numericColumns.length < 2) return null;
  const addCoordinatePoint = (event: import("react").FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const x = Number(coordinateX), y = Number(coordinateY);
    if (!coordinateX.trim() || !coordinateY.trim() || !Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < xb.min || x > xb.max || y < yb.min || y > yb.max) return;
    setPoints((current) => [...current, { x: Number(x.toPrecision(5)), y: Number(y.toPrecision(5)) }].slice(-500));
    setCoordinateX("");
    setCoordinateY("");
  };

  const addPoint = (event: import("react").MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * 640, py = ((event.clientY - rect.top) / rect.height) * 330;
    if (px < plot.left || px > plot.left + plot.width || py < plot.top || py > plot.top + plot.height) return;
    const x = xb.min + ((px - plot.left) / plot.width) * (xb.max - xb.min);
    const y = yb.min + ((plot.top + plot.height - py) / plot.height) * (yb.max - yb.min);
    setPoints((current) => [...current, { x: Number(x.toPrecision(5)), y: Number(y.toPrecision(5)) }].slice(-500));
  };

  return <section className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 sm:p-4" aria-label="Interactive graph plotting workspace">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-xs font-bold">Graph plotting workspace</h4><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Choose axes, then tap or click inside the grid to plot points. Your work is saved on this device.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={!points.length} onClick={() => setPoints((saved) => saved.slice(0, -1))} className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Undo point</button><button type="button" disabled={!regressionLine} aria-pressed={showBestFit} onClick={() => setShowBestFit((value) => !value)} className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40">{showBestFit ? "Hide best-fit line" : "Show best-fit line"}</button><button type="button" onClick={() => { setPoints([]); setShowBestFit(false); }} className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-semibold">Clear graph</button></div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs text-[var(--muted-foreground)]">X-axis<select value={xIndex} onChange={(event) => { setXIndex(Number(event.target.value)); setPoints([]); setShowBestFit(false); setCoordinateX(""); setCoordinateY(""); }} className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-2 text-sm text-[var(--foreground)]">{numericColumns.map((column) => <option key={column.index} value={column.index} disabled={column.index === yIndex}>{column.label}</option>)}</select></label><label className="text-xs text-[var(--muted-foreground)]">Y-axis<select value={yIndex} onChange={(event) => { setYIndex(Number(event.target.value)); setPoints([]); setShowBestFit(false); setCoordinateX(""); setCoordinateY(""); }} className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-2 text-sm text-[var(--foreground)]">{numericColumns.map((column) => <option key={column.index} value={column.index} disabled={column.index === xIndex}>{column.label}</option>)}</select></label></div>
    <form onSubmit={addCoordinatePoint} className="mt-3 grid gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" aria-label="Add a graph point by coordinates"><label className="text-xs font-medium">X coordinate<input aria-label="X coordinate" type="number" inputMode="decimal" step="any" min={xb.min} max={xb.max} required value={coordinateX} onChange={(event) => setCoordinateX(event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 text-sm" /></label><label className="text-xs font-medium">Y coordinate<input aria-label="Y coordinate" type="number" inputMode="decimal" step="any" min={yb.min} max={yb.max} required value={coordinateY} onChange={(event) => setCoordinateY(event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 text-sm" /></label><button type="submit" disabled={!coordinateX.trim() || !coordinateY.trim() || !Number.isFinite(Number(coordinateX)) || !Number.isFinite(Number(coordinateY)) || Number(coordinateX) < xb.min || Number(coordinateX) > xb.max || Number(coordinateY) < yb.min || Number(coordinateY) > yb.max} className="min-h-10 rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-white disabled:opacity-40">Add point</button><p className="text-[11px] text-[var(--muted-foreground)] sm:col-span-3">Keyboard-accessible alternative: enter the values directly. X range {Number(xb.min.toPrecision(4))} to {Number(xb.max.toPrecision(4))}; Y range {Number(yb.min.toPrecision(4))} to {Number(yb.max.toPrecision(4))}.</p></form>
    <div className="mt-3 overflow-hidden rounded-lg border border-[var(--card-border)]"><svg viewBox="0 0 640 330" role="img" aria-label="Graph grid. Click inside the grid to add a plotted point, or use the coordinate fields." onClick={addPoint} className="block w-full touch-manipulation cursor-crosshair bg-[var(--surface)]"><defs><clipPath id={clipId}><rect x={plot.left} y={plot.top} width={plot.width} height={plot.height} /></clipPath></defs>{Array.from({ length: 11 }, (_, index) => <g key={index}><line x1={plot.left + index * plot.width / 10} y1={plot.top} x2={plot.left + index * plot.width / 10} y2={plot.top + plot.height} stroke="currentColor" opacity=".14"/><line x1={plot.left} y1={plot.top + index * plot.height / 10} x2={plot.left + plot.width} y2={plot.top + index * plot.height / 10} stroke="currentColor" opacity=".14"/></g>)}<g>{Array.from({ length: 6 }, (_, index) => { const fraction = index / 5; const xValue = xb.min + fraction * (xb.max - xb.min); const yValue = yb.min + fraction * (yb.max - yb.min); return <g key={index}><text x={plot.left + fraction * plot.width} y={plot.top + plot.height + 16} textAnchor="middle" fontSize="10" fill="currentColor">{Number(xValue.toPrecision(3))}</text><text x={plot.left - 8} y={plot.top + plot.height - fraction * plot.height + 3} textAnchor="end" fontSize="10" fill="currentColor">{Number(yValue.toPrecision(3))}</text></g>; })}</g><path d={`M${plot.left} ${plot.top} V${plot.top + plot.height} H${plot.left + plot.width}`} fill="none" stroke="currentColor" strokeWidth="2"/><text x="328" y="321" textAnchor="middle" fontSize="12" fill="currentColor">{data.columns[xIndex]}</text><text x="15" y="153" textAnchor="middle" fontSize="12" fill="currentColor" transform="rotate(-90 15 153)">{data.columns[yIndex]}</text><g clipPath={`url(#${clipId})`}>{showBestFit && regressionLine && <line x1={sx(regressionLine.x1)} y1={sy(regressionLine.y1)} x2={sx(regressionLine.x2)} y2={sy(regressionLine.y2)} stroke="var(--primary)" strokeWidth="2.5" strokeDasharray="7 4" pointerEvents="none" />}{points.map((point, index) => <circle key={index} cx={sx(point.x)} cy={sy(point.y)} r="5" fill="var(--primary)" stroke="var(--background)" strokeWidth="1.5"><title>{`Point ${index + 1}: (${point.x}, ${point.y})`}</title></circle>)}</g></svg></div>
    <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-[var(--muted-foreground)]"><span>{points.length} point{points.length === 1 ? "" : "s"} plotted</span><span>Check the calculated trend line against the data, then justify your final line of best fit.</span></div>
  </section>;
}

export default function PracticalPracticeClient() {
  const [attempt, setAttempt] = useState<PracticalAttempt>(() => startPracticalAttempt(set));
  const [ready, setReady] = useState(false);
  const [activeTask, setActiveTask] = useState(set.tasks[0]?.id ?? "");
  const [showReview, setShowReview] = useState(false);
  const [storageStatus, setStorageStatus] = useState<"saving" | "saved" | "unavailable">("saving");
  const [backupMessage, setBackupMessage] = useState("");
  const [otherTabAttempt, setOtherTabAttempt] = useState<PracticalAttempt | null>(null);
  const [workspaceRevision, setWorkspaceRevision] = useState(0);

  useEffect(() => {
    setAttempt(readAttempt());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      try {
        const incoming = restorePracticalAttempt(set, JSON.parse(event.newValue));
        if (JSON.stringify(incoming) === JSON.stringify(attempt)) return;
        setOtherTabAttempt(incoming);
      } catch { /* Ignore malformed updates from another tab. */ }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [attempt, ready]);

  useEffect(() => {
    if (!ready || otherTabAttempt) return;
    setStorageStatus("saving");
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
      setStorageStatus("saved");
    } catch {
      setStorageStatus("unavailable");
    }
  }, [attempt, otherTabAttempt, ready]);

  const summary = useMemo(() => summarizePracticalAttempt(set, attempt), [attempt]);
  const task = set.tasks.find((item) => item.id === activeTask) ?? set.tasks[0];

  const updateAnswer = (taskId: string, questionId: string, value: string) => {
    setAttempt((current) => savePracticalAnswer(set, current, taskId, questionId, value));
  };
  const updateRating = (taskId: string, skill: string, rating: PracticeSkillRating) => {
    setAttempt((current) => ratePracticalSkill(set, current, taskId, skill, rating));
  };
  const revealQuestionGuidance = (task: Task, question: Question) => {
    const key = task.id + "::" + question.id;
    const answer = attempt.answers[key]?.trim() ?? "";
    if (answer) {
      let reviewSessionId: string | undefined;
      try {
        const raw = window.sessionStorage.getItem("shadecode:cortex:active-review:v1");
        if (raw) {
          const review = JSON.parse(raw) as { reviewSessionId?: unknown; subjectKey?: unknown; topicId?: unknown };
          const context = normalizeLearningContext(set.subject, task.title);
          if (
            typeof review.reviewSessionId === "string" &&
            review.reviewSessionId.length > 0 &&
            review.reviewSessionId.length <= 100 &&
            review.subjectKey === context.subjectId &&
            review.topicId === context.topicId
          ) reviewSessionId = review.reviewSessionId;
        }
      } catch { /* Practical work remains available if session storage is unavailable. */ }

      const eventContext = normalizeLearningContext(set.subject, task.title);
      const reviewMetadata = reviewSessionId ? { reviewSessionId, reviewSource: "cortex_suggestion" } : {};
      void emitLearningEvent({
        source: "biology-practical",
        sourceEventId: "practical-question:" + set.id + ":" + attempt.startedAt + ":" + task.id + ":" + question.id,
        type: "question.attempted",
        ...eventContext,
        entityId: question.id,
        attemptId: attempt.startedAt,
        metadata: {
          practiceMode: "self_assessed_practical",
          selfAssessment: true,
          paper: task.paper,
          answerLength: answer.length,
          ...reviewMetadata,
        },
      });

      const allTaskQuestionsReviewed = task.questions.every((item) => {
        const itemKey = task.id + "::" + item.id;
        return item.id === question.id || (
          Boolean(attempt.answers[itemKey]?.trim()) &&
          attempt.revealedAnswers.includes(itemKey)
        );
      });
      if (allTaskQuestionsReviewed) {
        void emitLearningEvent({
          source: "biology-practical",
          sourceEventId: "practical-task-complete:" + set.id + ":" + attempt.startedAt + ":" + task.id,
          type: "activity.completed",
          ...eventContext,
          entityId: task.id,
          attemptId: attempt.startedAt,
          metadata: {
            practiceMode: "self_assessed_practical",
            selfAssessment: true,
            paper: task.paper,
            questionCount: task.questions.length,
            ...reviewMetadata,
          },
        });
        if (reviewSessionId) {
          try { window.sessionStorage.removeItem("shadecode:cortex:active-review:v1"); } catch {}
        }
      }
    }
    setAttempt((current) => revealPracticalGuidance(set, current, task.id, question.id));
  };
  const openRecommendation = (taskId: string, questionId: string) => {
    setActiveTask(taskId);
    setShowReview(false);
    // Wait for the selected task's question list to render before scrolling.
    window.setTimeout(() => {
      document.getElementById(`practical-question-${taskId}-${questionId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const downloadBackup = () => {
    // Flush debounced drawing and graph state before collecting device-local drafts.
    window.dispatchEvent(new Event("shadecode:flush-practical-workspaces"));
    const workspaces: Record<string, string> = {};
    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key && (key.startsWith(`shadecode:practical-drawing:${set.id}:`) || key.startsWith(`shadecode:practical-graph:${set.id}:`))) {
          const value = window.localStorage.getItem(key);
          if (value !== null) workspaces[key] = value;
        }
      }
    } catch { /* The attempt itself can still be exported when workspace storage is inaccessible. */ }
    const backup = {
      format: "shadecode-biology-practical-attempt",
      version: 1,
      exportedAt: new Date().toISOString(),
      practiceSetId: set.id,
      attempt,
      workspaces,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shadecode-biology-practical-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const restoreBackup = async (event: import("react").ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setBackupMessage("This backup is larger than 10 MB. Choose a smaller backup file.");
      return;
    }

    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("The selected file is not a valid backup.");
      const backup = parsed as Record<string, unknown>;
      if (backup.format !== "shadecode-biology-practical-attempt" || backup.version !== 1 || backup.practiceSetId !== set.id) {
        throw new Error("This backup does not match this Biology practical practice set.");
      }
      const rawAttempt = backup.attempt;
      if (!rawAttempt || typeof rawAttempt !== "object" || Array.isArray(rawAttempt) ||
        (rawAttempt as Record<string, unknown>).practiceSetId !== set.id) {
        throw new Error("The backup does not contain a valid attempt.");
      }

      // Use the same recovery/sanitisation path as automatic restore. A damaged
      // timestamp must not make otherwise recoverable student answers unusable.
      const restored = restorePracticalAttempt(set, rawAttempt);
      const workspaces: [string, string][] = [];
      if (backup.workspaces !== undefined) {
        if (!backup.workspaces || typeof backup.workspaces !== "object" || Array.isArray(backup.workspaces)) {
          throw new Error("The backup workspace data is invalid.");
        }
        for (const [key, value] of Object.entries(backup.workspaces as Record<string, unknown>)) {
          const drawingPrefix = `shadecode:practical-drawing:${set.id}:`;
          const graphPrefix = `shadecode:practical-graph:${set.id}:`;
          if ((!key.startsWith(drawingPrefix) && !key.startsWith(graphPrefix)) || typeof value !== "string" || value.length > 2 * 1024 * 1024) {
            throw new Error("The backup contains unsupported workspace data.");
          }
          JSON.parse(value);
          workspaces.push([key, value]);
        }
      }

      const keys = [STORAGE_KEY, ...workspaces.map(([key]) => key)];
      const previous = new Map(keys.map((key) => [key, window.localStorage.getItem(key)]));
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
        for (const [key, value] of workspaces) window.localStorage.setItem(key, value);
      } catch (error) {
        let rollbackComplete = true;
        // Reverse the write order so the attempt pointer is restored last.
        for (const [key, value] of [...previous.entries()].reverse()) {
          try {
            if (value === null) window.localStorage.removeItem(key);
            else window.localStorage.setItem(key, value);
          } catch { rollbackComplete = false; }
        }
        if (!rollbackComplete) {
          throw new Error("Restore failed and device storage prevented a complete rollback. Do not close this page; download any remaining work if possible.");
        }
        throw error;
      }
      setAttempt(restored);
      // Remount workspace editors so they read the restored drawing and graph drafts.
      setWorkspaceRevision((revision) => revision + 1);
      // A successful explicit restore resolves any pending cross-tab conflict.
      // Otherwise the conflict guard would keep autosave paused after the restore.
      setOtherTabAttempt(null);
      setBackupMessage(`Backup restored. ${Object.keys(restored.answers).length} answers and ${workspaces.length} workspace drafts recovered.`);
      setStorageStatus("saved");
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : "Could not restore this backup. Your current attempt has not been replaced.");
    }
  };

  const reset = () => {
    if (!window.confirm("Clear this practical practice attempt and its drawings and graphs from this device?")) return;
    setAttempt(startPracticalAttempt(set));
    setShowReview(false);
    setOtherTabAttempt(null);
    // A reset must clear the whole local practice workspace, not leave old
    // specimen sketches or plotted points attached to a fresh attempt.
    try {
      const prefixes = [
        `shadecode:practical-drawing:${set.id}:`,
        `shadecode:practical-graph:${set.id}:`,
      ];
      const workspaceKeys: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key && prefixes.some((prefix) => key.startsWith(prefix))) workspaceKeys.push(key);
      }
      workspaceKeys.forEach((key) => window.localStorage.removeItem(key));
      setWorkspaceRevision((revision) => revision + 1);
      setBackupMessage(`Attempt reset. ${workspaceKeys.length} drawing and graph drafts cleared from this device.`);
    } catch {
      setBackupMessage("The attempt was reset, but device storage prevented all drawing and graph drafts from being cleared. Review the workspaces before starting again.");
      setWorkspaceRevision((revision) => revision + 1);
    }
  };

  if (!canAttemptPracticalSet(set)) {
    return <div className="min-h-[70vh] bg-[var(--background)] p-6 text-[var(--foreground)]"><div className="mx-auto max-w-2xl rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-6"><h1 className="text-xl font-bold">Practice set unavailable</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">This material has not been cleared for learner access.</p></div></div>;
  }

  if (!task) return null;

  return (
    <div className="min-h-full bg-[var(--background)] px-4 py-6 pb-24 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${storageStatus === "unavailable" ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-[var(--card-border)] bg-[var(--surface)] text-[var(--muted-foreground)]"}`}>
          <div role="status" aria-live="polite" className="flex min-w-0 flex-1 items-center gap-2">
            <Save size={14} aria-hidden="true" />
            {storageStatus === "saving" ? "Saving your practical attempt…" : storageStatus === "saved" ? "Attempt saved on this device." : "Device storage is unavailable or full. Your current work remains open, but changes may not survive closing this page. Download a backup before leaving."}
          </div>
          <button type="button" onClick={downloadBackup} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 font-semibold text-[var(--foreground)] hover:border-[var(--primary)]"><Download size={14} aria-hidden="true" /> Download backup</button>
          <input id="practical-backup-file" type="file" accept="application/json,.json" onChange={restoreBackup} className="sr-only" />
          <button type="button" onClick={() => document.getElementById("practical-backup-file")?.click()} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 font-semibold text-[var(--foreground)] hover:border-[var(--primary)]"><Upload size={14} aria-hidden="true" /> Restore backup</button>
        </div>
        {backupMessage && <p role="status" aria-live="polite" className="rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted-foreground)]">{backupMessage}</p>}
        {otherTabAttempt && <section role="alert" className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
          <h2 className="font-bold">This practical attempt changed in another tab</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Saving is paused so this tab does not overwrite the other tab’s work. Choose which version to keep. Download a backup first if you need both.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => { setAttempt(otherTabAttempt); setOtherTabAttempt(null); setBackupMessage("Loaded the version saved by the other tab."); }} className="min-h-9 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white">Load other tab’s version</button>
            <button type="button" onClick={() => { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt)); setStorageStatus("saved"); setBackupMessage("Kept this tab’s version. It is now saved on this device."); } catch { setStorageStatus("unavailable"); setBackupMessage("Could not save this tab’s version. Download a backup before leaving."); } setOtherTabAttempt(null); }} className="min-h-9 rounded-lg border border-[var(--card-border)] px-3 text-xs font-semibold">Keep this tab’s version</button>
          </div>
        </section>}
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]"><FlaskConical size={16} /> Practical skills studio</div>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Biology practical practice</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">Work through original Cambridge 9700-style practical tasks. Write your own answers, reveal the self-check points when ready, then review the skills you need to strengthen.</p></div>
            <button type="button" onClick={reset} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[var(--card-border)] px-3 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface)] sm:self-auto"><RotateCcw size={16} /> Reset attempt</button>
          </div>
          <p className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 text-xs leading-5 text-[var(--muted-foreground)]">{set.assessmentNotice} Your answers are saved on this device only.</p>
        </header>

        <section className="grid gap-3 sm:grid-cols-4" aria-label="Attempt progress">
          {[
            { label: "Questions answered", value: `${summary.answeredQuestions}/${summary.totalQuestions}`, icon: BookOpenCheck },
            { label: "Guidance revealed", value: String(summary.revealedQuestions), icon: Eye },
            { label: "Self-check marks", value: `${summary.selfAwardedMarks}/${summary.availableMarks}`, icon: Target },
            { label: "Skills to revisit", value: String(summary.skillsToRevisit.length), icon: ClipboardList },
          ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]"><Icon size={15} />{label}</div><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p></div>)}
        </section>

        <section className="grid gap-3 sm:grid-cols-2" aria-label="Paper coverage">
          {(["Paper 3", "Paper 5"] as const).map((paper) => {
            const coverage = summary.paperCoverage[paper];
            const percentage = coverage.questionCount ? Math.round((coverage.answeredQuestions / coverage.questionCount) * 100) : 0;
            return <div key={paper} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold">{paper} coverage</h2><span className="text-xs font-semibold tabular-nums text-[var(--muted-foreground)]">{percentage}% answered</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${percentage}%` }} /></div>
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[var(--muted-foreground)]"><span>{coverage.answeredQuestions}/{coverage.questionCount} questions</span><span>{coverage.taskCount} tasks</span><span>{coverage.selfAwardedMarks}/{coverage.availableMarks} self-awarded</span></div>
            </div>;
          })}
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-2">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Practice tasks</h2>
            {set.tasks.map((item, index) => {
              const isActive = item.id === task.id;
              const answered = item.questions.filter((q) => Boolean(attempt.answers[`${item.id}::${q.id}`]?.trim())).length;
              return <button key={item.id} type="button" onClick={() => setActiveTask(item.id)} aria-current={isActive ? "step" : undefined} className={`w-full rounded-2xl border p-4 text-left transition ${isActive ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)] bg-[var(--surface)] hover:border-[var(--primary)]/50"}`}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)]">{item.paper} · Task {index + 1}</span>
                <span className="mt-1 block text-sm font-semibold">{item.title}</span>
                <span className="mt-2 block text-xs text-[var(--muted-foreground)]">{answered}/{item.questions.length} answered</span>
              </button>;
            })}
            <button type="button" onClick={() => setShowReview((value) => !value)} className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 text-sm font-semibold"><span className="flex items-center gap-2"><Target size={16} /> Skill review</span>{showReview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
          </aside>

          <section className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[var(--primary-glow)] px-3 py-1 text-[11px] font-bold text-[var(--primary)]">{task.paper}</span><span className="text-xs text-[var(--muted-foreground)]">{task.format}</span></div>
              <h2 className="mt-3 text-xl font-bold">{task.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{task.scenario}</p>
              {task.id === "P3-01" && <figure className="mt-5 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 sm:p-4">
                <figcaption className="mb-3 text-xs font-semibold">Catalase and temperature · oxygen collection apparatus schematic</figcaption>
                <svg viewBox="0 0 640 330" role="img" aria-label="Conical flask containing catalase and hydrogen peroxide in a thermostatically controlled water bath, connected by an airtight delivery tube to a gas syringe held horizontally" className="mx-auto block w-full max-w-2xl">
                  <rect x="70" y="170" width="330" height="112" rx="10" fill="var(--primary)" opacity=".08" stroke="currentColor" strokeWidth="2" />
                  <path d="M78 205 Q110 197 145 205 T215 205 T285 205 T392 205" fill="none" stroke="var(--primary)" strokeWidth="2" strokeDasharray="6 4" />
                  <text x="235" y="300" textAnchor="middle" fontSize="12" fill="currentColor">Water bath at set temperature</text>
                  <path d="M190 112 H245 L257 145 L285 235 Q290 252 274 252 H161 Q145 252 151 235 L179 145 Z" fill="var(--surface-2)" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M162 218 Q190 210 218 218 T275 218 L284 241 H153 Z" fill="var(--primary)" opacity=".3" />
                  <rect x="188" y="102" width="58" height="13" rx="3" fill="var(--surface-2)" stroke="currentColor" strokeWidth="2" />
                  <path d="M216 102 V82 H355 V115 H430" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M430 115 V126" stroke="currentColor" strokeWidth="4" />
                  <rect x="430" y="91" width="160" height="54" rx="7" fill="var(--surface-2)" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="446" y="100" width="112" height="36" rx="3" fill="var(--primary)" opacity=".13" />
                  <path d="M558 96 V140 M558 118 H606" stroke="currentColor" strokeWidth="3" />
                  <path d="M606 105 V131" stroke="currentColor" strokeWidth="2" />
                  <text x="510" y="78" textAnchor="middle" fontSize="12" fill="currentColor">Gas syringe</text>
                  <path d="M216 102 L150 62 H60" fill="none" stroke="currentColor" strokeWidth="1.3" />
                  <text x="58" y="56" fontSize="12" fill="currentColor">Airtight bung</text>
                  <path d="M360 115 L360 55 H430" fill="none" stroke="currentColor" strokeWidth="1.3" />
                  <text x="435" y="51" fontSize="12" fill="currentColor">Delivery tube</text>
                  <path d="M210 190 L120 155 H45" fill="none" stroke="currentColor" strokeWidth="1.3" />
                  <text x="45" y="149" fontSize="12" fill="currentColor">Reaction mixture</text>
                  <text x="218" y="270" textAnchor="middle" fontSize="11" fill="currentColor">Conical flask</text>
                </svg>
                <p className="mt-2 text-[11px] leading-5 text-[var(--muted-foreground)]">Conceptual setup. Equilibrate both solutions in the water bath before mixing, keep the reaction time fixed at 60 s, and check every connection for gas leaks. The drawing is not to scale.</p>
              </figure>}
              {task.id === "P3-03" && <figure className="mt-5 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 sm:p-4">
                <figcaption className="mb-3 text-xs font-semibold">Osmosis investigation · potato cylinders in sucrose solutions</figcaption>
                <svg viewBox="0 0 640 300" role="img" aria-label="Six labelled test tubes containing increasing sucrose concentrations and equal-sized potato cylinders immersed in solution, with a balance for measuring mass" className="mx-auto block w-full max-w-2xl">
                  {Array.from({length:6},(_,i)=>{
                    const x=45+i*96, level=175, concentration=(i*0.2).toFixed(1);
                    return <g key={i}>
                      <path d={`M${x} 54 V${level} Q${x} 190 ${x+23} 190 Q${x+46} 190 ${x+46} ${level} V54`} fill="none" stroke="currentColor" strokeWidth="2.2"/>
                      <path d={`M${x+3} ${level-5} H${x+43} V${level} Q${x+43} 187 ${x+23} 187 Q${x+3} 187 ${x+3} ${level} Z`} fill="var(--primary)" opacity=".22"/>
                      <rect x={x+16} y={level-43} width="14" height="35" rx="3" fill="var(--surface-2)" stroke="var(--primary)" strokeWidth="2" />
                      <text x={x+23} y="215" textAnchor="middle" fontSize="11" fill="currentColor">{concentration}</text>
                    </g>;
                  })}
                  <path d="M35 235 H605" stroke="currentColor" strokeWidth="1" opacity=".35"/>
                  <text x="320" y="252" textAnchor="middle" fontSize="12" fill="currentColor">Sucrose concentration / mol dm⁻³</text>
                  <text x="320" y="30" textAnchor="middle" fontSize="12" fill="currentColor">Equal-sized potato cylinders · schematic, not to scale</text>
                </svg>
                <p className="mt-2 text-[11px] leading-5 text-[var(--muted-foreground)]">Use cylinders of the same dimensions, blot each consistently before weighing, and keep immersion time and temperature constant. The six tubes represent a concentration series, not measured results.</p>
              </figure>}
              {task.id === "P5-01" && <figure className="mt-5 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 sm:p-4">
                <figcaption className="mb-3 text-xs font-semibold">Photosynthesis and light intensity · planning apparatus schematic</figcaption>
                <svg viewBox="0 0 640 300" role="img" aria-label="Aquatic plant in sodium hydrogencarbonate solution in a water bath, illuminated by a lamp at a measured distance with a ruler alongside" className="mx-auto block w-full max-w-2xl">
                  <rect x="105" y="95" width="300" height="142" rx="9" fill="var(--primary)" opacity=".07" stroke="currentColor" strokeWidth="2"/>
                  <path d="M112 145 Q160 139 210 145 T310 145 T398 145" fill="none" stroke="var(--primary)" strokeWidth="2"/>
                  <path d="M240 213 Q231 184 246 159 Q256 141 252 118 M247 170 Q219 158 207 139 M249 159 Q274 151 286 130 M241 191 Q216 184 204 166" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M205 139 Q187 126 179 139 Q189 154 205 139 M286 130 Q302 115 312 129 Q303 145 286 130 M204 166 Q184 157 178 170 Q189 182 204 166" fill="var(--primary)" opacity=".28" stroke="var(--primary)" strokeWidth="1.5"/>
                  <text x="255" y="260" textAnchor="middle" fontSize="12" fill="currentColor">Water bath · aquatic plant + solution</text>
                  <rect x="28" y="107" width="53" height="93" rx="7" fill="var(--surface-2)" stroke="currentColor" strokeWidth="2"/>
                  <path d="M40 107 V85 H69 V107" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <path d="M54 85 L54 66" stroke="currentColor" strokeWidth="2"/>
                  <path d="M42 66 Q54 53 66 66" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <text x="54" y="220" textAnchor="middle" fontSize="11" fill="currentColor">Lamp</text>
                  <path d="M84 126 L104 126 M84 151 L104 151 M84 176 L104 176" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3"/>
                  <path d="M88 78 H405 M88 72 V84 M405 72 V84" stroke="currentColor" strokeWidth="1.5"/>
                  <text x="246" y="66" textAnchor="middle" fontSize="11" fill="currentColor">Measure lamp distance to plant</text>
                  <rect x="443" y="111" width="165" height="82" rx="8" fill="var(--surface-2)" stroke="currentColor" strokeWidth="2"/>
                  <path d="M460 132 H590 M460 151 H590 M460 170 H590" stroke="currentColor" strokeWidth="1" opacity=".45"/>
                  <text x="525" y="91" textAnchor="middle" fontSize="12" fill="currentColor">Distance scale</text>
                  <path d="M462 119 V185 M482 119 V185 M502 119 V185 M522 119 V185 M542 119 V185 M562 119 V185 M582 119 V185" stroke="currentColor" strokeWidth="1"/>
                  <text x="525" y="211" textAnchor="middle" fontSize="10" fill="currentColor">Lamp positions</text>
                </svg>
                <p className="mt-2 text-[11px] leading-5 text-[var(--muted-foreground)]">Keep the plant, solution volume and concentration, temperature and measurement interval constant. Allow the plant to acclimatise at each distance. Measure light intensity at the plant where possible; distance alone is only a proxy and room light should be controlled.</p>
              </figure>}
              {task.id === "P3-04" && <figure className="mt-5 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 sm:p-4">
                <figcaption className="mb-3 text-xs font-semibold">Amylase and pH · endpoint test apparatus schematic</figcaption>
                <svg viewBox="0 0 640 300" role="img" aria-label="Water bath containing labelled starch and amylase buffer test tubes, with a spotting tile containing iodine drops for testing starch breakdown at timed intervals" className="mx-auto block w-full max-w-2xl">
                  <rect x="42" y="92" width="340" height="142" rx="10" fill="var(--primary)" opacity=".08" stroke="currentColor" strokeWidth="2"/>
                  <path d="M49 135 Q90 127 130 135 T210 135 T300 135 T375 135" fill="none" stroke="var(--primary)" strokeWidth="2" strokeDasharray="6 4"/>
                  <text x="212" y="255" textAnchor="middle" fontSize="12" fill="currentColor">Water bath · constant temperature</text>
                  {["Starch","Amylase + buffer"].map((label,i)=>{
                    const x=105+i*145;
                    return <g key={label}>
                      <path d={`M${x} 48 H${x+54} V176 Q${x+54} 190 ${x+27} 190 Q${x} 190 ${x} 176 Z`} fill="var(--surface-2)" stroke="currentColor" strokeWidth="2"/>
                      <path d={`M${x+3} 145 H${x+51} V176 Q${x+51} 187 ${x+27} 187 Q${x+3} 187 ${x+3} 176 Z`} fill="var(--primary)" opacity=".25"/>
                      <path d={`M${x-3} 45 H${x+57}`} stroke="currentColor" strokeWidth="3"/>
                      <text x={x+27} y="30" textAnchor="middle" fontSize="11" fill="currentColor">{label}</text>
                    </g>;
                  })}
                  <rect x="425" y="118" width="180" height="105" rx="9" fill="var(--surface-2)" stroke="currentColor" strokeWidth="2"/>
                  {Array.from({length:3},(_,row)=>Array.from({length:4},(_,col)=>{
                    const cx=449+col*42, cy=145+row*27;
                    return <g key={`${row}-${col}`}><circle cx={cx} cy={cy} r="9" fill="var(--primary)" opacity=".2" stroke="var(--primary)" strokeWidth="1.2"/></g>;
                  }))}
                  <text x="515" y="95" textAnchor="middle" fontSize="12" fill="currentColor">Spotting tile</text>
                  <text x="515" y="245" textAnchor="middle" fontSize="11" fill="currentColor">Iodine in each well</text>
                  <path d="M382 164 H413" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3"/>
                  <text x="397" y="153" textAnchor="middle" fontSize="9" fill="currentColor">Timed</text>
                </svg>
                <p className="mt-2 text-[11px] leading-5 text-[var(--muted-foreground)]">At each pH, equilibrate the starch and amylase-buffer mixtures at the same temperature. Mix to start timing, then test small samples at fixed intervals with iodine. Record the time when iodine no longer turns blue-black. Use a fresh pipette tip or clean dropper to avoid contaminating solutions.</p>
              </figure>}
              {task.id === "P3-02" && <figure className="mt-5 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 sm:p-4">
                <figcaption className="mb-3 text-xs font-semibold">Specimen field of view · illustrative schematic, not a micrograph</figcaption>
                <svg viewBox="0 0 520 300" role="img" aria-label="Circular microscope field showing an arrangement of elongated plant tissue cells with visible cell walls and nuclei, plus a scale bar" className="mx-auto block w-full max-w-xl">
                  <defs><clipPath id="specimen-field"><circle cx="250" cy="145" r="125" /></clipPath></defs>
                  <circle cx="250" cy="145" r="128" fill="none" stroke="currentColor" strokeWidth="2" opacity=".65" />
                  <g clipPath="url(#specimen-field)" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <path d="M95 48 L170 38 L188 104 L112 119 Z M170 38 L245 34 L260 100 L188 104 Z M245 34 L322 45 L330 111 L260 100 Z M322 45 L395 65 L390 130 L330 111 Z" />
                    <path d="M112 119 L188 104 L205 176 L125 190 Z M188 104 L260 100 L270 170 L205 176 Z M260 100 L330 111 L340 180 L270 170 Z M330 111 L390 130 L382 197 L340 180 Z" />
                    <path d="M125 190 L205 176 L225 246 L145 260 Z M205 176 L270 170 L285 240 L225 246 Z M270 170 L340 180 L350 248 L285 240 Z M340 180 L382 197 L400 258 L350 248 Z" />
                  </g>
                  <g fill="var(--primary)" opacity=".8">
                    <ellipse cx="150" cy="80" rx="8" ry="4" transform="rotate(-12 150 80)" /><ellipse cx="225" cy="70" rx="8" ry="4" transform="rotate(-5 225 70)" />
                    <ellipse cx="300" cy="76" rx="8" ry="4" transform="rotate(8 300 76)" /><ellipse cx="360" cy="95" rx="8" ry="4" transform="rotate(15 360 95)" />
                    <ellipse cx="160" cy="155" rx="8" ry="4" transform="rotate(-10 160 155)" /><ellipse cx="240" cy="138" rx="8" ry="4" /><ellipse cx="310" cy="145" rx="8" ry="4" transform="rotate(8 310 145)" />
                    <ellipse cx="180" cy="220" rx="8" ry="4" transform="rotate(-8 180 220)" /><ellipse cx="250" cy="210" rx="8" ry="4" /><ellipse cx="320" cy="215" rx="8" ry="4" transform="rotate(10 320 215)" />
                  </g>
                  <path d="M370 270 H430" stroke="currentColor" strokeWidth="3" /><text x="400" y="288" textAnchor="middle" fill="currentColor" fontSize="12">Scale bar not to scale</text>
                </svg>
                <p className="mt-2 text-[11px] leading-5 text-[var(--muted-foreground)]">Use the schematic to practise tracing cell boundaries and choosing labels. Use the stated measurements, not the drawing dimensions, for magnification calculations.</p>
              </figure>}
              {task.id === "P3-02" && <PracticalDrawingPad key={`drawing-${workspaceRevision}`} storageKey={`shadecode:practical-drawing:${set.id}:P3-02`} />}
              {task.id === "P3-05" && <figure className="mt-5 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 sm:p-4">
                <figcaption className="mb-3 text-xs font-semibold">Bubble potometer · apparatus schematic</figcaption>
                <svg viewBox="0 0 620 310" role="img" aria-label="Schematic of a bubble potometer with leafy shoot in a sealed tube, a capillary containing a visible air bubble, and a water reservoir" className="mx-auto block w-full max-w-2xl">
                  <defs><marker id="potometer-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="none" stroke="currentColor" strokeWidth="1" /></marker></defs>
                  <path d="M265 192 V120 Q265 108 277 108 H545 Q557 108 557 120 V192" fill="none" stroke="var(--primary)" strokeWidth="9" strokeLinecap="round" />
                  <path d="M270 180 H552" stroke="var(--primary)" strokeWidth="3" opacity=".35" />
                  <rect x="340" y="101" width="34" height="14" rx="3" fill="var(--surface-2)" stroke="currentColor" />
                  <path d="M356 105 V65 M356 82 L330 55 M356 80 L385 51 M356 72 L356 40" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <g fill="var(--primary)" stroke="var(--primary)" strokeWidth="1.5">
                    <ellipse cx="326" cy="53" rx="17" ry="8" transform="rotate(25 326 53)" />
                    <ellipse cx="390" cy="49" rx="18" ry="8" transform="rotate(-25 390 49)" />
                    <ellipse cx="356" cy="34" rx="17" ry="8" />
                  </g>
                  <path d="M265 192 V238 H545 V192" fill="none" stroke="currentColor" strokeWidth="2" opacity=".7" />
                  <path d="M280 221 H530" stroke="var(--primary)" strokeWidth="2" strokeDasharray="5 5" />
                  <rect x="405" y="102" width="9" height="12" rx="4" fill="var(--background)" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M409 95 V70 H475" fill="none" stroke="currentColor" strokeWidth="1.2" markerEnd="url(#potometer-arrow)" />
                  <text x="480" y="67" fontSize="12" fill="currentColor">Air bubble</text>
                  <path d="M355 40 L280 22 H190" fill="none" stroke="currentColor" strokeWidth="1.2" markerEnd="url(#potometer-arrow)" />
                  <text x="80" y="25" fontSize="12" fill="currentColor">Leafy shoot</text>
                  <path d="M356 109 L356 145 H190" fill="none" stroke="currentColor" strokeWidth="1.2" markerEnd="url(#potometer-arrow)" />
                  <text x="75" y="149" fontSize="12" fill="currentColor">Airtight seal</text>
                  <path d="M500 190 L500 266 H580" fill="none" stroke="currentColor" strokeWidth="1.2" markerEnd="url(#potometer-arrow)" />
                  <text x="485" y="283" fontSize="12" fill="currentColor">Water-filled tube</text>
                  <path d="M265 238 L265 268 H180" fill="none" stroke="currentColor" strokeWidth="1.2" markerEnd="url(#potometer-arrow)" />
                  <text x="70" y="285" fontSize="12" fill="currentColor">Water-filled chamber</text>
                  <path d="M415 118 H525" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="470" y="135" textAnchor="middle" fontSize="10" fill="currentColor">Capillary</text>
                </svg>
                <p className="mt-2 text-[11px] leading-5 text-[var(--muted-foreground)]">Conceptual layout only. Real apparatus designs vary, and a separate reservoir or control tap may be fitted to reset the bubble. All joints must be airtight. Measure bubble displacement over a timed interval.</p>
              </figure>}
            </div>

            {task.questions.map((question, index) => {
              const key = `${task.id}::${question.id}`;
              const revealed = attempt.revealedAnswers.includes(key);
              return <article id={`practical-question-${task.id}-${question.id}`} key={question.id} className="scroll-mt-24 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Question {index + 1}</p><h3 className="mt-2 text-sm font-semibold leading-6">{question.prompt}</h3></div><span className="shrink-0 rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold tabular-nums">{question.marks} marks</span></div>
                {question.data && <div className="mt-4 overflow-hidden rounded-xl border border-[var(--card-border)]">
                  <div className="border-b border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-2"><p className="text-xs font-semibold">Provided results</p><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">Use these values as evidence in your answer.</p></div>
                  <div className="overflow-x-auto"><table className="w-full min-w-[320px] border-collapse text-left text-xs">
                    <caption className="sr-only">Provided results for question {question.id}</caption>
                    <thead><tr>{question.data.columns.map((column, columnIndex) => <th key={columnIndex} scope="col" className="border-b border-[var(--card-border)] px-3 py-2 font-semibold text-[var(--foreground)]">{column}</th>)}</tr></thead>
                    <tbody>{question.data.rows.map((row, rowIndex) => <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-[var(--background)]" : "bg-[var(--surface)]"}>{row.map((value, columnIndex) => columnIndex === 0 ? <th key={columnIndex} scope="row" className="border-b border-[var(--card-border)] px-3 py-2 text-left font-medium tabular-nums">{value}</th> : <td key={columnIndex} className="border-b border-[var(--card-border)] px-3 py-2 tabular-nums">{value}</td>)}</tr>)}</tbody>
                  </table></div>
                </div>}
                {question.data && getPracticalQuestionSkills(task, question).some((skill) => /graph/i.test(skill)) && <PracticalGraphPlotter key={`graph-${workspaceRevision}-${key}`} data={question.data} storageKey={`shadecode:practical-graph:${set.id}:${key}`} />}
                {task.id === "P3-02" && question.id === "a" && <MagnificationCalculator />}
                {(() => {
                  const assessedSkills = getPracticalQuestionSkills(task, question);
                  return assessedSkills.length > 0 ? <div className="mt-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Skills assessed in this question</p><div className="mt-2 flex flex-wrap gap-2">{assessedSkills.map((skill) => { const rating = attempt.skillRatings[`${task.id}::${skill}`]; return <span key={skill} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--card-border)] px-2.5 py-1 text-[11px]"><span>{skill}</span><span className="font-semibold text-[var(--primary)]">{rating ?? "not rated"}</span></span>; })}</div></div> : null;
                })()}
                <label className="mt-4 block"><span className="sr-only">Your answer to question {index + 1}</span><textarea value={attempt.answers[key] ?? ""} onChange={(event) => updateAnswer(task.id, question.id, event.target.value)} rows={4} placeholder="Write your answer here…" className="w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 text-sm leading-6 outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15" /></label>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => revealQuestionGuidance(task, question)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 text-xs font-semibold hover:bg-[var(--surface-2)]">{revealed ? <EyeOff size={14} /> : <Eye size={14} />}{revealed ? "Guidance revealed" : "Reveal self-check points"}</button>
                  <label className="ml-auto flex items-center gap-2 text-xs text-[var(--muted-foreground)]">My marks <input type="number" min={0} max={question.marks} step={1} value={attempt.selfAwardedMarks[key] ?? ""} onChange={(event) => { const value = event.target.value; if (value === "") { setAttempt((current) => ({ ...current, selfAwardedMarks: Object.fromEntries(Object.entries(current.selfAwardedMarks).filter(([savedKey]) => savedKey !== key)) })); return; } const parsed = Number(value); if (Number.isInteger(parsed) && parsed >= 0 && parsed <= question.marks) setAttempt((current) => selfAwardPracticalMarks(set, current, task.id, question.id, parsed)); }} className="h-9 w-16 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-2 text-center text-sm font-semibold tabular-nums text-[var(--foreground)]" /></label>
                </div>
                {revealed && <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">Question-specific coaching · {getPracticalQuestionFeedback(question).categoryLabel}</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{getPracticalQuestionFeedback(question).improvementAdvice}</p></div>}
                {revealed && <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">Answer-quality checklist</p><span className="text-[11px] text-[var(--muted-foreground)]">{(attempt.checkedAnswerPoints[key] ?? []).length}/{question.answer.length} points reviewed</span></div><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Compare each point with your answer and tick it only if you included the idea accurately. These are guidance points, not individually weighted marks.</p><ul className="mt-3 space-y-3 text-sm leading-6">{question.answer.map((point, pointIndex) => { const checked = (attempt.checkedAnswerPoints[key] ?? []).includes(pointIndex); return <li key={pointIndex}><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={checked} onChange={() => setAttempt((current) => togglePracticalAnswerPoint(set, current, task.id, question.id, pointIndex))} className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]" /><span className={checked ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>{point}</span></label></li>; })}</ul><p className="mt-3 text-xs font-semibold text-[var(--muted-foreground)]">Still unchecked? Add the missing idea to your answer, then retry without looking.</p><button type="button" onClick={() => setAttempt((current) => retryPracticalQuestion(set, current, task.id, question.id))} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--primary)] px-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary-glow)]"><RotateCcw size={14} /> Retry question without guidance</button></div>}
              </article>;
            })}

            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5">
              <div className="flex items-center gap-2"><Target size={18} className="text-[var(--primary)]" /><h3 className="font-semibold">Rate your practical skills</h3></div>
              <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Be honest. These ratings help you decide what to practise next.</p>
              <div className="mt-4 divide-y divide-[var(--card-border)]">
                {task.skills.map((skill) => {
                  const current = attempt.skillRatings[`${task.id}::${skill}`];
                  return <div key={skill} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm font-medium">{skill}</span><div className="flex flex-wrap gap-2">{(["secure", "developing", "revisit"] as const).map((rating) => <button key={rating} type="button" aria-pressed={current === rating} onClick={() => updateRating(task.id, skill, rating)} className={`min-h-9 rounded-lg border px-3 text-xs font-semibold capitalize transition ${current === rating ? "border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--primary)]" : "border-[var(--card-border)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"}`}>{rating}</button>)}</div></div>;
                })}
              </div>
            </div>
          </section>
        </div>

        {showReview && <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-center gap-2"><ClipboardList size={18} className="text-[var(--primary)]" /><h2 className="text-lg font-bold">Your skill review</h2></div><p className="mt-1 text-sm text-[var(--muted-foreground)]">This is a self-assessment, not an automated judgement of your written answers or a prediction of examination performance.</p><div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">Practice review status</h3><span className="rounded-full bg-[var(--primary-glow)] px-3 py-1 text-[11px] font-bold capitalize text-[var(--primary)]">{summary.practiceReview.status.replace("-", " ")}</span></div><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-[var(--muted-foreground)]">Questions answered</p><p className="mt-1 text-lg font-bold tabular-nums">{summary.practiceReview.answeredPercent}%</p></div><div><p className="text-xs text-[var(--muted-foreground)]">Skills fully reviewed</p><p className="mt-1 text-lg font-bold tabular-nums">{summary.practiceReview.skillsReviewed}/{summary.practiceReview.totalSkills}</p></div><div><p className="text-xs text-[var(--muted-foreground)]">Revealed guidance checked</p><p className="mt-1 text-lg font-bold tabular-nums">{summary.practiceReview.availableGuidancePoints ? `${summary.practiceReview.guidanceReviewPercent}%` : "Not opened"}</p></div></div><p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">“Reviewed” means you completed the available practice and self-review steps. It does not certify mastery or predict an exam grade.</p></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{summary.skills.map((skill) => <div key={skill.skill} className="rounded-xl bg-[var(--background)] px-3 py-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{skill.skill}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${skill.rating === "secure" ? "bg-emerald-500/10 text-emerald-600" : skill.rating === "developing" ? "bg-amber-500/10 text-amber-600" : "bg-[var(--surface-2)] text-[var(--muted-foreground)]"}`}>{skill.rating.replace("-", " ")}</span></div><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">{skill.domain.replace("-", " ")}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Reviewed in {skill.reviewedTaskCount}/{skill.totalTaskCount} tasks</p><p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{skill.improvementFocus}</p><div className="mt-2 flex flex-wrap gap-1.5">{skill.taskIds.map((taskId) => { const taskReview = skill.taskRatings[taskId]; const taskTitle = set.tasks.find((item) => item.id === taskId)?.title ?? taskId; return <span key={taskId} className="rounded-md border border-[var(--card-border)] px-2 py-1 text-[10px] text-[var(--muted-foreground)]">{taskTitle}: {taskReview.replace("-", " ")}</span>; })}</div></div>)}</div><div className="mt-4 rounded-xl border border-[var(--card-border)] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Recommended next practice</p>{summary.recommendedPractice.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{summary.recommendedPractice.map((item) => <div key={item.skill} className="rounded-xl bg-[var(--background)] p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{item.skill}</span><span className="text-[10px] font-bold uppercase text-[var(--muted-foreground)]">{item.rating.replace("-", " ")}</span></div><p className="mt-1 text-xs font-medium">{item.taskTitle}</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{item.reason}</p><button type="button" onClick={() => openRecommendation(item.taskId, item.questionId)} className="mt-3 min-h-9 rounded-lg border border-[var(--card-border)] px-3 text-xs font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)]">Open task · Question {item.questionId}</button></div>)}</div> : <p className="mt-2 text-sm leading-6">No skills currently flagged for review. Keep practising to maintain them.</p>}</div></section>}

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]"><span className="flex items-center gap-2"><Save size={14} />{ready ? "Saved on this device" : "Loading saved attempt…"}</span><span className="flex items-center gap-1"><CheckCircle2 size={14} /> Works without AI or a live connection after the page loads</span></footer>
      </div>
    </div>
  );
}
