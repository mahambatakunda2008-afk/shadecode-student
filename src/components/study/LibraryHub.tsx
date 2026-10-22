"use client";

import { useCallback, useState } from "react";
import { ArrowLeft, Loader2, Search, ThumbsDown, ThumbsUp } from "lucide-react";
import { renderMath } from "@/lib/exam/mathText";
import type { LessonBlock, Snippet } from "@/lib/library/bm25";

type Result = { id: string; title: string; subject: string | null; difficulty: string | null; snippet: Snippet | null; helpful: { up: number; down: number } };
type Lesson = { id: string; title: string; subject: string | null; difficulty: string | null; blocks: LessonBlock[]; helpful_up: number; helpful_down: number };
type Phase = "idle" | "loading" | "done" | "error";
type LearnerSubject = { id: string; name: string };

const card = "rounded-2xl border border-white/10 bg-[var(--card)] shadow-lg";
const button = "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-white/5 disabled:opacity-60";

export default function LibraryHub({ subjects }: { subjects: LearnerSubject[] }) {
  const [query, setQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.name ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<Result[]>([]);
  const [asked, setAsked] = useState("");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [myVote, setMyVote] = useState<"up" | "down" | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    const text = query.trim();
    if (text.length < 2 || !selectedSubject) return;
    setPhase("loading");
    setNotice(null);
    try {
      const response = await fetch(`/api/library/search?q=${encodeURIComponent(text)}&subject=${encodeURIComponent(selectedSubject)}`);
      const data = (await response.json()) as { results?: Result[] };
      if (!response.ok) throw new Error("search failed");
      setResults(data.results ?? []);
      setAsked(text);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }, [query, selectedSubject]);

  async function open(id: string) {
    setOpening(id);
    setNotice(null);
    try {
      const response = await fetch(`/api/library/lesson?id=${encodeURIComponent(id)}`);
      const data = (await response.json()) as { lesson?: Lesson; myVote?: "up" | "down" | null };
      if (!response.ok || !data.lesson) throw new Error("open failed");
      setLesson(data.lesson);
      setMyVote(data.myVote ?? null);
    } catch {
      setNotice("Couldn't open that lesson. Please try again.");
    } finally {
      setOpening(null);
    }
  }

  async function vote(helpful: boolean) {
    if (!lesson) return;
    const previous = myVote;
    setMyVote(helpful ? "up" : "down");
    try {
      const response = await fetch("/api/library/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lesson.id, helpful }) });
      if (!response.ok) throw new Error("vote failed");
      setNotice("Thanks. Your rating helps rank lessons for other students.");
    } catch {
      setMyVote(previous);
      setNotice("Couldn't save your rating. Sign in and try again.");
    }
  }

  if (lesson) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <button type="button" onClick={() => { setLesson(null); setNotice(null); }} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft className="size-4" aria-hidden /> Back to results
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{lesson.title}</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{[lesson.subject, lesson.difficulty].filter(Boolean).join(" · ")}</p>

        <div className="mt-6 grid gap-3">
          {lesson.blocks.map((block, index) => (
            <section key={index} className={`${card} p-5`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">{block.type ?? "text"}</p>
              {block.title && <h2 className="mt-1 text-base font-semibold text-[var(--foreground)]">{block.title}</h2>}
              {/* renderMath escapes untrusted HTML; only KaTeX output and plain formatting tags remain. */}
              <div className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--foreground)]" dangerouslySetInnerHTML={{ __html: renderMath(block.content ?? "") }} />
            </section>
          ))}
        </div>

        <div className={`${card} mt-6 flex flex-wrap items-center gap-3 p-4`} role="group" aria-label="Rate this lesson">
          <p className="text-sm font-semibold text-[var(--foreground)]">Was this lesson helpful?</p>
          <button type="button" onClick={() => void vote(true)} aria-pressed={myVote === "up"} className={`${button} ${myVote === "up" ? "bg-white/10" : ""}`}><ThumbsUp className="size-4" aria-hidden /> Helpful</button>
          <button type="button" onClick={() => void vote(false)} aria-pressed={myVote === "down"} className={`${button} ${myVote === "down" ? "bg-white/10" : ""}`}><ThumbsDown className="size-4" aria-hidden /> Not helpful</button>
          {notice && <p role="status" className="w-full text-xs text-[var(--muted-foreground)]">{notice}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Lesson library</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Search lessons other students have worked through. Instant, and it works even when AI is unavailable.</p>
      </header>

      {subjects.length === 0 ? <p role="status" className={`${card} mt-4 p-5 text-sm text-[var(--muted-foreground)]`}>Choose your academic subjects in your profile before searching the lesson library.</p> : <form role="search" onSubmit={(event) => { event.preventDefault(); void runSearch(); }} className="flex flex-wrap gap-2">
        <label htmlFor="library-search" className="sr-only">Search the lesson library</label>
        <label htmlFor="library-subject" className="sr-only">Subject</label>
        <select id="library-subject" value={selectedSubject} onChange={(event) => { setSelectedSubject(event.target.value); setResults([]); setPhase("idle"); }} className="h-11 w-full rounded-xl border border-white/10 bg-[var(--card)] px-3 text-sm text-[var(--foreground)]">{subjects.map((subject) => <option key={subject.id} value={subject.name}>{subject.name}</option>)}</select>
        <input id="library-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. how does binary search work" maxLength={200} className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[var(--card)] px-4 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]" />
        <button type="submit" disabled={phase === "loading" || query.trim().length < 2 || !selectedSubject} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-60">
          {phase === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />} Search
        </button>
      </form>}

      {notice && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{notice}</p>}
      {phase === "error" && <p role="alert" className="mt-4 text-sm text-[var(--danger)]">The library is unavailable right now. Please try again.</p>}

      {phase === "done" && results.length === 0 && (
        <p role="status" className={`${card} mt-4 p-5 text-sm text-[var(--muted-foreground)]`}>No lessons match "{asked}" yet. The library grows as students complete lessons, so try different words or check back soon.</p>
      )}

      <ul className="mt-4 grid gap-3">
        {results.map((result) => (
          <li key={result.id}>
            <button type="button" onClick={() => void open(result.id)} disabled={opening !== null} className={`${card} w-full p-4 text-left transition-colors hover:bg-white/5 disabled:opacity-60`}>
              <span className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--foreground)]">{result.title}</span>
                {opening === result.id && <Loader2 className="size-4 shrink-0 animate-spin" aria-label="Opening" />}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">{[result.subject, result.difficulty].filter(Boolean).join(" · ")}{result.helpful.up + result.helpful.down > 0 ? ` · ${result.helpful.up} found this helpful` : ""}</span>
              {result.snippet && <span className="mt-2 block text-sm leading-6 text-[var(--muted-foreground)]">{result.snippet.text}</span>}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
