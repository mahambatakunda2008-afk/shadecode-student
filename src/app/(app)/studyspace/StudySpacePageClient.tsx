"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { StudySpaceMode, WorkObject } from "@/lib/studyspace/types";
import { saveWorkObject } from "@/lib/studyspace/store";
import AdaptiveNextMove from "@/components/studyspace/AdaptiveNextMove";
import StudyCanvas from "@/components/studyspace/StudyCanvas";

const modes: { id: StudySpaceMode; label: string; description: string }[] = [
  { id: "workmate", label: "Workmate", description: "Bring questions, answers, working or images." },
  { id: "lesson", label: "Lesson", description: "Learn, revise and practise from a generated or curriculum lesson." },
  { id: "practice", label: "Practice", description: "Work through focused questions." },
  { id: "assessment", label: "Assessment", description: "Complete graded assessment work." },
  { id: "exam", label: "Exam", description: "Use a focused timed exam surface." },
  { id: "canvas", label: "Canvas", description: "Write, sketch and reason freely." },
];

export default function StudySpacePageClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initialMode = params.get("mode") as StudySpaceMode | null;
  const lessonId = params.get("lessonId") || undefined;
  const initialSubject = params.get("subject") || "";
  const [mode, setMode] = useState<StudySpaceMode>(initialMode && modes.some((item) => item.id === initialMode) ? initialMode : "workmate");
  const [subject, setSubject] = useState(initialSubject);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [canvasData, setCanvasData] = useState("");
  const [saved, setSaved] = useState(false);
  const [showCanvas, setShowCanvas] = useState(mode === "canvas");

  useEffect(() => {
    if (initialMode && modes.some((item) => item.id === initialMode)) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => setSubject(initialSubject), [initialSubject]);

  useEffect(() => {
    if (mode === "canvas") setShowCanvas(true);
  }, [mode]);

  const current = useMemo(() => modes.find((item) => item.id === mode)!, [mode]);

  async function save() {
    const now = new Date().toISOString();
    const work: WorkObject = {
      id: crypto.randomUUID(),
      mode,
      lessonId: mode === "lesson" ? lessonId : undefined,
      subject: subject.trim() || undefined,
      prompt: prompt.trim() || undefined,
      response: response.trim() || undefined,
      attachments: canvasData ? [canvasData] : undefined,
      createdAt: now,
      updatedAt: now,
    };
    await saveWorkObject(work);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <main style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--primary)" }}>SHADECODE</p>
          <h1 style={{ margin: "4px 0", fontSize: 32, fontWeight: 850 }}>StudySpace</h1>
          <p style={{ margin: 0, color: "var(--muted-foreground)" }}>One workspace for lessons, learning, working, practice, assessment and exams.</p>
        </div>
        <button onClick={() => router.back()} style={{ border: "1px solid var(--card-border)", background: "var(--muted)", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>Back</button>
      </header>

      <AdaptiveNextMove subject={subject.trim() || undefined} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 280px) 1fr", gap: 18 }}>
        <nav aria-label="StudySpace modes" style={{ display: "grid", gap: 8, alignContent: "start" }}>
          {modes.map((item) => (
            <button key={item.id} onClick={() => setMode(item.id)} aria-current={mode === item.id ? "page" : undefined} style={{ textAlign: "left", border: "1px solid var(--card-border)", borderRadius: 10, padding: 13, background: mode === item.id ? "var(--primary)" : "var(--card)", color: "var(--foreground)", cursor: "pointer" }}>
              <strong>{item.label}</strong>
              <span style={{ display: "block", fontSize: 12, marginTop: 4, opacity: 0.8 }}>{item.description}</span>
            </button>
          ))}
        </nav>

        <section style={{ border: "1px solid var(--card-border)", borderRadius: 14, padding: 20, background: "var(--card)" }} aria-label="StudySpace work surface">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0 }}>{current.label}</h2>
              <p style={{ margin: "5px 0 18px", color: "var(--muted-foreground)" }}>{current.description}</p>
            </div>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Saved locally</span>
          </div>

          {mode === "lesson" && lessonId && <p style={{ marginTop: 0, fontSize: 13, color: "var(--muted-foreground)" }}>Linked lesson: {lessonId}</p>}

          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Subject <span style={{ fontWeight: 400, color: "var(--muted-foreground)" }}>(optional)</span></label>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Any subject, or leave blank" style={{ width: "100%", boxSizing: "border-box", padding: 11, borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--muted)", color: "var(--foreground)", marginBottom: 14 }} />

          {mode !== "canvas" && <>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Question / task</label>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Paste a question, assignment, essay prompt, code problem, diagram task, or anything you are working on..." rows={7} style={{ width: "100%", boxSizing: "border-box", resize: "vertical", padding: 12, borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--muted)", color: "var(--foreground)", marginBottom: 14 }} />

            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Your work / answer</label>
            <textarea value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Write your answer, reasoning, working or notes here..." rows={8} style={{ width: "100%", boxSizing: "border-box", resize: "vertical", padding: 12, borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--muted)", color: "var(--foreground)", marginBottom: 14 }} />
          </>}

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: showCanvas ? 18 : 0 }}>
            <button onClick={save} style={{ border: 0, borderRadius: 8, padding: "11px 16px", background: "var(--primary)", color: "white", fontWeight: 750, cursor: "pointer" }}>Save work</button>
            {mode !== "canvas" && <button type="button" onClick={() => setShowCanvas((value) => !value)} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "10px 14px", background: "var(--muted)", color: "var(--foreground)", cursor: "pointer" }}>{showCanvas ? "Hide Canvas" : "Open Canvas"}</button>}
            <button onClick={() => router.push(`/workmate?mode=${mode}`)} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: "10px 14px", background: "var(--muted)", color: "var(--foreground)", cursor: "pointer" }}>Open Workmate</button>
            {saved && <span role="status" style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Saved offline ✓</span>}
          </div>

          {showCanvas && <StudyCanvas storageKey={`shadecode-canvas:${mode}:${subject.trim().toLowerCase() || "general"}`} onChange={setCanvasData} />}
        </section>
      </div>
    </main>
  );
}
