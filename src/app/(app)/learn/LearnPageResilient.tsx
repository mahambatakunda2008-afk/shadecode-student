"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { offlineStorage } from "@/lib/offline/storage";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { lessonViewedEvent } from "@/lib/intelligence/emitLearningEvent";
import { getGenerationJob, subscribeGenerationJobs, type GenerationJob } from "@/lib/cortex/generationJob";
import { hasCompletedLessonCheckpoint } from "@/lib/cortex/lessonCheckpoint";
import { resumeLessonGeneration, retryLessonGeneration, startLessonGeneration, type LessonGenerationInput } from "@/lib/cortex/lessonGenerationClient";
import { AlertCircle, ArrowRight, BookOpen, CheckCircle2, Compass, GraduationCap, Loader2, RefreshCw, Sparkles, Target, Wifi, WifiOff, Zap, Flame, BrainCircuit, ChevronRight, CirclePlay, NotebookPen, ShieldCheck } from "lucide-react";
import type { LearnLesson, LearnSubject, LearnSummary } from "./types";
import PaperStudyLauncher from "./PaperStudyLauncher";
import LearnBrainStatus from "./LearnBrainStatus";
import ShadeNetKnowledgeSearch from "./ShadeNetKnowledgeSearch";

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
    promise.then(v => { clearTimeout(timer); resolve(v); }, e => { clearTimeout(timer); reject(e); });
  });
}

async function readDeviceLessons(userId?: string): Promise<LearnLesson[]> {
  try {
    const rows = await withTimeout(offlineStorage.getAllLessons(), LOCAL_TIMEOUT);
    return await Promise.all(rows.map(async row => {
      const progress = userId ? await offlineStorage.getProgress(row.id, userId).catch(() => null) : null;
      return {
        id: row.id, title: row.title, subject: row.subject, subjectId: "", topic: row.title,
        description: row.description ?? "",
        difficulty: (row.difficulty === "hard" || row.difficulty === "medium" ? row.difficulty : "easy") as LearnLesson["difficulty"],
        progress: progress?.progress ?? row.progress ?? 0,
        completed: progress?.completed ?? row.completed ?? false,
      };
    }));
  } catch { return []; }
}

const QUICK_STARTS = [
  { title: "Teach me from zero", prompt: "Teach me this topic from first principles. Define every important term, explain why each step works, show a fully worked example, then test me.", icon: GraduationCap },
  { title: "Fix what I keep getting wrong", prompt: "Help me understand the common mistakes in this topic. Diagnose likely misconceptions, explain the correct reasoning, then give me practice questions.", icon: Target },
  { title: "Prepare me for exam questions", prompt: "Teach this topic to Cambridge exam standard. Include essential definitions, derivations where relevant, a worked exam-style question, mark-scheme reasoning, and a short test.", icon: NotebookPen },
];

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
  const [showAllLessons, setShowAllLessons] = useState(false);
  const openedJobRef = useRef<string | null>(null);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const qSubject = params.get("subject")?.trim() ?? "";
    const qTopic = params.get("topic")?.trim() ?? "";
    if (qSubject || qTopic) {
      if (qSubject) setSubject(qSubject);
      if (qTopic) setTopic(qTopic);
      return;
    }
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
      let authTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        const sb = (await import("@/lib/supabase/client")).createClient();
        const result = await Promise.race([
          sb.auth.getSession(),
          new Promise<never>((_, reject) => {
            authTimer = setTimeout(() => reject(new Error("AUTH_SESSION_TIMEOUT")), AUTH_TIMEOUT);
          }),
        ]);
        if (result.error) throw result.error;
        session = result.data.session;
        if (session && !cancelled) setToken(session.access_token);
      } catch (authFailure) {
        console.error("[Learn] could not restore the current session:", authFailure);
        if (!cancelled) {
          setError("Your learning space could not verify your session. Try again to reconnect before starting a new lesson. Lessons saved on this device remain available.");
        }
      } finally {
        if (authTimer) clearTimeout(authTimer);
      }
      const local = await readDeviceLessons(session?.user.id);
      if (cancelled) return;
      if (local.length) setLessons(local);
      setLoading(false);
      if (!navigator.onLine || !session) return;
      try { await load(session.access_token); }
      catch (e) {
        if (!cancelled && !local.length) setError(e instanceof Error ? e.message : "Cloud sync unavailable. Lessons saved on this device remain available.");
      }
      const resumed = await resumeLessonGeneration(session.access_token);
      if (!cancelled && resumed) setGenerationJob(resumed as LessonJob);
    };
    void boot();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => subscribeGenerationJobs(() => {
    const activeId = localStorage.getItem("shadecode:cortex:lesson-runner:v1");
    if (activeId) {
      const active = getGenerationJob(activeId);
      if (active) setGenerationJob(active as LessonJob);
    }
  }), []);

  useEffect(() => {
    if (!token) return;
    const resume = () => {
      void resumeLessonGeneration(token).then(job => { if (job) setGenerationJob(job as LessonJob); }).catch(() => undefined);
    };
    window.addEventListener("online", resume);
    if (navigator.onLine) resume();
    return () => window.removeEventListener("online", resume);
  }, [token]);

  useEffect(() => {
    if (generationJob?.status !== "complete" || !generationJob.result || typeof generationJob.result !== "object" || !("id" in generationJob.result)) return;
    const result = generationJob.result as { id: string; title: string };
    setLessons(current => current.some(item => item.id === result.id) ? current : [{
      id: result.id, title: result.title, subject: generationJob.request.subject, subjectId: "",
      topic: generationJob.request.prompt, description: `A complete ${generationJob.request.difficulty} lesson on ${generationJob.request.prompt}`,
      difficulty: generationJob.request.difficulty, progress: 0, completed: false,
    }, ...current]);
    if (openedJobRef.current !== generationJob.id) {
      openedJobRef.current = generationJob.id;
      void lessonViewedEvent(result.id, generationJob.request.subject, generationJob.request.prompt);
      router.replace(`/learn/${result.id}`);
    }
  }, [generationJob, router]);

  async function load(tok: string) {
    const r = await fetchWithTimeout("/api/learn", { headers: { Authorization: `Bearer ${tok}` }, cache: "no-store" }, LOAD_TIMEOUT);
    const data = await r.json().catch(() => ({} as ApiResponse));
    if (!r.ok) throw new Error(data.error || `Learn sync failed (${r.status})`);
    setSubjects(data.subjects ?? []);
    setLessons(data.lessons ?? []);
    setSummary(data.summary ?? null);
    const syncedAt = new Date().toISOString();
    await Promise.all((data.lessons ?? []).map((lesson: LearnLesson) => offlineStorage.saveLesson({
      id: lesson.id, title: lesson.title, subject: lesson.subject, description: lesson.description,
      difficulty: lesson.difficulty, progress: lesson.progress, completed: lesson.completed,
      downloadedAt: syncedAt, lastSyncedAt: syncedAt, size: JSON.stringify(lesson).length,
    })));
  }

  async function generate() {
    const request = topic.trim();
    if (!subject || !request || ["queued", "warming", "generating", "partial"].includes(generationJob?.status ?? "")) return;
    setError(null);
    localStorage.setItem(LAST_REQUEST_KEY, JSON.stringify({ subject, topic: request, mode }));
    const modeInstruction = mode === "guided"
      ? "Teach from first principles, define terms, show each step, and include checks for understanding."
      : mode === "challenge"
        ? "Teach at exam level, include common traps, higher-order reasoning, a demanding worked example and exam-style practice."
        : "Teach clearly and thoroughly, balancing conceptual explanation, derivations where relevant, worked examples and exam application.";
    try {
      const job = await startLessonGeneration({
        prompt: request, subject,
        difficulty: mode === "guided" ? "easy" : mode === "challenge" ? "hard" : "medium",
        goal: modeInstruction,
      }, token);
      setGenerationJob(job as LessonJob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cortex could not start this learning session.");
    }
  }

  function openLesson(lesson: LearnLesson) {
    void lessonViewedEvent(lesson.id, lesson.subject, lesson.topic);
    router.push(`/learn/${lesson.id}`);
  }

  const isGenerating = ["queued", "warming", "generating", "partial"].includes(generationJob?.status ?? "");
  const queuedOffline = generationJob?.status === "queued" && offline;
  const generationLabel = generationJob?.status === "queued"
    ? (queuedOffline ? "Waiting for connection" : "In the queue")
    : generationJob?.status === "warming" ? "Preparing your session"
      : generationJob?.status === "generating" ? "Building your lesson"
        : generationJob?.status === "partial" ? "Progress saved"
          : generationJob?.status === "complete" ? "Lesson ready"
            : generationJob?.status === "failed" ? "This attempt stopped" : "Ready";
  const generationDetail = generationJob?.status === "queued"
    ? (queuedOffline ? "Your request is saved on this device and will resume when you reconnect." : "Your request is queued. You can keep this page open or come back.")
    : generationJob?.status === "warming" ? "Cortex is preparing the available learning tools."
      : generationJob?.status === "generating" ? (generationJob.error || "The lesson is being assembled and checked.")
        : generationJob?.status === "partial" ? "Completed sections are checkpointed. Your work will not be thrown away."
          : generationJob?.status === "failed" ? (generationJob.error || "The attempt stopped before a complete lesson was ready.") : "";

  const visibleLessons = useMemo(() => {
    const unique = new Map<string, LearnLesson>();
    for (const lesson of lessons) {
      const key = `${lesson.subject.toLowerCase()}::${lesson.title.trim().toLowerCase()}`;
      if (!unique.has(key)) unique.set(key, lesson);
    }
    return [...unique.values()];
  }, [lessons]);
  const completedCount = visibleLessons.filter(l => l.completed).length;
  const averageProgress = visibleLessons.length ? Math.round(visibleLessons.reduce((sum, l) => sum + l.progress, 0) / visibleLessons.length) : 0;
  const displayedLessons = showAllLessons ? visibleLessons : visibleLessons.slice(0, 4);

  if (loading && lessons.length === 0) {
    return <main className="min-h-[70vh] bg-[var(--background)] px-5 py-10 dark:bg-[var(--background)]" aria-busy="true">
      <div className="mx-auto max-w-7xl animate-pulse space-y-5">
        <div className="h-5 w-36 rounded-full bg-[var(--surface-2)] dark:bg-[var(--surface-2)]" />
        <div className="h-12 w-3/5 rounded-2xl bg-[var(--surface-2)] dark:bg-[var(--surface-2)]" />
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]"><div className="h-80 rounded-[28px] bg-[var(--surface-2)] dark:bg-[var(--surface-2)]" /><div className="h-80 rounded-[28px] bg-[var(--surface-2)] dark:bg-[var(--surface-2)]" /></div>
      </div>
    </main>;
  }

  return (
    <main data-page="learn" className="min-h-screen bg-[var(--background)] text-[var(--foreground)] dark:bg-[var(--background)] dark:text-[var(--foreground)]">
      <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-8">
        <header className="mb-7 flex flex-col justify-between gap-5 border-b border-[var(--card-border)] pb-6 dark:border-[var(--card-border)] sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--card-border)] text-[var(--primary)]"><BrainCircuit size={16} /></span> Shadecode Student / Learn</div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-[48px]">Make the hard stuff <span className="text-[var(--primary)] dark:text-[var(--primary)]">click.</span></h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)] sm:text-base">A learning workspace that remembers what you’re working on, teaches the idea clearly, then makes you prove you understand it.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm font-medium dark:border-[var(--card-border)] dark:bg-[var(--surface-2)]">
              {offline ? <WifiOff size={16} className="text-amber-600" /> : <Wifi size={16} className="text-[var(--success)]" />}
              <span>{offline ? "Offline mode" : "Workspace ready"}</span>
            </div>
            <PaperStudyLauncher />
          </div>
        </header>

        {(error || offline) && <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{offline ? "You’re working offline" : "Learn needs attention"}</p><p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]">{error || "Saved lessons remain available on this device. New cloud generation will resume when you reconnect."}</p></div>
          {token && !offline && <button type="button" onClick={() => void load(token).catch(e => setError(e instanceof Error ? e.message : "Cloud sync failed."))} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm font-semibold dark:border-[var(--card-border)] dark:bg-[var(--surface-2)]"><RefreshCw size={16} /> Sync</button>}
        </div>}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <section className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm">
            <div className="relative p-5 sm:p-7 lg:p-8">
              <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-[var(--card-border)]" />
              <div className="pointer-events-none absolute -right-1 -top-8 h-44 w-44 rounded-full border border-[var(--border-subtle)]" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Your next learning session</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">What are we untangling?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">Start with the exact topic. Cortex should explain the why, work through examples, and check your understanding.</p></div>
                <span className="hidden h-12 w-12 place-items-center rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] text-[var(--primary)] sm:grid"><Sparkles size={23} /></span>
              </div>

              <div className="relative mt-7 grid gap-4">
                <div>
                  <label htmlFor="learn-subject" className="mb-2 block text-xs font-bold uppercase tracking-[0.13em] text-[var(--muted-foreground)]">01 / Subject</label>
                  <select id="learn-subject" value={subject} onChange={e => setSubject(e.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-4 text-[15px] text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20">
                    <option value="" className="text-black">Choose your subject</option>
                    {subjects.map(s => <option key={s.id} value={s.name} className="text-black">{s.name}</option>)}
                  </select>
                  {!subjects.length && <p className="mt-2 text-xs text-[var(--muted-foreground)]">Subject list is not synced yet. Reconnect or refresh your profile.</p>}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="learn-topic" className="block text-xs font-bold uppercase tracking-[0.13em] text-[var(--muted-foreground)]">02 / Topic or problem</label><span className="text-[11px] text-[var(--muted-foreground)]">{topic.length}/500</span></div>
                  <textarea id="learn-topic" value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void generate(); }} rows={3} maxLength={500} placeholder="e.g. Coordinate geometry: circles, completing the square, and exam questions…" className="w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-4 py-3.5 text-[15px] leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20" />
              <div className="relative mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => void generate()} disabled={!subject || !topic.trim() || isGenerating} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-45">
                  {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Working on your lesson</> : <><Zap size={18} /> Start learning <ArrowRight size={16} /></>}
                </button>
                <span className="text-xs text-[var(--muted-foreground)]">Your topic is saved while you work. Ctrl/⌘ + Enter to start.</span>
              </div>
                  <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">Tip: tell it where you get stuck, not just the chapter name.</p>
                </div>
              </div>

              <div className="relative mt-6">
                <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.13em] text-[var(--muted-foreground)]">03 / How should I teach it?</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([
                    ["guided", "Build the basics", "First principles, slow steps"],
                    ["standard", "Learn + apply", "Explanations and worked examples"],
                    ["challenge", "Exam pressure", "Traps, reasoning, hard questions"],
                  ] as const).map(([value, label, description], index) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`rounded-xl border p-3 text-left transition ${mode === value ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]" : "border-[var(--card-border)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--interactive-hover)]"}`}><span className="flex items-center justify-between gap-2 text-sm font-semibold"><span>{label}</span>{mode === value && <CheckCircle2 size={16} />}</span><span className={`mt-1.5 block text-xs leading-5 ${mode === value ? "text-[var(--primary-foreground)]" : "text-[var(--muted-foreground)]"}`}>{description}</span></button>)}
                </div>
              </div>

            </div>
            <div className="grid grid-cols-3 divide-x divide-[var(--card-border)] border-t border-[var(--card-border)] bg-[var(--surface-2)]">
              <div className="px-4 py-3.5 sm:px-6"><p className="text-xl font-semibold text-[var(--primary)]">{visibleLessons.length}</p><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">Lessons saved</p></div>
              <div className="px-4 py-3.5 sm:px-6"><p className="text-xl font-semibold text-[var(--primary)]">{completedCount}</p><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">Completed</p></div>
              <div className="px-4 py-3.5 sm:px-6"><p className="text-xl font-semibold text-[var(--primary)]">{summary?.currentStreak ?? 0}<span className="ml-1 text-sm">days</span></p><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">Current streak</p></div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[24px] border border-[var(--card-border)] bg-[var(--surface)] p-5 shadow-sm dark:border-[var(--card-border)] dark:bg-[var(--surface)] sm:p-6">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)] dark:text-[var(--primary)]">A good place to begin</p><h2 className="mt-1.5 text-xl font-semibold tracking-tight">Choose your mission</h2></div><Compass size={20} className="mt-1 text-[var(--muted-foreground)]" /></div>
              <div className="mt-4 space-y-2">
                {QUICK_STARTS.map(({ title, prompt, icon: Icon }) => <button key={title} type="button" onClick={() => setTopic(current => current.trim() ? `${current.trim()}\n\nTeaching approach: ${prompt}` : prompt)} className="group flex w-full items-start gap-3 rounded-xl border border-[var(--card-border)] p-3 text-left transition hover:border-[var(--primary)]/50 hover:bg-[var(--interactive-hover)] dark:border-[var(--card-border)] dark:hover:bg-[var(--interactive-hover)]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--primary-glow)] text-[var(--primary)] dark:bg-[var(--surface-2)] dark:text-[var(--primary)]"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]">{title === "Teach me from zero" ? "Start with the idea, not memorisation." : title === "Fix what I keep getting wrong" ? "Find the misconception behind the mistake." : "Definitions, worked solutions, and exam practice."}</span></span><ChevronRight size={16} className="mt-2 shrink-0 text-[var(--muted-foreground)] transition group-hover:translate-x-0.5" /></button>)}
              </div>
            </section>

            <section className="rounded-[24px] border border-[var(--card-border)] bg-[var(--surface-2)] p-5 dark:border-[var(--card-border)] dark:bg-[var(--surface-2)] sm:p-6">
              <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary-glow)] text-[var(--primary)] dark:bg-[var(--surface-2)] dark:text-[var(--primary)]"><Flame size={18} /></span><div><p className="text-xs font-semibold uppercase tracking-[0.13em] text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]">Your momentum</p><h2 className="text-lg font-semibold">Small wins add up.</h2></div></div>
              <div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-3xl font-semibold tracking-tight">{averageProgress}<span className="ml-1 text-base font-medium text-[var(--muted-foreground)]">%</span></p><p className="mt-1 text-xs text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]">Average lesson progress</p></div><div className="text-right"><p className="text-lg font-semibold">{summary?.currentXP ?? 0} XP</p><p className="text-xs text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]">Level {summary?.level ?? 1}</p></div></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-2)] dark:bg-[var(--surface-3)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${averageProgress}%` }} /></div>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--primary)]" /> Lessons you open and finish help Learn remember what to revisit next.</p>
            </section>
          </aside>
        </div>

        <div className="mt-6"><ShadeNetKnowledgeSearch /></div>

        {generationJob && <section className={`mt-6 rounded-[22px] border p-4 sm:p-5 ${generationJob.status === "failed" ? "border-rose-500/25 bg-rose-500/[0.045]" : "border-[var(--primary)]/30 bg-[var(--surface)] dark:bg-[var(--surface)]"}`} role={generationJob.status === "failed" ? "alert" : "status"} aria-live="polite">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${generationJob.status === "failed" ? "bg-rose-500/10 text-rose-600" : "bg-[var(--primary-glow)] text-[var(--primary)] dark:bg-[var(--surface-2)] dark:text-[var(--primary)]"}`}>{generationJob.status === "failed" ? <AlertCircle size={20} /> : generationJob.status === "complete" ? <CheckCircle2 size={20} /> : queuedOffline ? <WifiOff size={20} /> : isGenerating ? <Loader2 size={20} className="animate-spin" /> : <CirclePlay size={20} />}</div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{generationLabel}</h2><span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] dark:bg-[var(--surface-3)] dark:text-[var(--muted-foreground)]">Run {generationJob.id.slice(0, 8)}</span></div><p className="mt-1.5 text-sm leading-6 text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]">{generationDetail}</p>
              {isGenerating && <div className="mt-4"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]">Session progress</span><span className="font-bold tabular-nums">{generationJob.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)] dark:bg-[var(--surface-3)]"><div className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, generationJob.progress))}%` }} /></div></div>}
              {generationJob.status === "failed" && <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => { void (async () => { const resumed = await retryLessonGeneration(generationJob.id, token); if (resumed) setGenerationJob(resumed as LessonJob); else await generate(); })(); }} disabled={!subject || !topic.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--primary-hover)] disabled:opacity-50"><RefreshCw size={16} /> {hasCompletedLessonCheckpoint(generationJob.partial) ? "Resume from checkpoint" : "Retry lesson"}</button><button type="button" onClick={() => { setTopic(""); setGenerationJob(null); }} className="inline-flex min-h-10 items-center rounded-xl border border-[var(--card-border)] px-4 text-sm font-semibold dark:border-[var(--card-border)]">Change topic</button></div>}
            </div>
            <button type="button" aria-label="Dismiss generation status" onClick={() => setGenerationJob(null)} className="self-end rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--surface-2)] dark:hover:bg-[var(--interactive-hover)] sm:self-start"><span className="text-xs font-semibold">Dismiss</span></button>
          </div>
        </section>}

        <section className="mt-9">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--muted-foreground)] dark:text-[var(--primary)]">Your library</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Pick up where you left off.</h2><p className="mt-1 text-sm text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]">Your recent lessons, including the ones saved on this device.</p></div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold dark:border-[var(--card-border)] dark:bg-[var(--surface-2)]"><BookOpen size={14} /> {visibleLessons.length} lessons</span>
          </div>
          {visibleLessons.length === 0 ? <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-5 py-12 text-center dark:border-[var(--card-border)] dark:bg-[var(--surface-2)]"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)] dark:bg-[var(--surface-2)] dark:text-[var(--primary)]"><BookOpen size={22} /></span><h3 className="mt-4 text-lg font-semibold">Your library starts with one good lesson.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]">Choose a subject above, name what you need to understand, and build a lesson you can return to.</p></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {displayedLessons.map((lesson, index) => <button key={lesson.id} type="button" onClick={() => openLesson(lesson)} className="group rounded-[20px] border border-[var(--card-border)] bg-[var(--surface)] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)]/60 hover:shadow-[0_12px_28px_rgba(20,30,20,0.06)] dark:border-[var(--card-border)] dark:bg-[var(--surface)] dark:hover:bg-[var(--surface-2)] sm:p-5">
              <div className="flex items-start justify-between gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${index % 3 === 0 ? "bg-[var(--primary-glow)] text-[var(--primary)]" : index % 3 === 1 ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--primary-glow)] text-[var(--primary)]"} dark:bg-[var(--surface-2)]`}><BookOpen size={18} /></span>{lesson.completed ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--success)]"><CheckCircle2 size={14} /> Done</span> : <span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[10px] font-semibold capitalize text-[var(--muted-foreground)] dark:bg-[var(--surface-2)] dark:text-[var(--muted-foreground)]">{lesson.difficulty}</span>}</div>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--muted-foreground)] dark:text-[var(--primary)]">{lesson.subject}</p><h3 className="mt-1.5 line-clamp-2 text-base font-semibold leading-6 tracking-tight">{lesson.title}</h3><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]">{lesson.description || "Open this lesson to continue studying."}</p>
              <div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)] dark:bg-[var(--surface-3)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.max(0, Math.min(100, lesson.progress))}%` }} /></div><span className="text-xs font-semibold tabular-nums text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]">{lesson.progress}%</span><ArrowRight size={16} className="text-[var(--muted-foreground)] transition group-hover:translate-x-0.5" /></div>
            </button>)}
          </div>}
          {visibleLessons.length > 4 && <div className="mt-4 text-center"><button type="button" onClick={() => setShowAllLessons(value => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 text-sm font-semibold hover:bg-[var(--interactive-hover)] dark:border-[var(--card-border)] dark:bg-[var(--surface-2)] dark:hover:bg-[var(--interactive-hover)]">{showAllLessons ? "Show recent only" : `View all ${visibleLessons.length} lessons`} <ArrowRight size={14} /></button></div>}
        </section>

        <section className="mt-8 rounded-[22px] border border-[var(--card-border)] bg-[var(--surface)] p-4 dark:border-[var(--card-border)] dark:bg-[var(--surface)] sm:p-5">
          <div className="mb-3 flex items-center gap-2"><BrainCircuit size={18} className="text-[var(--muted-foreground)] dark:text-[var(--primary)]" /><div><h2 className="text-sm font-semibold">Cortex on this device</h2><p className="text-xs text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]">Optional local model setup and device capability.</p></div></div>
          <LearnBrainStatus />
        </section>
      </div>
    </main>
  );
}
