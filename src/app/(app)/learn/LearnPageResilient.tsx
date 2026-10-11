"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { offlineStorage } from "@/lib/offline/storage";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { lessonViewedEvent } from "@/lib/intelligence/emitLearningEvent";
import { getGenerationJob, subscribeGenerationJobs, type GenerationJob } from "@/lib/cortex/generationJob";
import { resumeLessonGeneration, startLessonGeneration, type LessonGenerationInput } from "@/lib/cortex/lessonGenerationClient";
import { AlertCircle, ArrowRight, BookOpen, CheckCircle2, Clock3, Compass, GraduationCap, Loader2, RefreshCw, Sparkles, Target, Wifi, WifiOff, Zap, Flame, BrainCircuit, ChevronRight, CirclePlay, NotebookPen, ShieldCheck } from "lucide-react";
import type { LearnLesson, LearnSubject, LearnSummary } from "./types";
import PaperStudyLauncher from "./PaperStudyLauncher";
import LearnBrainStatus from "./LearnBrainStatus";

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
      try {
        const sb = (await import("@/lib/supabase/client")).createClient();
        const result = await Promise.race([
          sb.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timed out")), AUTH_TIMEOUT)),
        ]);
        session = result.data.session;
        if (session && !cancelled) setToken(session.access_token);
      } catch {}
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
    if (!subject || !request || isGenerating) return;
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
    return <main className="min-h-[70vh] bg-[#f7f7f4] px-5 py-10 dark:bg-[#101311]" aria-busy="true">
      <div className="mx-auto max-w-7xl animate-pulse space-y-5">
        <div className="h-5 w-36 rounded-full bg-black/10 dark:bg-white/10" />
        <div className="h-12 w-3/5 rounded-2xl bg-black/10 dark:bg-white/10" />
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]"><div className="h-80 rounded-[28px] bg-black/10 dark:bg-white/10" /><div className="h-80 rounded-[28px] bg-black/10 dark:bg-white/10" /></div>
      </div>
    </main>;
  }

  return (
    <main data-page="learn" className="min-h-screen bg-[#f7f7f4] text-[#20241f] dark:bg-[#101311] dark:text-[#f2f3ee]">
      <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-8">
        <header className="mb-7 flex flex-col justify-between gap-5 border-b border-black/[0.08] pb-6 dark:border-white/[0.09] sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#687267] dark:text-[#a9b3a5]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#243b2b] text-[#e4f28a]"><BrainCircuit size={15} /></span> Shadecode Student / Learn</div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-[48px]">Make the hard stuff <span className="text-[#617b45] dark:text-[#c4dc87]">click.</span></h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#697068] dark:text-[#a7afa5] sm:text-base">A learning workspace that remembers what you’re working on, teaches the idea clearly, then makes you prove you understand it.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 text-sm font-medium dark:border-white/10 dark:bg-white/5">
              {offline ? <WifiOff size={15} className="text-amber-600" /> : <Wifi size={15} className="text-emerald-600" />}
              <span>{offline ? "Offline mode" : "Workspace ready"}</span>
            </div>
            <PaperStudyLauncher />
          </div>
        </header>

        {(error || offline) && <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
          <AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{offline ? "You’re working offline" : "Learn needs attention"}</p><p className="mt-1 text-sm leading-5 text-[#697068] dark:text-[#b0b8ad]">{error || "Saved lessons remain available on this device. New cloud generation will resume when you reconnect."}</p></div>
          {token && !offline && <button type="button" onClick={() => void load(token).catch(e => setError(e instanceof Error ? e.message : "Cloud sync failed."))} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-white/10"><RefreshCw size={15} /> Sync</button>}
        </div>}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <section className="overflow-hidden rounded-[28px] border border-[#243b2b] bg-[#1f3325] text-white shadow-[0_20px_60px_rgba(31,51,37,0.12)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/[0.08]" />
              <div className="pointer-events-none absolute -right-1 -top-8 h-44 w-44 rounded-full border border-white/[0.07]" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c4dc87]">Your next learning session</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">What are we untangling?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Start with the exact topic. Cortex should explain the why, work through examples, and check your understanding.</p></div>
                <span className="hidden h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/[0.07] text-[#d9ee9a] sm:grid"><Sparkles size={23} /></span>
              </div>

              <div className="relative mt-7 grid gap-4">
                <div>
                  <label htmlFor="learn-subject" className="mb-2 block text-xs font-bold uppercase tracking-[0.13em] text-white/65">01 / Subject</label>
                  <select id="learn-subject" value={subject} onChange={e => setSubject(e.target.value)} className="min-h-12 w-full rounded-xl border border-white/15 bg-[#17271c] px-4 text-[15px] text-white outline-none transition focus:border-[#c4dc87] focus:ring-2 focus:ring-[#c4dc87]/20">
                    <option value="" className="text-black">Choose your subject</option>
                    {subjects.map(s => <option key={s.id} value={s.name} className="text-black">{s.name}</option>)}
                  </select>
                  {!subjects.length && <p className="mt-2 text-xs text-white/50">Subject list is not synced yet. Reconnect or refresh your profile.</p>}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="learn-topic" className="block text-xs font-bold uppercase tracking-[0.13em] text-white/65">02 / Topic or problem</label><span className="text-[11px] text-white/40">{topic.length}/500</span></div>
                  <textarea id="learn-topic" value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void generate(); }} rows={3} maxLength={500} placeholder="e.g. Coordinate geometry: circles, completing the square, and exam questions…" className="w-full resize-y rounded-xl border border-white/15 bg-[#17271c] px-4 py-3.5 text-[15px] leading-6 text-white outline-none placeholder:text-white/35 transition focus:border-[#c4dc87] focus:ring-2 focus:ring-[#c4dc87]/20" />
                  <p className="mt-1.5 text-xs text-white/40">Tip: tell it where you get stuck, not just the chapter name.</p>
                </div>
              </div>

              <div className="relative mt-6">
                <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.13em] text-white/65">03 / How should I teach it?</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([
                    ["guided", "Build the basics", "First principles, slow steps"],
                    ["standard", "Learn + apply", "Explanations and worked examples"],
                    ["challenge", "Exam pressure", "Traps, reasoning, hard questions"],
                  ] as const).map(([value, label, description], index) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`rounded-xl border p-3 text-left transition ${mode === value ? "border-[#d7eb9b] bg-[#d7eb9b] text-[#203222]" : "border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]"}`}><span className="flex items-center justify-between gap-2 text-sm font-semibold"><span>{label}</span>{mode === value && <CheckCircle2 size={15} />}</span><span className={`mt-1.5 block text-xs leading-5 ${mode === value ? "text-[#43533b]" : "text-white/55"}`}>{description}</span></button>)}
                </div>
              </div>

              <div className="relative mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => void generate()} disabled={!subject || !topic.trim() || isGenerating} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d7eb9b] px-5 text-sm font-bold text-[#203222] transition hover:bg-[#e4f4b5] disabled:cursor-not-allowed disabled:opacity-45">
                  {isGenerating ? <><Loader2 size={17} className="animate-spin" /> Working on your lesson</> : <><Zap size={17} /> Start learning <ArrowRight size={16} /></>}
                </button>
                <span className="text-xs text-white/45">Your topic is saved while you work. Ctrl/⌘ + Enter to start.</span>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-black/10">
              <div className="px-4 py-3.5 sm:px-6"><p className="text-xl font-semibold text-[#d7eb9b]">{visibleLessons.length}</p><p className="mt-0.5 text-[11px] text-white/55">Lessons saved</p></div>
              <div className="px-4 py-3.5 sm:px-6"><p className="text-xl font-semibold text-[#d7eb9b]">{completedCount}</p><p className="mt-0.5 text-[11px] text-white/55">Completed</p></div>
              <div className="px-4 py-3.5 sm:px-6"><p className="text-xl font-semibold text-[#d7eb9b]">{summary?.currentStreak ?? 0}<span className="ml-1 text-sm">days</span></p><p className="mt-0.5 text-[11px] text-white/55">Current streak</p></div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[24px] border border-black/[0.08] bg-white p-5 shadow-[0_8px_30px_rgba(20,30,20,0.035)] dark:border-white/[0.09] dark:bg-[#181d19] sm:p-6">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#718064] dark:text-[#b3c88e]">A good place to begin</p><h2 className="mt-1.5 text-xl font-semibold tracking-tight">Choose your mission</h2></div><Compass size={20} className="mt-1 text-[#718064]" /></div>
              <div className="mt-4 space-y-2">
                {QUICK_STARTS.map(({ title, prompt, icon: Icon }) => <button key={title} type="button" onClick={() => setTopic(current => current.trim() ? `${current.trim()}\n\nTeaching approach: ${prompt}` : prompt)} className="group flex w-full items-start gap-3 rounded-xl border border-black/[0.07] p-3 text-left transition hover:border-[#81965f]/50 hover:bg-[#f5f7ef] dark:border-white/[0.08] dark:hover:bg-white/[0.04]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eef2e6] text-[#536943] dark:bg-[#293528] dark:text-[#c4dc87]"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 text-[#747b72] dark:text-[#a7afa5]">{title === "Teach me from zero" ? "Start with the idea, not memorisation." : title === "Fix what I keep getting wrong" ? "Find the misconception behind the mistake." : "Definitions, worked solutions, and exam practice."}</span></span><ChevronRight size={16} className="mt-2 shrink-0 text-[#90978d] transition group-hover:translate-x-0.5" /></button>)}
              </div>
            </section>

            <section className="rounded-[24px] border border-black/[0.08] bg-[#eeefe8] p-5 dark:border-white/[0.08] dark:bg-[#1a201b] sm:p-6">
              <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#dfe8d0] text-[#4d6540] dark:bg-[#2b3929] dark:text-[#c4dc87]"><Flame size={17} /></span><div><p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#72796e] dark:text-[#a9b3a5]">Your momentum</p><h2 className="text-lg font-semibold">Small wins add up.</h2></div></div>
              <div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-3xl font-semibold tracking-tight">{averageProgress}<span className="ml-1 text-base font-medium text-[#777f73]">%</span></p><p className="mt-1 text-xs text-[#777f73] dark:text-[#a9b3a5]">Average lesson progress</p></div><div className="text-right"><p className="text-lg font-semibold">{summary?.currentXP ?? 0} XP</p><p className="text-xs text-[#777f73] dark:text-[#a9b3a5]">Level {summary?.level ?? 1}</p></div></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.08]"><div className="h-full rounded-full bg-[#728c53] transition-all" style={{ width: `${averageProgress}%` }} /></div>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#72796e] dark:text-[#a9b3a5]"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#718b55]" /> Lessons you open and finish help Learn remember what to revisit next.</p>
            </section>
          </aside>
        </div>

        {generationJob && <section className={`mt-6 rounded-[22px] border p-4 sm:p-5 ${generationJob.status === "failed" ? "border-rose-500/25 bg-rose-500/[0.045]" : "border-[#8b9d75]/30 bg-white dark:bg-[#181d19]"}`} role={generationJob.status === "failed" ? "alert" : "status"} aria-live="polite">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${generationJob.status === "failed" ? "bg-rose-500/10 text-rose-600" : "bg-[#e8eddf] text-[#526b42] dark:bg-[#2b3929] dark:text-[#c4dc87]"}`}>{generationJob.status === "failed" ? <AlertCircle size={20} /> : generationJob.status === "complete" ? <CheckCircle2 size={20} /> : queuedOffline ? <WifiOff size={20} /> : isGenerating ? <Loader2 size={20} className="animate-spin" /> : <CirclePlay size={20} />}</div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{generationLabel}</h2><span className="rounded-full bg-black/[0.05] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#70786c] dark:bg-white/[0.08] dark:text-[#a9b3a5]">Run {generationJob.id.slice(0, 8)}</span></div><p className="mt-1.5 text-sm leading-6 text-[#6c7469] dark:text-[#adb5aa]">{generationDetail}</p>
              {isGenerating && <div className="mt-4"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium text-[#6c7469] dark:text-[#adb5aa]">Session progress</span><span className="font-bold tabular-nums">{generationJob.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.08]"><div className="h-full rounded-full bg-[#728c53] transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, generationJob.progress))}%` }} /></div></div>}
              {generationJob.status === "failed" && <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void generate()} disabled={!subject || !topic.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#263d2b] px-4 text-sm font-semibold text-white hover:bg-[#35533b] disabled:opacity-50"><RefreshCw size={15} /> Retry this topic</button><button type="button" onClick={() => { setTopic(""); setGenerationJob(null); }} className="inline-flex min-h-10 items-center rounded-xl border border-black/10 px-4 text-sm font-semibold dark:border-white/10">Change topic</button></div>}
            </div>
            <button type="button" aria-label="Dismiss generation status" onClick={() => setGenerationJob(null)} className="self-end rounded-lg p-2 text-[#747b72] transition hover:bg-black/[0.05] dark:hover:bg-white/[0.07] sm:self-start"><span className="text-xs font-semibold">Dismiss</span></button>
          </div>
        </section>}

        <section className="mt-9">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.17em] text-[#718064] dark:text-[#b3c88e]">Your library</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Pick up where you left off.</h2><p className="mt-1 text-sm text-[#737b71] dark:text-[#a7afa5]">Your recent lessons, including the ones saved on this device.</p></div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/80 px-3 py-2 text-xs font-semibold dark:border-white/[0.08] dark:bg-white/[0.04]"><BookOpen size={14} /> {visibleLessons.length} lessons</span>
          </div>
          {visibleLessons.length === 0 ? <div className="rounded-[24px] border border-dashed border-black/15 bg-white/70 px-5 py-12 text-center dark:border-white/15 dark:bg-white/[0.025]"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e8eddf] text-[#526b42] dark:bg-[#2b3929] dark:text-[#c4dc87]"><BookOpen size={22} /></span><h3 className="mt-4 text-lg font-semibold">Your library starts with one good lesson.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#737b71] dark:text-[#a7afa5]">Choose a subject above, name what you need to understand, and build a lesson you can return to.</p></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {displayedLessons.map((lesson, index) => <button key={lesson.id} type="button" onClick={() => openLesson(lesson)} className="group rounded-[20px] border border-black/[0.08] bg-white p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#8b9d75]/60 hover:shadow-[0_12px_28px_rgba(20,30,20,0.06)] dark:border-white/[0.09] dark:bg-[#181d19] dark:hover:bg-[#1c241d] sm:p-5">
              <div className="flex items-start justify-between gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${index % 3 === 0 ? "bg-[#e8eddf] text-[#526b42]" : index % 3 === 1 ? "bg-[#f5e8d8] text-[#95693e]" : "bg-[#e2e9ed] text-[#4c6c7b]"} dark:bg-white/[0.07]`}><BookOpen size={18} /></span>{lesson.completed ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={14} /> Done</span> : <span className="rounded-full bg-black/[0.045] px-2 py-1 text-[10px] font-semibold capitalize text-[#6d756a] dark:bg-white/[0.07] dark:text-[#a7afa5]">{lesson.difficulty}</span>}</div>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.13em] text-[#718064] dark:text-[#b3c88e]">{lesson.subject}</p><h3 className="mt-1.5 line-clamp-2 text-base font-semibold leading-6 tracking-tight">{lesson.title}</h3><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#737b71] dark:text-[#a7afa5]">{lesson.description || "Open this lesson to continue studying."}</p>
              <div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.08]"><div className="h-full rounded-full bg-[#728c53]" style={{ width: `${Math.max(0, Math.min(100, lesson.progress))}%` }} /></div><span className="text-xs font-semibold tabular-nums text-[#697068] dark:text-[#a7afa5]">{lesson.progress}%</span><ArrowRight size={15} className="text-[#90978d] transition group-hover:translate-x-0.5" /></div>
            </button>)}
          </div>}
          {visibleLessons.length > 4 && <div className="mt-4 text-center"><button type="button" onClick={() => setShowAllLessons(value => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold hover:bg-[#f0f2ea] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]">{showAllLessons ? "Show recent only" : `View all ${visibleLessons.length} lessons`} <ArrowRight size={14} /></button></div>}
        </section>

        <section className="mt-8 rounded-[22px] border border-black/[0.08] bg-white p-4 dark:border-white/[0.09] dark:bg-[#181d19] sm:p-5">
          <div className="mb-3 flex items-center gap-2"><BrainCircuit size={17} className="text-[#718064] dark:text-[#b3c88e]" /><div><h2 className="text-sm font-semibold">Cortex on this device</h2><p className="text-xs text-[#737b71] dark:text-[#a7afa5]">Optional local model setup and device capability.</p></div></div>
          <LearnBrainStatus />
        </section>
      </div>
    </main>
  );
}
