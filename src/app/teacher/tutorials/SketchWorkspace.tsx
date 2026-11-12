"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ChangeEvent } from "react";
import { applyHandwritingAlternative, shouldUseHandwritingRetry, type UncertainHandwritingCharacter } from "@/lib/teacher/handwriting";

type Tool = "pen" | "eraser" | "line" | "arrow" | "rectangle" | "ellipse" | "triangle" | "polygon" | "curve" | "label";
export type Point = { x: number; y: number };
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

function drawShape(ctx: CanvasRenderingContext2D, from: Point, to: Point, tool: Tool, control?: Point, vertices?: Point[]) {
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const left = Math.min(from.x, to.x), top = Math.min(from.y, to.y);
  const w = Math.abs(to.x - from.x), h = Math.abs(to.y - from.y);
  if (tool === "line") { ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); }
  else if (tool === "arrow") drawArrow(ctx, from, to);
  else if (tool === "rectangle") ctx.strokeRect(left, top, w, h);
  else if (tool === "ellipse") { ctx.beginPath(); ctx.ellipse(left + w / 2, top + h / 2, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2); ctx.stroke(); }
  else if (tool === "triangle") { ctx.beginPath(); ctx.moveTo(left + w / 2, top); ctx.lineTo(left + w, top + h); ctx.lineTo(left, top + h); ctx.closePath(); ctx.stroke(); }
  else if (tool === "polygon" && vertices && vertices.length >= 5) {
    ctx.beginPath(); ctx.moveTo(vertices[0].x, vertices[0].y);
    for (const vertex of vertices.slice(1)) ctx.lineTo(vertex.x, vertex.y);
    ctx.closePath(); ctx.stroke();
  }
  else if (tool === "curve") {
    const bend = Math.max(24, Math.min(140, distance(from, to) * 0.22));
    const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const controlPoint = control ?? { x: midpoint.x, y: midpoint.y - bend };
    ctx.beginPath(); ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, to.x, to.y); ctx.stroke();
  }
}

function recognizeFreehandArrow(points: Point[]): { tool: "arrow"; from: Point; to: Point } | null {
  if (points.length < 12) return null;
  const first = points[0];
  const bounds = points.reduce((value, point) => ({
    left: Math.min(value.left, point.x), right: Math.max(value.right, point.x),
    top: Math.min(value.top, point.y), bottom: Math.max(value.bottom, point.y),
  }), { left: first.x, right: first.x, top: first.y, bottom: first.y });
  const diagonal = Math.hypot(bounds.right - bounds.left, bounds.bottom - bounds.top);
  const returnTolerance = Math.max(9, Math.min(22, diagonal * 0.045));
  for (let tipIndex = 3; tipIndex < points.length - 3; tipIndex++) {
    const tip = points[tipIndex];
    const shaftLength = distance(first, tip);
    if (shaftLength < 40) continue;
    for (let returnIndex = tipIndex + 2; returnIndex < points.length - 1; returnIndex++) {
      const returnedTip = points[returnIndex];
      if (distance(tip, returnedTip) > returnTolerance) continue;
      const wingA = points[tipIndex + 1], wingB = points[returnIndex + 1];
      const aLength = distance(tip, wingA), bLength = distance(returnedTip, wingB);
      if (aLength < 7 || bLength < 7 || aLength > shaftLength * 0.38 || bLength > shaftLength * 0.38) continue;
      const shaftAngle = Math.atan2(tip.y - first.y, tip.x - first.x);
      const angleA = Math.atan2(wingA.y - tip.y, wingA.x - tip.x);
      const angleB = Math.atan2(wingB.y - returnedTip.y, wingB.x - returnedTip.x);
      const relativeA = Math.abs(Math.atan2(Math.sin(angleA - shaftAngle), Math.cos(angleA - shaftAngle)));
      const relativeB = Math.abs(Math.atan2(Math.sin(angleB - shaftAngle), Math.cos(angleB - shaftAngle)));
      if (relativeA < 1.75 || relativeA > 2.95 || relativeB < 1.75 || relativeB > 2.95) continue;
      const wingSeparation = Math.abs(Math.atan2(Math.sin(angleA - angleB), Math.cos(angleA - angleB)));
      if (wingSeparation < 0.45 || wingSeparation > 1.8) continue;
      return { tool: "arrow", from: first, to: { x: (tip.x + returnedTip.x) / 2, y: (tip.y + returnedTip.y) / 2 } };
    }
  }
  return null;
}

export type RecognizedShape = { tool: Tool; from: Point; to: Point; control?: Point; vertices?: Point[] };

export function recognizeShape(points: Point[]): RecognizedShape | null {
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
    const arrow = recognizeFreehandArrow(points);
    if (arrow) return arrow;
    // Fit a quadratic curve to the strongest perpendicular deviation from the chord.
    // This preserves the direction and bend the teacher actually drew.
    const dx = last.x - first.x, dy = last.y - first.y;
    const length = Math.max(Math.hypot(dx, dy), 1);
    const normal = { x: -dy / length, y: dx / length };
    let strongest = 0;
    for (const point of points.slice(1, -1)) {
      const deviation = (point.x - first.x) * normal.x + (point.y - first.y) * normal.y;
      if (Math.abs(deviation) > Math.abs(strongest)) strongest = deviation;
    }
    if (Math.abs(strongest) >= 12 && pathLength / Math.max(direct, 1) < 1.8) {
      const midpoint = { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 };
      return {
        tool: "curve",
        from: first,
        to: last,
        control: { x: midpoint.x + normal.x * strongest * 2, y: midpoint.y + normal.y * strongest * 2 },
      };
    }
    return null;
  }

  // Estimate the direction over a sampling window that scales with stroke
  // length. A fixed two-point window is too sensitive to drawing speed: the
  // same physical corner can otherwise become several artificial vertices.
  const turnWindow = Math.max(2, Math.round(points.length * 0.035));
  const cornerCandidates = points.flatMap((point, index) => {
    if (index < turnWindow || index > points.length - turnWindow - 1) return [];
    const before = points[index - turnWindow], after = points[index + turnWindow];
    const incoming = Math.atan2(point.y - before.y, point.x - before.x);
    const outgoing = Math.atan2(after.y - point.y, after.x - point.x);
    let turn = Math.abs(outgoing - incoming);
    if (turn > Math.PI) turn = Math.PI * 2 - turn;
    return turn > 0.72 ? [index] : [];
  });
  // Merge neighbouring turn samples into one physical corner. The tolerance
  // scales with sample density, while remaining small enough to separate
  // adjacent vertices on compact diagrams.
  const cornerClusters: number[][] = [];
  for (const index of cornerCandidates) {
    const current = cornerClusters[cornerClusters.length - 1];
    if (current && index - current[current.length - 1] <= turnWindow * 3) current.push(index);
    else cornerClusters.push([index]);
  }
  // The first and last samples share the same point on a closed stroke,
  // so the corner at the stroke seam has no samples on both sides. Count it
  // explicitly from the incoming and outgoing endpoint tangents.
  const firstDirection = Math.atan2(points[1].y - first.y, points[1].x - first.x);
  const lastDirection = Math.atan2(last.y - points[points.length - 2].y, last.x - points[points.length - 2].x);
  let seamTurn = Math.abs(firstDirection - lastDirection);
  if (seamTurn > Math.PI) seamTurn = Math.PI * 2 - seamTurn;
  const seamCorner = closed && seamTurn > 0.72;
  const cornerCount = cornerClusters.length + (seamCorner ? 1 : 0);
  if (closed && cornerCount >= 3 && cornerCount <= 8) {
    if (cornerCount === 3) return { tool: "triangle", from: { x: left, y: top }, to: { x: right, y: bottom } };
    if (cornerCount === 4) return { tool: "rectangle", from: { x: left, y: top }, to: { x: right, y: bottom } };
    if (cornerCount >= 5) {
      // Preserve actual vertices instead of forcing irregular polygons into a
      // rectangle. Select the strongest turn in each cluster to reduce jitter.
      const vertices = cornerClusters.map(cluster => {
        let bestIndex = cluster[0], bestTurn = -1;
        for (const index of cluster) {
          const before = points[Math.max(0, index - turnWindow)];
          const after = points[Math.min(points.length - 1, index + turnWindow)];
          const incoming = Math.atan2(points[index].y - before.y, points[index].x - before.x);
          const outgoing = Math.atan2(after.y - points[index].y, after.x - points[index].x);
          let turn = Math.abs(outgoing - incoming);
          if (turn > Math.PI) turn = Math.PI * 2 - turn;
          if (turn > bestTurn) { bestTurn = turn; bestIndex = index; }
        }
        return points[bestIndex];
      });
      if (seamCorner) vertices.unshift({ x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 });
      if (vertices.length === cornerCount) {
        return { tool: "polygon", from: { x: left, y: top }, to: { x: right, y: bottom }, vertices };
      }
    }
  }
  const circularity = (4 * Math.PI * (w * h)) / Math.max(pathLength * pathLength, 1);
  if (cornerCount < 3 && circularity > 0.48 && Math.min(w, h) / Math.max(w, h) > 0.45) return { tool: "ellipse", from: { x: left, y: top }, to: { x: right, y: bottom } };
  return null;
}

/** Crop blank canvas margins, upscale small writing and improve ink contrast for vision OCR. */
export async function prepareHandwritingImage(source: HTMLCanvasElement): Promise<Blob> {
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) throw new Error("Could not read the handwriting canvas.");
  const { data, width, height } = sourceContext.getImageData(0, 0, source.width, source.height);
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const index = (y * width + x) * 4;
      const luminance = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
      if (luminance < 244 && data[index + 3] > 20) {
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
  }
  const output = document.createElement("canvas");
  const outputContext = output.getContext("2d", { willReadFrequently: true });
  if (!outputContext) throw new Error("Could not prepare the handwriting image.");
  if (right < left || bottom < top) {
    output.width = width; output.height = height;
    outputContext.fillStyle = "#fff"; outputContext.fillRect(0, 0, width, height);
  } else {
    const padding = 36;
    const cropLeft = Math.max(0, left - padding), cropTop = Math.max(0, top - padding);
    const cropRight = Math.min(width, right + padding + 1), cropBottom = Math.min(height, bottom + padding + 1);
    const cropWidth = cropRight - cropLeft, cropHeight = cropBottom - cropTop;
    const scale = Math.min(2, 2200 / cropWidth, 1400 / cropHeight);
    output.width = Math.max(1, Math.round(cropWidth * scale));
    output.height = Math.max(1, Math.round(cropHeight * scale));
    outputContext.fillStyle = "#fff"; outputContext.fillRect(0, 0, output.width, output.height);
    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = "high";
    outputContext.drawImage(source, cropLeft, cropTop, cropWidth, cropHeight, 0, 0, output.width, output.height);
    const pixels = outputContext.getImageData(0, 0, output.width, output.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const gray = pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114;
      const enhanced = Math.max(0, Math.min(255, (gray - 180) * 1.22 + 180));
      pixels.data[i] = enhanced; pixels.data[i + 1] = enhanced; pixels.data[i + 2] = enhanced;
    }
    outputContext.putImageData(pixels, 0, 0);
  }
  return new Promise((resolve, reject) => output.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not encode the prepared handwriting image.")), "image/png"));
}

export function SketchWorkspace({ onSave, onCancel, saving }: {
  onSave: (file: File) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const liveRecognitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionPendingRef = useRef(false);
  const recognitionInFlightRef = useRef(false);
  const liveCorrectionRef = useRef(true);
  const lastRecognitionAtRef = useRef(0);
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
  const [recognizingHandwriting, setRecognizingHandwriting] = useState(false);
  const [liveCorrection, setLiveCorrection] = useState(true);
  const [recognitionMode, setRecognitionMode] = useState<"general" | "mathematics" | "science">("general");
  const [handwritingText, setHandwritingText] = useState("");
  const [handwritingRawText, setHandwritingRawText] = useState("");
  const [handwritingUncertainty, setHandwritingUncertainty] = useState<UncertainHandwritingCharacter[]>([]);
  const [handwritingConfidence, setHandwritingConfidence] = useState<number | null>(null);
  const [handwritingMathExpressions, setHandwritingMathExpressions] = useState<Array<{ sourceText: string; latex: string; confidence: number | null; uncertainTokens: string[] }>>([]);
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

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (liveRecognitionTimerRef.current) clearTimeout(liveRecognitionTimerRef.current);
  }, []);

  async function improveLabelText(): Promise<{ text: string; improved: boolean; checked: boolean }> {
    const original = label.trim();
    if (!original) return { text: "", improved: false, checked: false };
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
      setStatus(result.preservedOriginal === true ? (typeof result.reason === "string" ? result.reason : "The suggested edit was unsafe. Original text preserved.") : result.changed ? "Text improved: spelling, grammar and clarity corrected. Review it before placing." : "Text checked. No changes were needed.");
      return { text: result.improvedText.trim(), improved: result.changed === true, checked: true };
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not improve text. Original wording is preserved.");
      return { text: original, improved: false, checked: false };
    } finally {
      setImprovingText(false);
    }
  }

  async function recognizeHandwriting() {
    const canvas = canvasRef.current;
    if (!canvas || recognitionInFlightRef.current) return;
    recognitionInFlightRef.current = true;
    if (liveRecognitionTimerRef.current) {
      clearTimeout(liveRecognitionTimerRef.current);
      liveRecognitionTimerRef.current = null;
    }
    setRecognizingHandwriting(true);
    lastRecognitionAtRef.current = Date.now();
    setStatus("Preparing the writing, improving contrast and checking individual characters…");
    try {
      const originalBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(value => value ? resolve(value) : reject(new Error("Could not capture the canvas.")), "image/png"),
      );
      let blob = await prepareHandwritingImage(canvas);
      if (blob.size > 3 * 1024 * 1024) blob = originalBlob;
      if (blob.size > 3 * 1024 * 1024) throw new Error("This canvas is too large to analyse. Clear unused space or split the writing into sections.");
      const encodeImage = (imageBlob: Blob) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result ?? "");
          const comma = dataUrl.indexOf(",");
          if (comma < 0) reject(new Error("Could not prepare the handwriting image."));
          else resolve(dataUrl.slice(comma + 1));
        };
        reader.onerror = () => reject(new Error("Could not read the handwriting image."));
        reader.readAsDataURL(imageBlob);
      });
      const requestRecognition = async (imageBlob: Blob) => {
        const image = await encodeImage(imageBlob);
        const response = await fetch("/api/teacher/tutorials/recognize-handwriting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image, mimeType: "image/png", mode: recognitionMode }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Handwriting recognition is unavailable.");
        return payload;
      };
      let result = await requestRecognition(blob);
      const firstConfidence = typeof result.confidence === "number" ? result.confidence : 0;
      const firstUncertaintyCount = Array.isArray(result.uncertainCharacters) ? result.uncertainCharacters.length : 0;
      // Contrast enhancement can occasionally erase faint pencil strokes or tiny
      // mathematical marks. When the first pass is weak, retry the untouched canvas
      // and keep whichever transcription has the stronger confidence/uncertainty score.
      if ((firstConfidence < 0.82 || firstUncertaintyCount > 0) && originalBlob.size <= 3 * 1024 * 1024 && blob !== originalBlob) {
        setStatus("Checking an untouched copy too, to avoid losing faint strokes or mathematical symbols…");
        try {
          const originalResult = await requestRecognition(originalBlob);
          const originalUncertainty = Array.isArray(originalResult.uncertainCharacters) ? originalResult.uncertainCharacters.length : 0;
          if (shouldUseHandwritingRetry(
            { text: result.correctedText, confidence: result.confidence, uncertainCount: firstUncertaintyCount },
            { text: originalResult.correctedText, confidence: originalResult.confidence, uncertainCount: originalUncertainty },
          )) result = originalResult;
        } catch {
          // The prepared-image result remains usable if the optional second pass fails.
        }
      }
      const corrected = typeof result.correctedText === "string" ? result.correctedText.trim() : "";
      if (!corrected) throw new Error("No readable handwriting was found. Try darker, larger writing with more spacing.");
      setHandwritingRawText(typeof result.transcript === "string" ? result.transcript : corrected);
      setHandwritingText(corrected);
      const uncertainties = Array.isArray(result.uncertainCharacters) ? result.uncertainCharacters : [];
      setHandwritingUncertainty(uncertainties.map((item: UncertainHandwritingCharacter) => ({
        seen: item.seen || "Character",
        chosen: item.chosen || "[unclear]",
        alternatives: Array.isArray(item.alternatives) ? item.alternatives : [],
        context: item.context || "",
        reason: item.reason || "",
      })));
      setHandwritingConfidence(typeof result.confidence === "number" ? result.confidence : null);
      setHandwritingMathExpressions(Array.isArray(result.mathExpressions) ? result.mathExpressions.filter((item: unknown): item is { sourceText: string; latex: string; confidence: number | null; uncertainTokens: string[] } => {
        if (!item || typeof item !== "object") return false;
        const expression = item as Record<string, unknown>;
        return typeof expression.sourceText === "string" && typeof expression.latex === "string";
      }).slice(0, 40) : []);
      const confidence = typeof result.confidence === "number" ? result.confidence : null;
      const needsReview = result.requiresReview === true || uncertainties.length > 0 || confidence === null || confidence < 0.9;
      setStatus(needsReview
        ? `Transcription needs review${uncertainties.length ? `: ${uncertainties.length} ambiguous character(s) flagged` : ""}${confidence === null ? "." : ` (model confidence ${Math.round(confidence * 100)}%).`} Check the original reading before using it.`
        : "High-confidence transcription returned. Review the original reading before placing it.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not read handwriting. Your drawing is unchanged.");
    } finally {
      recognitionInFlightRef.current = false;
      setRecognizingHandwriting(false);
      if (recognitionPendingRef.current && liveCorrectionRef.current) {
        recognitionPendingRef.current = false;
        scheduleLiveHandwritingRecognition();
      }
    }
  }

  function scheduleLiveHandwritingRecognition() {
    if (!liveCorrectionRef.current) return;
    if (recognitionInFlightRef.current) {
      recognitionPendingRef.current = true;
      return;
    }
    if (liveRecognitionTimerRef.current) clearTimeout(liveRecognitionTimerRef.current);
    const wait = Math.max(1800, 6000 - (Date.now() - lastRecognitionAtRef.current));
    liveRecognitionTimerRef.current = setTimeout(() => {
      liveRecognitionTimerRef.current = null;
      void recognizeHandwriting();
    }, wait);
    setStatus("Writing paused. Live character recognition and correction will run shortly…");
  }

  async function importHandwritingImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setStatus("Choose a PNG, JPEG or WebP handwriting image under 3 MiB.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) { bitmap.close(); return; }
      const scale = Math.min(WIDTH / bitmap.width, HEIGHT / bitmap.height);
      const width = bitmap.width * scale, height = bitmap.height * scale;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.drawImage(bitmap, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
      bitmap.close();
      pushHistory(ctx);
      setStatus("Handwriting image loaded. Reading and correcting characters…");
      if (liveCorrectionRef.current) scheduleLiveHandwritingRecognition();
    } catch {
      setStatus("Could not open that image. Try a standard PNG, JPEG or WebP photo.");
    }
  }

  function typesetCorrectedHandwriting() {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !handwritingText.trim()) return;
    const font = 30, lineHeight = 42, padding = 54, maxWidth = WIDTH - padding * 2;
    ctx.font = `500 ${font}px Arial, sans-serif`; ctx.textBaseline = "top";
    const lines: string[] = [];
    for (const paragraph of handwritingText.split(/\r?\n/)) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; }
        else line = candidate;
      }
      lines.push(line);
    }
    if (lines.length * lineHeight > HEIGHT - padding * 2) {
      setStatus("The corrected text is longer than one canvas. Split it into shorter sections before typesetting.");
      return;
    }
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = INK;
    lines.forEach((line, index) => ctx.fillText(line, padding, padding + index * lineHeight));
    pushHistory(ctx);
    setStatus("Corrected handwriting converted into clean, editable-looking typeset text on the canvas.");
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
        drawShape(ctx, recognized.from, recognized.to, recognized.tool, recognized.control, recognized.vertices);
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
      const textResult = autoImproveText
        ? await improveLabelText()
        : { text: label.trim(), improved: false, checked: false };
      const textToPlace = textResult.text;
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
      pushHistory(ctx);
      setStatus(textResult.improved ? "Improved text placed with clean typography." : textResult.checked ? "Text checked and placed with clean typography." : autoImproveText ? "Original text placed. AI improvement was unavailable." : "Text placed with clean typography.");
      return;
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
        drawShape(ctx, recognized.from, recognized.to, recognized.tool, recognized.control, recognized.vertices);
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
    const completedTool = tool;
    startRef.current = null; pointsRef.current = []; snapshotRef.current = null;
    if (completedTool === "pen") scheduleLiveHandwritingRecognition();
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
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void recognizeHandwriting()} disabled={recognizingHandwriting || saving} className="min-h-10 rounded-lg border border-[var(--primary)] px-3 py-2 text-sm font-semibold disabled:opacity-40">
        {recognizingHandwriting ? "Reading handwriting…" : "✦ Read & correct handwriting"}
      </button>
      <button type="button" onClick={() => imageInputRef.current?.click()} disabled={saving || recognizingHandwriting} className="min-h-10 rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm">Import handwriting photo</button>
      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={importHandwritingImage} className="hidden" />
      <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={liveCorrection} onChange={event => { const enabled = event.target.checked; liveCorrectionRef.current = enabled; setLiveCorrection(enabled); if (!enabled) { recognitionPendingRef.current = false; if (liveRecognitionTimerRef.current) { clearTimeout(liveRecognitionTimerRef.current); liveRecognitionTimerRef.current = null; } } }} />Live handwriting correction</label>
      <label className="flex min-h-10 items-center gap-2 text-sm">Recognition mode
        <select value={recognitionMode} onChange={event => setRecognitionMode(event.target.value as "general" | "mathematics" | "science")} className="min-h-10 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-2">
          <option value="general">General writing</option><option value="mathematics">Mathematics</option><option value="science">Science</option>
        </select>
      </label>
      <span className="text-xs text-[var(--muted-foreground)]">Automatically reads after you pause, corrects likely character confusions using context, and flags uncertain text.</span>
    </div>
    {handwritingText && <div className="space-y-2 rounded-xl border border-[var(--card-border)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Recognised and corrected handwriting</h4>
        <span className="text-xs text-[var(--muted-foreground)]">{handwritingConfidence === null ? "Confidence not supplied" : `${Math.round(handwritingConfidence * 100)}% confidence`}</span>
      </div>
      <textarea value={handwritingText} onChange={event => setHandwritingText(event.target.value)} maxLength={12000} rows={6} spellCheck autoCorrect="on" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm" aria-label="Review and edit recognised handwriting" />
      {handwritingRawText && handwritingRawText !== handwritingText && <details className="rounded-lg bg-[var(--surface)] p-2 text-xs"><summary className="cursor-pointer font-medium">Compare original character reading</summary><p className="mt-2 whitespace-pre-wrap">{handwritingRawText}</p></details>}
      {handwritingMathExpressions.length > 0 && <section className="space-y-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] p-3">
        <strong className="text-xs">Extracted mathematical notation</strong>
        <p className="text-xs text-[var(--muted-foreground)]">LaTeX is provided as an editable mathematical representation. Check every sign, digit and exponent against the handwriting.</p>
        {handwritingMathExpressions.map((expression, index) => <div key={index} className="space-y-1 border-t border-[var(--card-border)] pt-2">
          <p className="text-xs">Original: <span className="font-mono">{expression.sourceText}</span></p>
          <code className="block overflow-x-auto rounded bg-[var(--card)] p-2 text-sm">{expression.latex}</code>
          <p className="text-xs text-[var(--muted-foreground)]">{expression.confidence === null ? "No expression confidence supplied" : `${Math.round(expression.confidence * 100)}% expression confidence`}{expression.uncertainTokens?.length ? ` · Check: ${expression.uncertainTokens.join(", ")}` : ""}</p>
        </div>)}
      </section>}
      {handwritingUncertainty.length > 0 && <div className="space-y-3 rounded-lg bg-amber-500/10 p-3 text-xs"><strong>Characters needing a human check</strong>{handwritingUncertainty.map((item, index) => <div key={index} className="space-y-1 border-t border-amber-500/20 pt-2"><p><strong>{item.seen}</strong> was read as <strong>{item.chosen}</strong>{item.context ? <> in “{item.context}”</> : null}</p>{item.reason && <p className="text-[var(--muted-foreground)]">{item.reason}</p>}{item.alternatives.length > 0 && <div className="flex flex-wrap items-center gap-2"><span>Choose:</span>{item.alternatives.map((alternative, optionIndex) => <button key={optionIndex} type="button" onClick={() => { const updated = applyHandwritingAlternative(handwritingText, item, alternative); if (updated === null) { setStatus("Could not safely locate that character. Edit the transcription directly so no other character is changed."); return; } setHandwritingText(updated); setStatus(`Changed the uncertain reading to “${alternative}”. Review the surrounding text.`); }} className="min-h-8 rounded-md border border-amber-600/40 bg-[var(--surface)] px-2 py-1 font-semibold">{alternative}</button>)}</div>}</div>)}</div>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={typesetCorrectedHandwriting} className="min-h-10 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white">Typeset corrected text on canvas</button>
        <button type="button" onClick={() => { setLabel(handwritingText.slice(0, 240)); setTool("label"); setStatus(handwritingText.length > 240 ? "Only the first 240 characters fit in a single diagram label. The complete transcription remains above." : "Corrected text loaded into the label editor."); }} className="min-h-10 rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm">Use as diagram label</button>
      </div>
    </div>}
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
