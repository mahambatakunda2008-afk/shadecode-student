"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Camera, CheckCircle2, ImagePlus, Lightbulb, Loader2, RotateCcw, ShieldCheck, Sparkles, WifiOff, XCircle } from "lucide-react";
import { useCortexVerify, VerifyResult } from "@/hooks/useCortexVerify";
import { createClient } from "@/lib/supabase/client";
import { getAll } from "@/lib/offline/cortex-queue";

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
  "English", "History", "Geography", "Economics", "Business Studies",
  "Accounting", "Literature", "French", "Shona", "Languages", "Engineering",
  "Medicine", "Law", "Other",
] as const;

function StatusIcon({ status }: { status: string }) {
  const value = status.toLowerCase();
  if (value === "correct") return <CheckCircle2 size={17} aria-hidden />;
  if (value === "partial") return <AlertTriangle size={17} aria-hidden />;
  return <XCircle size={17} aria-hidden />;
}

function ResultCard({ result, onRetry, onHelp }: { result: VerifyResult; onRetry: () => void; onHelp: () => void }) {
  if (result.needsRetake) {
    return <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5" /><div><h3 className="font-bold">I need a clearer look</h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">{result.retakeReason || "The image was not clear enough to verify fairly."}</p></div></div>
      <button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white"><RotateCcw size={16} /> Retake photo</button>
    </div>;
  }

  const correct = result.correct === true;
  const partial = !correct && typeof result.score === "number" && result.score > 0;
  const label = correct ? "Correct" : partial ? "Almost there" : "Needs another look";

  return <div className="overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm">
    <div className="border-b border-[var(--card-border)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3"><div className="rounded-2xl bg-[var(--primary-glow)] p-2.5"><StatusIcon status={correct ? "correct" : partial ? "partial" : "incorrect"} /></div><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Cortex assessment</p><h3 className="mt-1 text-2xl font-black tracking-tight">{label}</h3></div></div>
        {typeof result.score === "number" && <div className="text-right"><div className="text-3xl font-black">{Math.round(result.score)}%</div><p className="text-xs text-[var(--muted-foreground)]">estimated score</p></div>}
      </div>
      {result.cortexInsight && <p className="mt-5 rounded-2xl bg-[var(--muted)] p-4 text-sm leading-6">{result.cortexInsight}</p>}
    </div>
    {result.steps?.length ? <div className="p-5 sm:p-6"><h4 className="font-bold">Step-by-step check</h4><div className="mt-4 space-y-3">{result.steps.map((step, index) => <div key={`${index}-${step.description}`} className="flex gap-3 rounded-2xl border border-[var(--card-border)] p-3.5"><div className="mt-0.5"><StatusIcon status={step.status} /></div><div className="min-w-0"><p className="text-sm font-semibold">Step {index + 1}</p><p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{step.description}</p>{step.note && <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{step.note}</p>}</div></div>)}</div></div> : null}
    {result.feedback && <div className="border-t border-[var(--card-border)] p-5 sm:p-6"><h4 className="font-bold">What to improve</h4><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{result.feedback}</p></div>}
    {(result.hint || result.method || result.solution || result.content) && <div className="border-t border-[var(--card-border)] p-5 sm:p-6"><div className="flex items-center gap-2 font-bold"><Lightbulb size={17} /> Cortex guidance</div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--muted-foreground)]">{result.hint || result.method || result.solution || result.content}</p></div>}
    <div className="flex flex-wrap gap-2 border-t border-[var(--card-border)] p-5 sm:p-6">
      <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-bold"><RotateCcw size={16} /> Try again</button>
      <button onClick={onHelp} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white">Ask Cortex <ArrowRight size={16} /></button>
    </div>
  </div>;
}

export default function CortexVerifyPanel() {
  const [mode, setMode] = useState<"check" | "help">("check");
  const [helpLevel, setHelpLevel] = useState<"hint" | "method" | "solution">("hint");
  const [subject, setSubject] = useState<string>("Mathematics");
  const [question, setQuestion] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [image, setImage] = useState<File>();
  const [preview, setPreview] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { result, loading, error, check, help } = useCortexVerify();

  const refreshOfflineState = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id || null;
      setUserId(id);
      if (id) setQueueCount((await getAll(id)).length);
    } catch { /* UI remains usable */ }
  };

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    void refreshOfflineState();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const timer = window.setInterval(() => void refreshOfflineState(), 15000);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); window.clearInterval(timer); };
  }, []);

  const onFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 4 * 1024 * 1024) return;
    setImage(file);
    const reader = new FileReader();
    reader.onload = (event) => setPreview(String(event.target?.result || ""));
    reader.readAsDataURL(file);
  };

  const clearImage = () => { setImage(undefined); setPreview(null); if (fileRef.current) fileRef.current.value = ""; };
  const reset = () => { setQuestion(""); setStudentAnswer(""); clearImage(); };
  const submit = async () => mode === "check"
    ? await check({ mode: "check", subject, question, studentAnswer, image })
    : await help({ mode: "help", subject, question, level: helpLevel, image });

  return <section className="space-y-5">
    <div className="rounded-[2rem] border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] px-3 py-1.5 text-xs font-bold"><Sparkles size={14} /> WORKMATE</div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">Check your thinking.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">Show Workmate your question and working. It can check reasoning, point out mistakes, explain difficult steps, and help you learn across subjects.</p></div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]"><span className={`h-2 w-2 rounded-full ${online ? "bg-[var(--primary)]" : "bg-[var(--danger)]"}`} />{online ? "Online" : "Offline"}{queueCount > 0 && <span>· {queueCount} saved</span>}</div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--muted)] p-1.5">
        <button onClick={() => setMode("check")} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${mode === "check" ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]"}`}>Check my work</button>
        <button onClick={() => setMode("help")} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${mode === "help" ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]"}`}>Help me solve</button>
      </div>
    </div>

    <div className="rounded-[2rem] border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <label className="text-sm font-bold">Subject<select value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted)] px-3 py-3 text-sm font-medium outline-none">{SUBJECTS.map((item) => <option key={item}>{item}</option>)}</select></label>
        {mode === "help" && <label className="text-sm font-bold">Help level<select value={helpLevel} onChange={(e) => setHelpLevel(e.target.value as typeof helpLevel)} className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted)] px-3 py-3 text-sm font-medium outline-none"><option value="hint">Give me a hint</option><option value="method">Show me the method</option><option value="solution">Full solution</option></select></label>}
      </div>
      <label className="mt-5 block text-sm font-bold">Question <span className="font-normal text-[var(--muted-foreground)]">{mode === "check" ? "optional when your photo contains it" : ""}</span><textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder="Paste or type the question here…" className="mt-2 w-full resize-y rounded-2xl border border-[var(--card-border)] bg-[var(--muted)] p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-[var(--primary)]/30" /></label>
      {mode === "check" && <label className="mt-4 block text-sm font-bold">Your answer / working <textarea value={studentAnswer} onChange={(e) => setStudentAnswer(e.target.value)} rows={5} placeholder="Show your working or type your answer…" className="mt-2 w-full resize-y rounded-2xl border border-[var(--card-border)] bg-[var(--muted)] p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-[var(--primary)]/30" /></label>}
      <div className="mt-5 rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--muted)]/50 p-4">
        {preview ? <div><div className="relative overflow-hidden rounded-xl"><img src={preview} alt="Preview of submitted schoolwork" className="max-h-80 w-full object-contain bg-[var(--card)]" /></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => fileRef.current?.click()} className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-xs font-bold">Replace image</button><button onClick={clearImage} className="rounded-xl px-3 py-2 text-xs font-bold text-[var(--danger)]">Remove</button></div></div> : <div className="flex flex-col items-center justify-center py-6 text-center"><div className="mb-3 rounded-2xl bg-[var(--card)] p-3 shadow-sm"><ImagePlus size={22} /></div><p className="text-sm font-bold">Add a photo of your work</p><p className="mt-1 max-w-sm text-xs leading-5 text-[var(--muted-foreground)]">Good lighting, the whole question, and all working visible gives Workmate the best chance of checking fairly.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--card)] px-3.5 py-2.5 text-xs font-bold shadow-sm"><Camera size={15} /> Camera / photo</button></div></div>}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} className="hidden" />
      </div>
      {!online && <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--muted)] p-4"><WifiOff size={18} className="mt-0.5 shrink-0" /><div><p className="text-sm font-bold">Offline mode</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Your submission can be saved to this account and retried automatically when you reconnect.</p></div></div>}
      {error && <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--card-border)] p-4 text-sm"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button onClick={reset} disabled={loading} className="rounded-xl px-4 py-3 text-sm font-bold text-[var(--muted-foreground)]">Clear</button>
        <button onClick={() => void submit()} disabled={loading || !userId || (mode === "check" ? (!question && !studentAnswer && !image) : (!question && !image))} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">{loading ? <><Loader2 size={17} className="animate-spin" /> Workmate is checking…</> : mode === "check" ? <>Check my work <ArrowRight size={17} /></> : <>Help me <Lightbulb size={17} /></>}</button>
      </div>
      {!userId && <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">Sign in to use Workmate and keep your offline work private.</p>}
      <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[var(--muted-foreground)]"><ShieldCheck size={13} /> Your offline submissions stay scoped to your account.</div>
    </div>
    {result && <ResultCard result={result} onRetry={() => { setMode("check"); }} onHelp={() => { setMode("help"); }} />}
  </section>;
}
