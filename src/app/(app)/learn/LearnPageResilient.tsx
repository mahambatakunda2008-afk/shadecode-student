"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { offlineStorage } from "@/lib/offline/storage";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { lessonViewedEvent } from "@/lib/intelligence/emitLearningEvent";
import { getGenerationJob, subscribeGenerationJobs, type GenerationJob } from "@/lib/cortex/generationJob";
import { resumeLessonGeneration, startLessonGeneration, type LessonGenerationInput } from "@/lib/cortex/lessonGenerationClient";
import PartialLessonPreview from "@/components/cortex/PartialLessonPreview";
import { AlertCircle, BookOpen, CheckCircle2, Loader2, RefreshCw, Sparkles, Target, Zap } from "lucide-react";
import type { LearnLesson, LearnSubject, LearnSummary } from "./types";

const AUTH_TIMEOUT = 3_000;
const LOCAL_TIMEOUT = 2_500;
const LOAD_TIMEOUT = 8_000;
const LAST_REQUEST_KEY = "shadecode:learn:last-request";
type ApiResponse = { subjects?: LearnSubject[]; lessons?: LearnLesson[]; summary?: LearnSummary; error?: string; id?: string };
type Mode = "guided" | "standard" | "challenge";
type LessonJob = GenerationJob<LessonGenerationInput>;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out")), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

async function readDeviceLessons(userId?: string): Promise<LearnLesson[]> {
  try {
    const rows = await withTimeout(offlineStorage.getAllLessons(), LOCAL_TIMEOUT);
    return await Promise.all(rows.map(async row => {
      const progress = userId ? await offlineStorage.getProgress(row.id, userId).catch(() => null) : null;
      return { id: row.id, title: row.title, subject: row.subject, subjectId: "", topic: row.title, description: row.description ?? "", difficulty: (row.difficulty === "hard" || row.difficulty === "medium" ? row.difficulty : "easy") as LearnLesson["difficulty"], progress: progress?.progress ?? row.progress ?? 0, completed: progress?.completed ?? row.completed ?? false };
    }));
  } catch { return []; }
}

export default function LearnPageResilient() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<LearnSubject[]>([]);
  const [lessons, setLessons] = useState<LearnLesson[]>([]);
  const [summary, setSummary] = useState<LearnSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<Mode>("guided");
  const [generationJob, setGenerationJob] = useState<LessonJob | null>(null);

  const examples = useMemo(() => {
    const name = subject.toLowerCase();
    if (name.includes("physics")) return ["Deformation of solids", "Moments and equilibrium", "Simple harmonic motion"];
    if (name.includes("math")) return ["Trigonometric identities", "Differentiation applications", "Binomial expansion"];
    if (name.includes("computer") || name.includes("computing")) return ["Binary search", "Data structures", "Recursion"];
    if (name.includes("chem")) return ["Bonding and structure", "Energetics", "Organic reactions"];
    return ["A topic from my syllabus", "A concept I keep getting wrong", "An exam-style topic I need to master"];
  }, [subject]);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const qSubject = params.get("subject")?.trim() ?? "";
    const qTopic = params.get("topic")?.trim() ?? "";
    if (qSubject || qTopic) { if (qSubject) setSubject(qSubject); if (qTopic) setTopic(qTopic); return; }
    try {
      const raw = localStorage.getItem(LAST_REQUEST_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { subject?: string; topic?: string; mode?: Mode };
      if (saved.subject) setSubject(saved.subject);
      if (saved.topic) setTopic(saved.topic);
      if (saved.mode === "guided" || saved.mode === "standard" || saved.mode === "challenge") setMode(saved.mode);
    } catch {}
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      let session: Session | null = null;
      try {
        const sb = (await import("@/lib/supabase/client")).createClient();
        const result = await Promise.race([sb.auth.getSession(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timed out")), AUTH_TIMEOUT))]);
        session = result.data.session;
        if (session && !cancelled) setToken(session.access_token);
      } catch {}
      const local = await readDeviceLessons(session?.user.id);
      if (cancelled) return;
      if (local.length) setLessons(local);
      setLoading(false);
      if (!navigator.onLine || !session) return;
      try { await load(session.access_token); } catch (e) { if (!cancelled && !local.length) setError(e instanceof Error ? e.message : "Cloud sync unavailable. Your device data remains available."); }
      const resumed = await resumeLessonGeneration(session.access_token);
      if (!cancelled && resumed) setGenerationJob(resumed as LessonJob);
    };
    void boot();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return subscribeGenerationJobs(() => {
      const activeId = localStorage.getItem("shadecode:cortex:lesson-runner:v1");
      if (activeId) {
        const active = getGenerationJob(activeId);
        if (active) setGenerationJob(active as LessonJob);
      }
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    const resume = () => { void resumeLessonGeneration(token).then(job => { if (job) setGenerationJob(job as LessonJob); }); };
    window.addEventListener("online", resume);
    if (navigator.onLine) resume();
    return () => window.removeEventListener("online", resume);
  }, [token]);

  useEffect(() => {
    if (generationJob?.status === "complete" && generationJob.result && typeof generationJob.result === "object" && "id" in generationJob.result) {
      const result = generationJob.result as { id: string; title: string };
      setLessons(current => current.some(item => item.id === result.id) ? current : [{ id: result.id, title: result.title, subject: generationJob.request.subject, subjectId: "", topic: generationJob.request.prompt, description: `A complete ${generationJob.request.difficulty} lesson on ${generationJob.request.prompt}`, difficulty: generationJob.request.difficulty, progress: 0, completed: false }, ...current]);
    }
  }, [generationJob]);

  async function load(tok: string) {
    const r = await fetchWithTimeout("/api/learn", { headers: { Authorization: `Bearer ${tok}` }, cache: "no-store" }, LOAD_TIMEOUT);
    const data = await r.json().catch(() => ({} as ApiResponse));
    if (!r.ok) throw new Error(data.error || `Learn sync failed (${r.status})`);
    setSubjects(data.subjects ?? []); setLessons(data.lessons ?? []); setSummary(data.summary ?? null);
    const syncedAt = new Date().toISOString();
    await Promise.all((data.lessons ?? []).map((lesson: LearnLesson) => offlineStorage.saveLesson({ id: lesson.id, title: lesson.title, subject: lesson.subject, description: lesson.description, difficulty: lesson.difficulty, progress: lesson.progress, completed: lesson.completed, downloadedAt: syncedAt, lastSyncedAt: syncedAt, size: JSON.stringify(lesson).length })));
  }

  async function generate() {
    const request = topic.trim();
    if (!subject || !request || generationJob?.status === "generating" || generationJob?.status === "warming") return;
    setError(null);
    localStorage.setItem(LAST_REQUEST_KEY, JSON.stringify({ subject, topic: request, mode }));
    const modeInstruction = mode === "guided" ? "Teach from first principles, using small steps and checks for understanding." : mode === "challenge" ? "Teach at exam level, include common traps, higher-order reasoning and a demanding worked example." : "Teach at a clear standard level, balancing explanation, worked examples and exam application.";
    const job = await startLessonGeneration({ prompt: request, subject, difficulty: mode === "guided" ? "easy" : mode === "challenge" ? "hard" : "medium", goal: modeInstruction }, token);
    setGenerationJob(job as LessonJob);
  }

  function openLesson(lesson: LearnLesson) { void lessonViewedEvent(lesson.id, lesson.subject, lesson.topic); router.push(`/learn/${lesson.id}`); }

  const generating = generationJob?.status === "queued" || generationJob?.status === "warming" || generationJob?.status === "generating" || generationJob?.status === "partial";
  const queuedOffline = generationJob?.status === "queued" && offline;
  const partialText = typeof generationJob?.partial === "object" && generationJob.partial && "text" in generationJob.partial ? String(generationJob.partial.text ?? "") : "";

  if (loading && lessons.length === 0) return <main className="grid min-h-[70vh] place-items-center bg-[var(--background)] text-[var(--muted-foreground)]"><Loader2 className="h-7 w-7 animate-spin" aria-label="Loading Learn" /></main>;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-7 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"><Sparkles className="h-4 w-4" /> Learn</div><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Tell Cortex what you want to learn.</h1><p className="mt-2 max-w-2xl text-[15px] leading-6 text-[var(--muted-foreground)]">Give Cortex the real request. Your context travels with it, so a short prompt is never silently turned into a different subject.</p></div>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${offline ? "bg-amber-400" : "bg-emerald-400"}`} /><span>{offline ? "Device-first mode" : "Ready to generate"}</span></div>
        </header>

        {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Something needs attention</p><p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">{error}</p></div>{token && !offline && <button type="button" onClick={() => void load(token).catch(e => setError(e instanceof Error ? e.message : "Cloud sync failed."))} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Retry</button>}</div>}

        {generationJob && generating && <div className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary-glow)] p-4" role="status" aria-live="polite"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--card)] text-[var(--primary)]"><Loader2 className="h-5 w-5 animate-spin" /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{queuedOffline ? "Cortex has your request" : generationJob.status === "warming" ? "Cortex is preparing your device" : "Cortex is building your lesson"}</p><p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">{queuedOffline ? "It is safely queued on this device and will resume automatically when you reconnect." : generationJob.status === "warming" ? "The teaching model is getting ready. You can keep using Shadecode." : "The lesson appears below as Cortex writes it. Generation is persisted on this device."}</p></div>{generationJob.status !== "generating" && generationJob.status !== "partial" && <span className="text-sm font-bold tabular-nums">{generationJob.progress}%</span>}</div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-500" style={{ width: `${generationJob.progress}%` }} /></div></div>}

        {generationJob?.status === "failed" && <div role="alert" className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"><p className="text-sm font-bold">Cortex could not finish this lesson.</p><p className="mt-1 text-sm text-[var(--muted-foreground)]">{generationJob.error || "Try again. Your previous lessons are safe."}</p><button type="button" onClick={() => void generate()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Try again</button></div>}

        {partialText && (generationJob?.status === "warming" || generationJob?.status === "generating" || generationJob?.status === "partial") && <PartialLessonPreview text={partialText} subject={generationJob.request.subject} prompt={generationJob.request.prompt} />}

        <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Target className="h-5 w-5" /></div><div><h2 className="text-xl font-bold">Your learning request</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Write the actual thing you want taught. Subject is context, not a replacement for your prompt.</p></div></div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
            <div><label className="mb-2 block text-sm font-semibold">Subject</label><select value={subject} onChange={e => setSubject(e.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-[15px] outline-none focus:border-[var(--primary)]"><option value="">Choose a subject</option>{subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select><p className="mt-2 text-sm text-[var(--muted-foreground)]">{subjects.length ? `${subjects.length} subjects available` : "Subjects will appear after sync."}</p></div>
            <div><label className="mb-2 block text-sm font-semibold">What do you want to learn?</label><textarea value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void generate(); }} rows={4} maxLength={500} placeholder="Example: Explain deformation of solids, then show me how to use stress, strain and Young modulus in an exam question." className="w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 text-[15px] leading-6 outline-none focus:border-[var(--primary)]" /><div className="mt-2 flex items-center justify-between text-sm text-[var(--muted-foreground)]"><span>Ctrl/⌘ + Enter to generate</span><span>{topic.length}/500</span></div></div>
          </div>
          <div className="mt-5"><p className="mb-2 text-sm font-semibold">Try a prompt</p><div className="flex flex-wrap gap-2">{examples.map(example => <button key={example} type="button" onClick={() => setTopic(example)} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium transition hover:border-[var(--primary)] hover:bg-[var(--primary-glow)]">{example}</button>)}</div></div>
          <div className="mt-6"><p className="mb-2 text-sm font-semibold">How should Cortex teach it?</p><div className="grid gap-2 sm:grid-cols-3">{([['guided','Guided','First principles, small steps, checks'],['standard','Standard','Clear explanation + exam application'],['challenge','Challenge','Harder reasoning, traps + exam pressure']] as const).map(([value,label,description]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`rounded-xl border p-3 text-left transition ${mode === value ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)] bg-[var(--surface)]"}`}><span className="text-sm font-bold">{label}</span><span className="mt-1 block text-sm leading-5 text-[var(--muted-foreground)]">{description}</span></button>)}</div></div>
          <button type="button" onClick={() => void generate()} disabled={!subject || !topic.trim() || generating} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-[15px] font-bold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{generating ? <><Loader2 className="h-5 w-5 animate-spin" /> {queuedOffline ? "Queued on this device" : "Building your lesson…"}</> : <><Zap className="h-5 w-5" /> Generate this lesson</>}</button>
          {offline && <p className="mt-3 text-sm font-medium text-[var(--muted-foreground)]">Generation requests are saved locally while offline. A true local generative model is not silently faked: the queued request runs when a connection is available.</p>}
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Your lessons</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Recent work stays available on this device.</p></div>{summary && <div className="text-right text-sm text-[var(--muted-foreground)]"><div className="font-semibold text-[var(--foreground)]">Level {summary.level}</div><div>{summary.currentXP} XP · {summary.currentStreak} day streak</div></div>}</div>
          {lessons.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-10 text-center"><BookOpen className="mx-auto h-9 w-9 text-[var(--muted-foreground)]" /><p className="mt-3 text-base font-semibold">No lessons on this device yet</p><p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">Your generated lessons will appear here and be cached for reading.</p></div> : <div className="grid gap-3 md:grid-cols-2">{lessons.slice(0, 10).map(l => <button key={l.id} type="button" onClick={() => openLesson(l)} className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--primary)]"><div className="flex items-start gap-3"><BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3 className="truncate text-[15px] font-bold">{l.title}</h3>{l.completed && <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--primary)]" />}</div><p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">{l.subject}</p><p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--muted-foreground)]">{l.description || "Continue this lesson."}</p><div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${l.progress}%` }} /></div><span className="text-sm font-semibold">{l.progress}%</span></div></div></div></button>)}</div>}
        </section>
      </div>
    </main>
  );
}
