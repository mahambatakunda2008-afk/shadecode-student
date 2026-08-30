"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { StudySpaceMode, WorkObject } from "@/lib/studyspace/types";
import { saveWorkObject } from "@/lib/studyspace/store";
import AdaptiveNextMove from "@/components/studyspace/AdaptiveNextMove";
import StudyCanvasViewport from "@/components/studyspace/StudyCanvasViewport";
import { Calculator } from "@/components/tools/Calculator";

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
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => { if (initialMode && modes.some((item) => item.id === initialMode)) setMode(initialMode); }, [initialMode]);
  useEffect(() => setSubject(initialSubject), [initialSubject]);
  useEffect(() => { if (mode === "canvas") setShowCanvas(true); }, [mode]);
  const current = useMemo(() => modes.find((item) => item.id === mode)!, [mode]);

  async function save() {
    const now = new Date().toISOString();
    const work: WorkObject = { id: crypto.randomUUID(), mode, lessonId: mode === "lesson" ? lessonId : undefined, subject: subject.trim() || undefined, prompt: prompt.trim() || undefined, response: response.trim() || undefined, attachments: canvasData ? [canvasData] : undefined, createdAt: now, updatedAt: now };
    try { await saveWorkObject(work); setSaved(true); window.setTimeout(() => setSaved(false), 1800); } catch { setSaved(false); }
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="m-0 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--primary)]">SHADECODE</p><h1 className="m-1 text-3xl font-black tracking-tight">StudySpace</h1><p className="m-0 text-sm text-[var(--muted-foreground)]">One workspace for lessons, learning, working, practice, assessment and exams.</p></div>
        <button onClick={() => router.back()} className="self-start rounded-xl border border-[var(--card-border)] bg-[var(--muted)] px-3 py-2 text-sm">Back</button>
      </header>
      <AdaptiveNextMove subject={subject.trim() || undefined} />
      <div className="mt-5 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="StudySpace modes" className="grid content-start gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {modes.map((item) => <button key={item.id} onClick={() => setMode(item.id)} aria-current={mode === item.id ? "page" : undefined} className={`rounded-xl border p-3 text-left transition ${mode === item.id ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]"}`}><strong className="text-sm">{item.label}</strong><span className="mt-1 block text-xs opacity-80">{item.description}</span></button>)}
        </nav>
        <section className="min-w-0 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5" aria-label="StudySpace work surface">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="m-0 text-xl font-black">{current.label}</h2><p className="m-1 text-sm text-[var(--muted-foreground)]">{current.description}</p></div><span className="text-xs text-[var(--muted-foreground)]">{saved ? "Saved ✓" : "Local-first workspace"}</span></div>
          {mode === "lesson" && lessonId && <p className="text-xs text-[var(--muted-foreground)]">Linked lesson: {lessonId}</p>}
          <label className="mt-4 block text-sm font-bold">Subject <span className="font-normal text-[var(--muted-foreground)]">(optional)</span><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Any subject, or leave blank" className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted)] p-3 text-sm text-[var(--foreground)] outline-none" /></label>
          {mode !== "canvas" && <><label className="mt-4 block text-sm font-bold">Question / task<textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Paste a question, assignment, essay prompt, code problem, diagram task, or anything you are working on..." rows={6} className="mt-2 w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--muted)] p-3 text-sm text-[var(--foreground)] outline-none" /></label><label className="mt-4 block text-sm font-bold">Your work / answer<textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Write your answer, reasoning, working or notes here..." rows={7} className="mt-2 w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--muted)] p-3 text-sm text-[var(--foreground)] outline-none" /></label></>}
          <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void save()} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white">Save work</button>{mode !== "canvas" && <button type="button" onClick={() => setShowCanvas((v) => !v)} className="rounded-xl border border-[var(--card-border)] bg-[var(--muted)] px-3 py-2.5 text-sm">{showCanvas ? "Hide Canvas" : "Open Canvas"}</button>}<button type="button" onClick={() => setShowCalculator((v) => !v)} aria-expanded={showCalculator} className="rounded-xl border border-[var(--card-border)] bg-[var(--muted)] px-3 py-2.5 text-sm">{showCalculator ? "Hide Calculator" : "Open Calculator"}</button><button onClick={() => router.push(`/workmate?mode=${mode}`)} className="rounded-xl border border-[var(--card-border)] bg-[var(--muted)] px-3 py-2.5 text-sm">Open Workmate</button></div>
          {showCalculator && <div className="mt-4"><Calculator /></div>}
          {showCanvas && <div className="mt-4 min-w-0"><StudyCanvasViewport storageKey={`shadecode-canvas:${mode}:${subject.trim().toLowerCase() || "general"}`} onChange={setCanvasData} /></div>}
        </section>
      </div>
    </main>
  );
}
