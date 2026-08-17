"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { StudySpaceMode, WorkObject } from "@/lib/studyspace/types";
import { saveWorkObject } from "@/lib/studyspace/store";

const modes: { id: StudySpaceMode; label: string; description: string }[] = [
  { id: "workmate", label: "Workmate", description: "Bring questions, answers, working or images." },
  { id: "practice", label: "Practice", description: "Work through focused questions." },
  { id: "assessment", label: "Assessment", description: "Complete graded assessment work." },
  { id: "exam", label: "Exam", description: "Use a focused timed exam surface." },
  { id: "canvas", label: "Canvas", description: "Write, sketch and reason freely." },
];

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: 11, borderRadius: 8,
  border: "1px solid var(--card-border)", background: "var(--muted)",
  color: "var(--foreground)", marginBottom: 14,
};

export default function StudySpacePage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialMode = params.get("mode") as StudySpaceMode | null;
  const [mode, setMode] = useState<StudySpaceMode>(initialMode && modes.some((item) => item.id === initialMode) ? initialMode : "workmate");
  const [subject, setSubject] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [canvasData, setCanvasData] = useState("");
  const [saved, setSaved] = useState(false);
  const [workId, setWorkId] = useState(() => crypto.randomUUID());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (initialMode && modes.some((item) => item.id === initialMode)) setMode(initialMode);
  }, [initialMode]);

  const current = useMemo(() => modes.find((item) => item.id === mode)!, [mode]);

  const persist = useCallback(async (showStatus = true) => {
    const now = new Date().toISOString();
    const work: WorkObject = {
      id: workId,
      mode,
      subject: subject.trim() || undefined,
      prompt: prompt.trim() || undefined,
      response: response.trim() || undefined,
      canvasData: canvasData || undefined,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await saveWorkObject(work);
      dirtyRef.current = false;
      if (showStatus) {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1800);
      }
    } catch {
      if (showStatus) setSaved(false);
    }
  }, [canvasData, mode, prompt, response, subject, workId]);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = window.setTimeout(() => { void persist(false); }, 700);
    return () => window.clearTimeout(timer);
  }, [canvasData, mode, prompt, response, subject, persist]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "currentColor";
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const beginDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const p = point(event);
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    dirtyRef.current = true;
    setCanvasData(event.currentTarget.toDataURL("image/webp", 0.75));
  };

  const endDraw = () => { drawingRef.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    dirtyRef.current = true;
    setCanvasData("");
  };

  const selectMode = (next: StudySpaceMode) => {
    dirtyRef.current = true;
    setMode(next);
    router.replace(`/studyspace?mode=${next}`, { scroll: false });
  };

  return (
    <main style={{ padding: "24px", maxWidth: 1180, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--primary)" }}>SHADECODE</p>
          <h1 style={{ margin: "4px 0", fontSize: 32, fontWeight: 850 }}>StudySpace</h1>
          <p style={{ margin: 0, color: "var(--muted-foreground)" }}>One workspace for learning, working, practicing, assessment and exams.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => router.push("/dashboard")} style={{ border: "1px solid var(--card-border)", background: "var(--muted)", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>Home</button>
          <button onClick={() => router.back()} style={{ border: "1px solid var(--card-border)", background: "var(--muted)", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>Back</button>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 280px) 1fr", gap: 18 }}>
        <nav aria-label="StudySpace modes" style={{ display: "grid", gap: 8, alignContent: "start" }}>
          {modes.map((item) => (
            <button key={item.id} onClick={() => selectMode(item.id)} aria-current={mode === item.id ? "page" : undefined} style={{ textAlign: "left", border: "1px solid var(--card-border)", borderRadius: 10, padding: 13, background: mode === item.id ? "var(--primary)" : "var(--card)", color: "var(--foreground)", cursor: "pointer" }}>
              <strong>{item.label}</strong>
              <span style={{ display: "block", fontSize: 12, marginTop: 4, opacity: 0.8 }}>{item.description}</span>
            </button>
          ))}
        </nav>

        <section style={{ border: "1px solid var(--card-border)", borderRadius: 14, padding: 20, background: "var(--card)" }} aria-label="StudySpace canvas">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0 }}>{current.label}</h2>
              <p style={{ margin: "5px 0 18px", color: "var(--muted-foreground)" }}>{current.description}</p>
            </div>
            <span role="status" style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{saved ? "Saved offline ✓" : "Autosaves locally"}</span>
          </div>

          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Subject <span style={{ fontWeight: 400, color: "var(--muted-foreground)" }}>(optional)</span></label>
          <input value={subject} onChange={(event) => { dirtyRef.current = true; setSubject(event.target.value); }} placeholder="Any subject, or leave blank for Cortex to infer" style={inputStyle} />

          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Question / task</label>
          <textarea value={prompt} onChange={(event) => { dirtyRef.current = true; setPrompt(event.target.value); }} placeholder="Paste a question, assignment, essay prompt, code problem, diagram task, or anything you are working on..." rows={6} style={{ ...inputStyle, resize: "vertical" }} />

          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Your work / answer</label>
          <textarea value={response} onChange={(event) => { dirtyRef.current = true; setResponse(event.target.value); }} placeholder="Write your answer, reasoning, working or notes here..." rows={7} style={{ ...inputStyle, resize: "vertical" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, margin: "8px 0" }}>
            <div>
              <h3 style={{ margin: 0 }}>Canvas</h3>
              <p style={{ margin: "4px 0", fontSize: 12, color: "var(--muted-foreground)" }}>Sketch diagrams, show working, annotate ideas or write freely.</p>
            </div>
            <button onClick={clearCanvas} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "7px 10px", background: "var(--muted)", cursor: "pointer" }}>Clear</button>
          </div>
          <div style={{ border: "1px solid var(--card-border)", borderRadius: 10, overflow: "hidden", background: "var(--background)", color: "var(--foreground)" }}>
            <canvas ref={canvasRef} onPointerDown={beginDraw} onPointerMove={draw} onPointerUp={endDraw} onPointerCancel={endDraw} style={{ display: "block", width: "100%", height: 280, touchAction: "none", cursor: "crosshair" }} aria-label="StudySpace drawing canvas" />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
            <button onClick={() => void persist(true)} style={{ border: 0, borderRadius: 8, padding: "11px 16px", background: "var(--primary)", color: "white", fontWeight: 750, cursor: "pointer" }}>Save work</button>
            <button onClick={() => router.push(`/workmate?mode=${mode}`)} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "10px 14px", background: "var(--muted)", color: "var(--foreground)", cursor: "pointer" }}>Open Workmate</button>
            {mode === "exam" && <button onClick={() => router.push("/exam-sim")} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "10px 14px", background: "var(--muted)", color: "var(--foreground)", cursor: "pointer" }}>Open Exam Simulation</button>}
            {saved && <span role="status" style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Work saved locally</span>}
          </div>
        </section>
      </div>
    </main>
  );
}
