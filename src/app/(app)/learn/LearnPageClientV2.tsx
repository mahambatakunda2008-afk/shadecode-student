"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getLessonCache, saveLessonCache, type LocalLessonList } from "@/lib/local-first/lesson-cache";
import { AlertCircle, BookOpen, CheckCircle2, Clock3, RefreshCw, Sparkles, WifiOff, Zap } from "lucide-react";

type Lesson = LocalLessonList["lessons"][number];
type LearnData = Omit<LocalLessonList, "cachedAt">;
const REQUEST_TIMEOUT_MS = 12000;
const GENERATE_TIMEOUT_MS = 65000;

function timeoutSignal(ms: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => window.clearTimeout(timer) };
}

async function requestJson<T>(url: string, init: RequestInit, ms: number): Promise<T> {
  const t = timeoutSignal(ms);
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

async function getSessionWithTimeout() {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const result = await Promise.race([
      createClient().auth.getSession(),
      new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error("AUTH_TIMEOUT")), { once: true })),
    ]);
    return result.data.session;
  } finally { window.clearTimeout(timer); }
}

export default function LearnPageClientV2() {
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<LearnData>({ subjects: [], lessons: [], summary: null });
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const refreshFromLocal = useCallback(async (id: string) => {
    const cached = await getLessonCache(id);
    if (!cached) return;
    setData({ subjects: cached.subjects, lessons: cached.lessons, summary: cached.summary });
  }, []);

  const refreshFromServer = useCallback(async (id: string, accessToken: string, silent = false) => {
    if (!navigator.onLine) { setOffline(true); return; }
    if (!silent) setRefreshing(true);
    try {
      const fresh = await requestJson<LearnData>("/api/learn", { headers: { Authorization: `Bearer ${accessToken}` } }, REQUEST_TIMEOUT_MS);
      setData(fresh);
      await saveLessonCache(id, fresh);
      setOffline(false);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't refresh Learn.";
      setOffline(!navigator.onLine || message === "REQUEST_TIMEOUT");
      setError(message === "REQUEST_TIMEOUT" ? "Learn took too long to respond. Your cached lessons are still available." : "Couldn't refresh your lessons. Your local lessons are still available.");
    } finally { if (!silent) setRefreshing(false); }
  }, []);

  useEffect(() => {
    const selectedPrompt = params.get("prompt");
    if (selectedPrompt) setPrompt(selectedPrompt);
    let alive = true;
    void getSessionWithTimeout().then(async (session) => {
      if (!alive) return;
      if (!session) { router.replace("/login"); return; }
      setUserId(session.user.id);
      setToken(session.access_token);
      await refreshFromLocal(session.user.id);
      if (!alive) return;
      if (navigator.onLine) await refreshFromServer(session.user.id, session.access_token, true);
      else setOffline(true);
    }).catch((e) => { if (alive) setError(e instanceof Error && e.message === "AUTH_TIMEOUT" ? "Authentication is taking too long. Check your connection and retry." : "Couldn't establish your session."); });
    const online = () => { setOffline(false); void getSessionWithTimeout().then((s) => s && refreshFromServer(s.user.id, s.access_token, true)).catch(() => undefined); };
    const offlineEvent = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineEvent);
    return () => { alive = false; window.removeEventListener("online", online); window.removeEventListener("offline", offlineEvent); };
  }, [params, router, refreshFromLocal, refreshFromServer]);

  const visibleLessons = useMemo(() => data.lessons.slice(0, 6), [data.lessons]);

  async function generate() {
    const cleanPrompt = prompt.trim();
    if (!token || cleanPrompt.length < 3 || generating || offline) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const result = await requestJson<{ id?: string; error?: string }>("/api/learn/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: cleanPrompt }),
      }, GENERATE_TIMEOUT_MS);
      if (!result.id) throw new Error(result.error || "Cortex did not create a lesson.");
      router.push(`/learn/${result.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Generation failed.";
      setGenerateError(message === "REQUEST_TIMEOUT" ? "Cortex took too long. Try a more focused request." : message);
    } finally { setGenerating(false); }
  }

  if (!token && !error && !data.lessons.length) return <main className="min-h-screen bg-[var(--background)] p-6" aria-busy="true"><div className="mx-auto max-w-5xl animate-pulse"><div className="h-10 w-64 rounded-xl bg-[var(--muted)]" /><div className="mt-4 h-5 w-96 max-w-full rounded bg-[var(--muted)]" /></div></main>;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"><Sparkles className="h-4 w-4" /> Cortex Learn</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Tell Cortex what you need.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">No forms. No topic hunting. Give Cortex the whole situation and it will use your learning context to build the lesson.</p>
          </div>
          <button type="button" onClick={() => token && userId && void refreshFromServer(userId, token)} disabled={refreshing || offline} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh</button>
        </header>

        {(offline || error) && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"><div className="rounded-lg bg-[var(--primary-glow)] p-2">{offline ? <WifiOff className="h-4 w-4 text-[var(--primary)]" /> : <AlertCircle className="h-4 w-4 text-[var(--primary)]" />}</div><div><p className="text-sm font-semibold">{offline ? "You're offline" : "Learn couldn't refresh"}</p><p className="mt-1 text-sm text-[var(--muted-foreground)]">{error || "Your cached lessons are still available."}</p></div></div>}

        <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-2"><Zap className="h-5 w-5 text-[var(--primary)]" /><h2 className="font-bold">What do you want to learn?</h2></div>
          <textarea autoFocus value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void generate(); }} disabled={offline || generating} rows={5} placeholder="Try: I have Physics tomorrow and 45 minutes. Teach me deformation of solids, then test me on it." className="mt-4 w-full resize-y rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-4 text-base leading-7 outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-glow)] disabled:opacity-60" />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[var(--muted-foreground)]">Cortex uses your subjects, level and complete request. <span className="font-semibold">Ctrl/⌘ + Enter</span> to generate.</p><button type="button" onClick={() => void generate()} disabled={prompt.trim().length < 3 || generating || offline} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 text-sm font-bold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50">{generating ? <><Sparkles className="h-4 w-4 animate-pulse" /> Cortex is building it…</> : <><Zap className="h-4 w-4" /> Build my lesson</>}</button></div>
          {generateError && <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-medium text-[var(--destructive,#ef4444)]"><AlertCircle className="h-4 w-4" /> {generateError}</p>}
        </section>

        {data.subjects.length > 0 && <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Your context</h2><span className="text-xs text-[var(--muted-foreground)]">Cortex already knows these</span></div><div className="flex flex-wrap gap-2">{data.subjects.map((s) => <button key={s.id} type="button" onClick={() => setPrompt((current) => current.trim() ? `${current.trim()} Focus this on ${s.name}.` : `Teach me ${s.name}.`)} className="rounded-full border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold hover:border-[var(--primary)]">{s.name}</button>)}</div></section>}

        <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Continue learning</h2><span className="text-xs text-[var(--muted-foreground)]">{data.lessons.length} lessons</span></div>{visibleLessons.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-10 text-center"><BookOpen className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" /><p className="mt-3 font-semibold">Your next lesson starts with a sentence.</p></div> : <div className="grid gap-3 md:grid-cols-2">{visibleLessons.map((lesson: Lesson) => <button key={lesson.id} type="button" onClick={() => router.push(`/learn/${lesson.id}`)} className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--primary)]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">{lesson.subject}</p><h3 className="mt-1 truncate font-bold">{lesson.title}</h3><p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--muted-foreground)]">{lesson.description || "Continue this lesson."}</p></div>{lesson.completed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--primary)]" /> : <BookOpen className="h-5 w-5 shrink-0 text-[var(--muted-foreground)]" />}</div><div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${lesson.progress}%` }} /></div><span className="text-xs font-semibold text-[var(--muted-foreground)]">{lesson.progress}%</span><span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]"><Clock3 className="h-3 w-3" /> Continue</span></div></button>)}</div>}</section>
      </div>
    </main>
  );
}
