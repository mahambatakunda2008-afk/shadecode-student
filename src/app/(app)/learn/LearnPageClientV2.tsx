"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getLessonCache, saveLessonCache, type LocalLessonList } from "@/lib/local-first/lesson-cache";
import { AlertCircle, BookOpen, CheckCircle2, Clock3, RefreshCw, Sparkles, WifiOff, Zap } from "lucide-react";

const REQUEST_TIMEOUT_MS = 12000;
const GENERATE_TIMEOUT_MS = 65000;

type Difficulty = "easy" | "medium" | "hard";
type Lesson = LocalLessonList["lessons"][number];
type Subject = LocalLessonList["subjects"][number];
type Summary = NonNullable<LocalLessonList["summary"]>;
type LearnData = Omit<LocalLessonList, "cachedAt">;

function timeoutSignal(ms: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => window.clearTimeout(timer) };
}

async function getSessionWithTimeout() {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const sb = createClient();
    const result = await Promise.race([
      sb.auth.getSession(),
      new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error("AUTH_TIMEOUT")), { once: true })),
    ]);
    return result.data.session;
  } finally { window.clearTimeout(timer); }
}

async function requestJson<T>(url: string, init: RequestInit, ms: number): Promise<T> {
  const t = timeoutSignal(ms);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: t.signal });
    const text = await response.text();
    let data: unknown = {};
    try { data = text ? JSON.parse(text) : {}; } catch { throw new Error("Invalid server response."); }
    if (!response.ok) throw new Error(typeof data === "object" && data && "error" in data ? String((data as { error?: unknown }).error ?? `Request failed (${response.status})`) : `Request failed (${response.status})`);
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("REQUEST_TIMEOUT");
    throw error;
  } finally { t.clear(); }
}

function timeAgo(value?: string) {
  if (!value) return "";
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "Just now";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function LearnPageClientV2() {
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<LearnData>({ subjects: [], lessons: [], summary: null });
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const refreshFromLocal = useCallback(async (id: string) => {
    const cached = await getLessonCache(id);
    if (cached) {
      setData({ subjects: cached.subjects, lessons: cached.lessons, summary: cached.summary });
      return true;
    }
    return false;
  }, []);

  const refreshFromServer = useCallback(async (id: string, accessToken: string, silent = false) => {
    if (!navigator.onLine) { setOffline(true); return; }
    if (!silent) setRefreshing(true);
    try {
      const fresh = await requestJson<LearnData>("/api/learn", { headers: { Authorization: `Bearer ${accessToken}` } }, REQUEST_TIMEOUT_MS);
      if (id !== userId && userId !== null) return;
      setData(fresh);
      await saveLessonCache(id, fresh);
      setOffline(false);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to refresh Learn.";
      setOffline(!navigator.onLine || message === "REQUEST_TIMEOUT");
      if (data.lessons.length === 0) setError(message === "REQUEST_TIMEOUT" ? "Learn took too long to respond. Your offline lessons are still available after retry." : "Couldn't refresh your lessons.");
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [data.lessons.length, userId]);

  useEffect(() => {
    const selected = params.get("subject");
    if (selected) setSubject(selected);
    let alive = true;
    void getSessionWithTimeout().then(async (session) => {
      if (!alive) return;
      if (!session) { router.replace("/login"); return; }
      const id = session.user.id;
      setUserId(id);
      setToken(session.access_token);
      const hasCache = await refreshFromLocal(id);
      if (!alive) return;
      setLoading(false);
      if (!navigator.onLine) { setOffline(true); return; }
      await refreshFromServer(id, session.access_token, true);
      if (!hasCache) setLoading(false);
    }).catch((e) => {
      if (!alive) return;
      setLoading(false);
      setError(e instanceof Error && e.message === "AUTH_TIMEOUT" ? "Authentication is taking too long. Check your connection and retry." : "Couldn't establish your session.");
    });
    const online = () => {
      setOffline(false);
      void getSessionWithTimeout().then((s) => s && refreshFromServer(s.user.id, s.access_token, true)).catch(() => undefined);
    };
    const offlineEvent = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineEvent);
    return () => { alive = false; window.removeEventListener("online", online); window.removeEventListener("offline", offlineEvent); };
  }, [params, router, refreshFromLocal, refreshFromServer]);

  const visibleLessons = useMemo(() => subject ? data.lessons.filter((lesson) => lesson.subject === subject || lesson.subjectId === subject) : data.lessons, [data.lessons, subject]);
  const recentLessons = visibleLessons.slice(0, 6);

  async function generate() {
    if (!token || !subject || !topic.trim() || generating || offline) return;
    setGenerating(true); setGenerateError(null);
    try {
      const result = await requestJson<{ id?: string; error?: string }>("/api/learn", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: "lesson", subject, topic: topic.trim(), difficulty }),
      }, GENERATE_TIMEOUT_MS);
      if (!result.id) throw new Error(result.error || "The lesson was not created.");
      router.push(`/learn/${result.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Generation failed.";
      setGenerateError(message === "REQUEST_TIMEOUT" ? "Generation took too long. Try again, or use a smaller topic." : message);
    } finally { setGenerating(false); }
  }

  if (loading && data.lessons.length === 0) return (
    <main className="min-h-screen bg-[var(--background)] p-5 sm:p-8" aria-busy="true" aria-label="Loading Learn">
      <div className="mx-auto max-w-6xl space-y-5 animate-pulse"><div className="h-10 w-52 rounded-xl bg-[var(--muted)]" /><div className="h-5 w-80 max-w-full rounded bg-[var(--muted)]" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((i) => <div key={i} className="h-32 rounded-2xl border border-[var(--card-border)] bg-[var(--card)]" />)}</div><div className="h-80 rounded-2xl border border-[var(--card-border)] bg-[var(--card)]" /><p className="sr-only">Preparing your learning workspace…</p></div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"><Sparkles className="h-4 w-4" /> Learn</div><h1 className="mt-1 text-3xl font-black tracking-tight">Turn a topic into a lesson.</h1><p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">Generate focused lessons, continue where you left off, and keep your learning workspace available even when the connection misbehaves.</p></div>
          <button type="button" onClick={() => token && userId && void refreshFromServer(userId, token)} disabled={refreshing || offline} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh</button>
        </header>
        {(offline || error) && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"><div className="mt-0.5 rounded-lg bg-[var(--primary-glow)] p-2">{offline ? <WifiOff className="h-4 w-4 text-[var(--primary)]" /> : <AlertCircle className="h-4 w-4 text-[var(--primary)]" />}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{offline ? "You're offline" : "Learn couldn't refresh"}</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{error || "Showing your most recently cached lessons. You can keep reading and retry when connected."}</p></div></div>}
        <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><Zap className="h-5 w-5 text-[var(--primary)]" /><h2 className="font-bold">Generate a lesson</h2></div><div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.5fr_auto]"><select value={subject} onChange={(e) => setSubject(e.target.value)} className="min-h-12 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)]"><option value="">Choose a subject</option>{data.subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select><input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void generate(); }} placeholder="e.g. Deformation of solids" className="min-h-12 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--primary)]" /><button type="button" onClick={() => void generate()} disabled={!subject || !topic.trim() || generating || offline} className="min-h-12 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50">{generating ? "Generating…" : "Generate"}</button></div><div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Lesson difficulty">{([['easy','Guided'],['medium','Standard'],['hard','Challenge']] as const).map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={difficulty === value} onClick={() => setDifficulty(value)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${difficulty === value ? "border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--primary)]" : "border-[var(--card-border)] text-[var(--muted-foreground)]"}`}>{label}</button>)}</div>{generateError && <p className="mt-3 flex items-center gap-2 text-xs font-medium text-[var(--destructive,#ef4444)]"><AlertCircle className="h-4 w-4" /> {generateError}</p>}</section>
        <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Subjects</h2><span className="text-xs text-[var(--muted-foreground)]">{data.subjects.length} available</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.subjects.map((item: Subject) => <button key={item.id} type="button" onClick={() => setSubject(item.name)} className={`rounded-2xl border p-4 text-left transition ${subject === item.name ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--primary)]"}`}><div className="flex items-center justify-between gap-3"><BookOpen className="h-5 w-5 text-[var(--primary)]" /><span className="text-xs text-[var(--muted-foreground)]">{item.lessonCount} lessons</span></div><p className="mt-4 font-bold">{item.name}</p></button>)}</div></section>
        <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{subject ? `${subject} lessons` : "Recent lessons"}</h2><span className="text-xs text-[var(--muted-foreground)]">{visibleLessons.length} shown</span></div>{recentLessons.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-10 text-center"><BookOpen className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" /><p className="mt-3 font-semibold">No lessons yet</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Choose a subject and generate your first lesson above.</p></div> : <div className="grid gap-3 md:grid-cols-2">{recentLessons.map((lesson: Lesson) => <button key={lesson.id} type="button" onClick={() => router.push(`/learn/${lesson.id}`)} className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--primary)]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)]">{lesson.subject}</p><h3 className="mt-1 truncate font-bold">{lesson.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">{lesson.description || "Continue this lesson."}</p></div>{lesson.completed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--primary)]" /> : <BookOpen className="h-5 w-5 shrink-0 text-[var(--muted-foreground)]" />}</div><div className="mt-4 flex items-center justify-between gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${lesson.progress}%` }} /></div><span className="text-[10px] font-semibold text-[var(--muted-foreground)]">{lesson.progress}%</span><span className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]"><Clock3 className="h-3 w-3" />{timeAgo(lesson.updated_at)}</span></div></button>)}</div>}</section>
        {data.summary && <footer className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"><p className="text-xs text-[var(--muted-foreground)]">XP</p><p className="mt-1 text-xl font-black">{data.summary.currentXP}</p></div><div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"><p className="text-xs text-[var(--muted-foreground)]">Streak</p><p className="mt-1 text-xl font-black">{data.summary.currentStreak} days</p></div><div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"><p className="text-xs text-[var(--muted-foreground)]">Level</p><p className="mt-1 text-xl font-black">{data.summary.level}</p></div></footer>}
      </div>
    </main>
  );
}
