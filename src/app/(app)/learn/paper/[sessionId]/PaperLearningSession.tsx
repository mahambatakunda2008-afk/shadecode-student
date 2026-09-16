"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Check, CheckCircle2, FileText, Lightbulb, Loader2, RotateCcw, Send, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";

type Interaction = { prompt?: string; evaluationMode?: string; expectedConcepts?: string[] };
type Block = { id: string; type: string; title?: string; content: string; sourcePages?: number[]; interaction?: Interaction };
type Session = {
  id: string;
  source_name: string;
  page_count: number;
  selected_page_start: number;
  selected_page_end: number;
  status: "processing" | "processed" | "failed";
  learning_plan: { title?: string; overview?: string; blocks?: Block[] };
  pages: Array<{ pageNumber: number; text: string }>;
  progress?: { completedBlockIds?: string[]; lastBlockId?: string; lastVerdict?: string };
  updated_at: string;
};
type Evaluation = { verdict: "correct" | "partially_correct" | "incorrect"; feedback: string; misconception?: string | null; nextAction?: string | null; hint?: string | null; solution?: string | null; attemptCount: number; completed: boolean };

function cacheKey(id: string) { return `shadecode:paper-session:${id}`; }
function isCheckpoint(block: Block) { return block.type === "checkpoint" || block.type === "mastery"; }

export default function PaperLearningSession({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const cached = window.localStorage.getItem(cacheKey(sessionId));
    if (cached) {
      try {
        const cachedSession = JSON.parse(cached) as Session;
        setSession(cachedSession);
        setOffline(true);
      } catch { /* ignore invalid cache */ }
    }
    fetch(`/api/learn/paper?id=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Couldn't load this paper session.");
        return data as Session;
      })
      .then(data => {
        if (!alive) return;
        setSession(data);
        setOffline(false);
        window.localStorage.setItem(cacheKey(sessionId), JSON.stringify(data));
      })
      .catch(e => { if (alive && !cached) setError(e instanceof Error ? e.message : "Couldn't load this session."); });
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { alive = false; window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [sessionId]);

  const blocks = session?.learning_plan?.blocks ?? [];
  const checkpoints = useMemo(() => blocks.filter(isCheckpoint), [blocks]);
  const completedIds = useMemo(() => new Set(session?.progress?.completedBlockIds ?? []), [session?.progress?.completedBlockIds]);
  const firstIncomplete = checkpoints.find(block => !completedIds.has(block.id));
  const currentId = activeId || firstIncomplete?.id || checkpoints[0]?.id || null;
  const currentIndex = Math.max(0, checkpoints.findIndex(block => block.id === currentId));
  const currentBlock = checkpoints.find(block => block.id === currentId) ?? null;

  async function checkpointAction(action: "submit" | "hint" | "reveal") {
    if (!currentBlock || offline) return;
    setActionError(null);
    if (action === "submit" && !answer.trim()) {
      setActionError("Write your reasoning first. Even a rough attempt gives Cortex something to diagnose.");
      return;
    }
    setChecking(true);
    try {
      const response = await fetch(`/api/learn/paper/${encodeURIComponent(sessionId)}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: currentBlock.id, action, response: answer }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Cortex couldn't process that action.");
      if (action === "hint") {
        setHint(data.hint || null);
      } else if (action === "reveal") {
        setRevealed(data.solution || null);
      } else {
        setResult(data as Evaluation);
        if (data.verdict === "correct") {
          const next = new Set(completedIds);
          next.add(currentBlock.id);
          const nextSession = { ...session, progress: { ...(session?.progress ?? {}), completedBlockIds: [...next], lastBlockId: currentBlock.id, lastVerdict: data.verdict } } as Session;
          setSession(nextSession);
          window.localStorage.setItem(cacheKey(sessionId), JSON.stringify(nextSession));
        }
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setChecking(false);
    }
  }

  function selectCheckpoint(id: string) {
    setActiveId(id);
    setAnswer("");
    setResult(null);
    setHint(null);
    setRevealed(null);
    setActionError(null);
  }

  if (!session && !error) return <main className="min-h-screen bg-[var(--background)] p-6"><div className="mx-auto max-w-4xl py-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--primary)]" /><p className="mt-3 text-sm text-[var(--muted-foreground)]">Opening your learning session…</p></div></main>;
  if (!session) return <main className="min-h-screen bg-[var(--background)] p-6"><div className="mx-auto max-w-4xl py-16 text-center"><p className="font-semibold">{error}</p><button type="button" onClick={() => router.push("/learn")} className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary-foreground)]">Back to Learn</button></div></main>;

  const allComplete = checkpoints.length > 0 && checkpoints.every(block => completedIds.has(block.id));

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <button type="button" onClick={() => router.push("/learn")} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><ArrowLeft className="h-4 w-4" /> Back to Learn</button>

        {offline && <div className="flex items-center gap-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-xs"><WifiOff className="h-4 w-4 text-[var(--primary)]" /> Offline copy loaded. Reading works, but checkpoint checking needs a connection.</div>}

        <header className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--primary)]"><FileText className="h-4 w-4" /> Paper study</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">{session.learning_plan?.title || "Learning from your paper"}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{session.learning_plan?.overview || "Cortex built this session from the selected source pages."}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[var(--muted-foreground)]"><span className="rounded-lg bg-[var(--surface)] px-3 py-2">{session.source_name}</span><span className="rounded-lg bg-[var(--surface)] px-3 py-2">Pages {session.selected_page_start}–{session.selected_page_end}</span><span className="rounded-lg bg-[var(--surface)] px-3 py-2">{session.page_count} pages in source</span><span className="rounded-lg bg-[var(--surface)] px-3 py-2">{checkpoints.length} interactive checks</span></div>
        </header>

        <section className="space-y-3" aria-label="Learning session">
          {blocks.map((block, index) => {
            if (!isCheckpoint(block)) {
              return <article key={block.id || `${block.type}-${index}`} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 sm:p-6"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-[var(--primary-glow)] p-2"><BookOpen className="h-4 w-4 text-[var(--primary)]" /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">{block.type.replace(/-/g, " ")}</p>{block.title && <h2 className="mt-1 text-lg font-bold">{block.title}</h2>}<div className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--foreground)]">{block.content}</div>{block.sourcePages?.length ? <p className="mt-3 text-[10px] font-semibold text-[var(--muted-foreground)]">Source pages: {block.sourcePages.join(", ")}</p> : null}</div></div></article>;
            }

            const done = completedIds.has(block.id);
            const selected = currentId === block.id;
            return <article key={block.id || `${block.type}-${index}`} className={`rounded-2xl border bg-[var(--card)] p-5 sm:p-6 ${selected ? "border-[var(--primary)] shadow-sm" : "border-[var(--card-border)]"}`}>
              <button type="button" onClick={() => selectCheckpoint(block.id)} className="flex w-full items-start gap-3 text-left">
                <div className="mt-0.5 rounded-lg bg-[var(--primary-glow)] p-2">{done ? <Check className="h-4 w-4 text-[var(--primary)]" /> : <Lightbulb className="h-4 w-4 text-[var(--primary)]" />}</div>
                <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">{done ? "mastered" : block.type.replace(/-/g, " ")}</p>{block.title && <h2 className="mt-1 text-lg font-bold">{block.title}</h2>}<div className="mt-2 whitespace-pre-line text-sm leading-7">{block.content}</div></div>
                {done && <span className="shrink-0 rounded-full bg-[var(--primary-glow)] px-2.5 py-1 text-[10px] font-black text-[var(--primary)]">Done</span>}
              </button>

              {selected && block.interaction?.prompt && !done && (
                <div className="mt-5 border-t border-[var(--card-border)] pt-5">
                  <p className="text-sm font-bold">Your turn</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7">{block.interaction.prompt}</p>
                  <textarea value={answer} onChange={e => setAnswer(e.target.value)} disabled={checking || offline} rows={6} placeholder="Show your reasoning. It is okay to be unsure." className="mt-4 w-full resize-y rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4 text-sm outline-none focus:border-[var(--primary)]" />
                  {hint && <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4 text-sm leading-6"><div className="flex items-center gap-2 font-bold"><Lightbulb className="h-4 w-4 text-[var(--primary)]" /> Hint</div><p className="mt-2">{hint}</p></div>}
                  {result && <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><p className="text-sm font-black uppercase tracking-wide">{result.verdict.replace("_", " ")}</p><p className="mt-2 text-sm leading-6">{result.feedback}</p>{result.misconception && <p className="mt-2 text-sm leading-6"><span className="font-bold">What to fix:</span> {result.misconception}</p>}{result.nextAction && <p className="mt-2 text-sm leading-6"><span className="font-bold">Next:</span> {result.nextAction}</p>}{result.solution && <div className="mt-3 border-t border-[var(--card-border)] pt-3 text-sm leading-6"><span className="font-bold">Reference solution:</span><p className="mt-1 whitespace-pre-line">{result.solution}</p></div>}</div>}
                  {revealed && <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4 text-sm leading-6"><p className="font-bold">Reference solution</p><p className="mt-2 whitespace-pre-line">{revealed}</p></div>}
                  {actionError && <p className="mt-3 text-sm font-semibold">{actionError}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => checkpointAction("submit")} disabled={checking || offline} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-[var(--primary-foreground)] disabled:opacity-50">{checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Check my reasoning</button>
                    <button type="button" onClick={() => checkpointAction("hint")} disabled={checking || offline} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-bold disabled:opacity-50"><Lightbulb className="h-4 w-4" /> Give me a hint</button>
                    <button type="button" onClick={() => checkpointAction("reveal")} disabled={checking || offline} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Show solution</button>
                  </div>
                </div>
              )}
            </article>;
          })}
        </section>

        {checkpoints.length === 0 && <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--primary)]" /><div><h2 className="font-bold">This session has no interactive checks yet</h2><p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">Generate a new paper session to get the interactive Cortex tutor layer.</p></div></div></section>}

        {checkpoints.length > 0 && <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--primary)]" /><div><h2 className="font-bold">{allComplete ? "Paper session mastered" : `Checkpoint ${Math.min(currentIndex + 1, checkpoints.length)} of ${checkpoints.length}`}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{allComplete ? "You worked through every interactive checkpoint. Your attempts are now part of this paper session's learning record." : "Do not rush past a checkpoint. Shadecode is using your reasoning to find what you actually understand and where the gap is."}</p></div></div></section>}
      </div>
    </main>
  );
}
