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
type LearnData = Omit<LocalLessonList, "cachedAt">;

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => window.clearTimeout(timer) };
}

async function requestJson<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const t = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: t.signal });
    const text = await response.text();
    let data: unknown = {};
    try { data = text ? JSON.parse(text) : {}; } catch { throw new Error("Invalid server response."); }
    if (!response.ok) {
      const message = typeof data === "object" && data && "error" in data ? String((data as { error?: unknown }).error ?? "Request failed") : `Request failed (${response.status})`;
      throw new Error(message);
    }
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("REQUEST_TIMEOUT");
    throw error;
  } finally { t.clear(); }
}

function timeAgo(value?: string) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "Just now";
  const minutes = Math.floor(diff / 60000);
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
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const refresh = useCallback(async (id: string, accessToken: string, silent = false) => {
    if (!navigator.onLine) { setOffline(true); return; }
    if (!silent) setRefreshing(true);
    try {
      const fresh = await requestJson<LearnData>("/api/learn", { headers: { Authorization: `Bearer ${accessToken}` } }, REQUEST_TIMEOUT_MS);
      setData(fresh);
      await saveLessonCache(id, fresh);
      setOffline(false);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to refresh Learn.";
      setOffline(!navigator.onLine || message === "REQUEST_TIMEOUT");
      setError(message === "REQUEST_TIMEOUT" ? "Learn took too long to respond. Your cached lessons are still available." : "Couldn't refresh your lessons. Your cached lessons are still available.");
    } finally { if (!silent) setRefreshing(false); }
  }, []);

  useEffect(() => {
    const selected = params.get("subject");
    if (selected) setSubject(selected);
    let alive = true;
    void createClient().auth.getSession().then(async ({ data: sessionData }) => {
      if (!alive) return;
      const session = sessionData.session;
      if (!session) { router.replace("/login"); return; }
      const id = session.user.id;
      setUserId(id);
      setToken(session.access_token);
      const cached = await getLessonCache(id);
      if (cached && alive) setData({ subjects: cached.subjects, lessons: cached.lessons, summary: cached.summary });
      if (!alive) return;
      setLoading(false);
      await refresh(id, session.access_token, true);
    }).catch(() => {
      if (!alive) return;
      setLoading(false);
      setError("Couldn't establish your session.");
    });
    const onOnline = () => {
      setOffline(false);
      void createClient().auth.getSession().then(({ data: s }) => s.session && refresh(s.session.user.id, s.session.access_token, true)).catch(() => undefined);
    };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { alive = false; window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [params, router, refresh]);

  const visibleLessons = useMemo(() => subject ? data.lessons.filter((lesson) => lesson.subject === subject || lesson.subjectId === subject) : data.lessons, [data.lessons, subject]);

  async function generate() {
    if (!token || !subject || !topic.trim() || generating || offline) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      // /api/learn is list/detail. The curriculum-aware lesson generator is /api/learn/generate.
      const result = await requestJson<{ id?: string; error?: string }>("/api/learn/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, topic: topic.trim(), difficulty }),
      }, GENERATE_TIMEOUT_MS);
      if (!result.id) throw new Error(result.error || "The lesson was not created.");
      router.push(`/learn/${result.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Generation failed.";
      setGenerateError(message === "REQUEST_TIMEOUT" ? "Generation took too long. Try again or use a smaller topic." : message);
    } finally { setGenerating(false); }
  }

  if (loading && data.lessons.length === 0) {
    return <main className="min-h-screen bg-[var(--background)] p-6"><div className="mx-auto max-w-6xl animate-pulse space-y-5"><div className="h-10 w-56 rounded-xl bg-[var(--muted)]" /><div className="h-5 w-80 rounded bg-[var(--muted)]" /><div className="h-72 rounded-3xl bg-[var(--card)]" /></div></main>;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"><Sparkles className="h-4 w-4" /> Learn</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Turn a topic into a lesson.</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">Generate curriculum-aware lessons, continue where you left off, and keep your workspace available offline.</p>
          </div>
          <button type="button" onClick={() => token && userId && void refresh(userId, token)} disabled={refreshing || offline} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh</button>
        </header>

        {(offline || error) && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"><div className="rounded-lg bg-[var(--primary-glow)] p-2">{offline ? <WifiOff className="h-4 w-4 text-[var(--primary)]" /> : <AlertCircle className="h-4 w-4 text-[var(--primary)]" />}</div><div><p className="text-sm font-semibold">{offline ? "You're offline" : "Learn couldn't refresh"}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{error || "Your cached lessons are still available."}</p></div></div>}

        <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><Zap className="h-5 w-5 text-[var(--primary)]" /><h2 className="font-bold">Generate a lesson</h2></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.5fr_auto]">
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="min-h-12 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)]"><option value="">Choose a subject</option>{data.subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void generate(); }} placeholder="e.g. Deformation of solids" className="min-h-12 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--primary)]" />
            <button type="button" onClick={() => void generate()} disabled={!subject || !topic.trim() || generating || offline} className="min-h-12 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50">{generating ? "Generating…" : "Generate"}</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Lesson difficulty">
            {(["easy", "medium", "hard"] as Difficulty[]).map((value) => <button key={value} type="button" role="radio" aria-checked={difficulty === value} onClick={() => setDifficulty(value)} className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize ${difficulty === value ? "border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--primary)]" : "border-[var(--card-border)] text-[var(--muted-foreground)]"}`}>{value === "easy" ? "Guided" : value === "medium" ? "Standard" : "Challenge"}</button>)}
          </div>
          {generateError && <p className="mt-3 flex items-center gap-2 text-xs font-medium text-[var(--destructive,#ef4444)]"><AlertCircle className="h-4 w-4" /> {generateError}</p>}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Subjects</h2><span className="text-xs text-[var(--muted-foreground)]">{data.subjects.length} available</span></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.subjects.map((item) => <button key={item.id} type="button" onClick={() => setSubject(item.name)} className={`rounded-2xl border p-4 text-left transition ${subject === item.name ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--primary)]"}`}><div className="flex items-center justify-between"><BookOpen className="h-5 w-5 text-[var(--primary)]" /><span className="text-xs text-[var(--muted-foreground)]">{item.lessonCount} lessons</span></div><p className="mt-4 font-bold">{item.name}</p></button>)}</div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{subject ? `${subject} lessons` : "Recent lessons"}</h2><span className="text-xs text-[var(--muted-foreground)]">{visibleLessons.length} shown</span></div>
          {visibleLessons.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-10 text-center"><BookOpen className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" /><p className="mt-3 font-semibold">No lessons yet</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Choose a subject and generate your first lesson above.</p></div> : <div className="grid gap-3 md:grid-cols-2">{visibleLessons.slice(0, 8).map((lesson: Lesson) => <button key={lesson.id} type="button" onClick={() => router.push(`/learn/${lesson.id}`)} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--primary)]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)]">{lesson.subject}</p><h3 className="mt-1 truncate font-bold">{lesson.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">{lesson.description || "Continue this lesson."}</p></div>{lesson.completed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--primary)]" /> : <BookOpen className="h-5 w-5 shrink-0 text-[var(--muted-foreground)]" />}</div><div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${lesson.progress}%` }} /></div><span className="text-[10px] font-semibold text-[var(--muted-foreground)]">{lesson.progress}%</span><span className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]"><Clock3 className="h-3 w-3" />{timeAgo(lesson.updated_at)}</span></div></button>)}</div>}
        </section>
      </div>
    </main>
  );
}
