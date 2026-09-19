"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Check, CheckCircle2, ChevronRight, FileText, Lightbulb, Loader2, RotateCcw, Send, WifiOff } from "lucide-react";
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
  learning_plan: { title?: string; overview?: string; subject?: string; level?: string; board?: string; topics?: string[]; blocks?: Block[] };
  pages: Array<{ pageNumber: number; text: string }>;
  source_metadata?: { selectionMode?: string; selectedQuestionNumbers?: string[]; questionIndex?: Array<{ questionNumber: string; sourcePageStart: number; sourcePageEnd: number; extractionConfidence: number; extractionMethod: string }>; [key: string]: unknown };
  progress?: { completedBlockIds?: string[]; lastBlockId?: string; lastVerdict?: string };
  updated_at: string;
};
type Evaluation = { verdict: "correct" | "partially_correct" | "incorrect"; feedback: string; misconception?: string | null; nextAction?: string | null; hint?: string | null; solution?: string | null; attemptCount: number; completed: boolean };
type InteractionResponse = { action: string; message?: string; question?: string; transferId?: string; attemptCount?: number; verdict?: "correct" | "partially_correct" | "incorrect"; feedback?: string; misconception?: string | null; nextAction?: string | null; completed?: boolean };

const cacheKey = (id: string) => `shadecode:paper-session:${id}`;
const isCheckpoint = (block: Block) => block.type === "checkpoint" || block.type === "mastery";

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
  const [interaction, setInteraction] = useState<InteractionResponse | null>(null);
  const [guidedMode, setGuidedMode] = useState(false);
  const [revealedBlocks, setRevealedBlocks] = useState<string[]>([]);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [transferQuestion, setTransferQuestion] = useState<string | null>(null);
  const [transferAnswer, setTransferAnswer] = useState("");
  const [transferResult, setTransferResult] = useState<InteractionResponse | null>(null);

  useEffect(() => {
    let alive = true;
    const cached = window.localStorage.getItem(cacheKey(sessionId));
    if (cached) {
      try { setSession(JSON.parse(cached) as Session); setOffline(true); } catch { /* ignore */ }
    }
    fetch(`/api/learn/paper?id=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
      .then(async response => { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Couldn't load this paper session."); return data as Session; })
      .then(data => { if (!alive) return; setSession(data); setOffline(false); window.localStorage.setItem(cacheKey(sessionId), JSON.stringify(data)); })
      .catch(e => { if (alive && !cached) setError(e instanceof Error ? e.message : "Couldn't load this session."); });
    const online = () => setOffline(false); const offlineEvent = () => setOffline(true);
    window.addEventListener("online", online); window.addEventListener("offline", offlineEvent);
    return () => { alive = false; window.removeEventListener("online", online); window.removeEventListener("offline", offlineEvent); };
  }, [sessionId]);

  const blocks = session?.learning_plan?.blocks ?? [];
  const checkpoints = useMemo(() => blocks.filter(isCheckpoint), [blocks]);
  const completedIds = useMemo(() => new Set(session?.progress?.completedBlockIds ?? []), [session?.progress?.completedBlockIds]);
  const firstIncomplete = checkpoints.find(block => !completedIds.has(block.id));
  const currentId = activeId || firstIncomplete?.id || checkpoints[0]?.id || null;
  const currentIndex = Math.max(0, checkpoints.findIndex(block => block.id === currentId));
  const currentBlock = checkpoints.find(block => block.id === currentId) ?? null;
  const completedCount = checkpoints.filter(block => completedIds.has(block.id)).length;
  const allComplete = checkpoints.length > 0 && completedCount === checkpoints.length;
  function selectCheckpoint(id: string) {
    setActiveId(id); setAnswer(""); setResult(null); setHint(null); setRevealed(null); setActionError(null); setInteraction(null);
  }

  function continueToNext() {
    const next = checkpoints.find(block => !completedIds.has(block.id));
    if (next) selectCheckpoint(next.id);
    else { setActiveId(null); setResult(null); setAnswer(""); }
  }

  async function checkpointAction(action: "submit" | "hint" | "reveal") {
    if (!currentBlock || offline) return;
    setActionError(null);
    if (action === "submit" && !answer.trim()) { setActionError("Write your reasoning first. Even a rough attempt gives Cortex something to diagnose."); return; }
    setChecking(true);
    try {
      const response = await fetch(`/api/learn/paper/${encodeURIComponent(sessionId)}/attempt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockId: currentBlock.id, action, response: answer }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Cortex couldn't process that action.");
      if (action === "hint") setHint(data.hint || null);
      else if (action === "reveal") setRevealed(data.solution || null);
      else {
        setResult(data as Evaluation);
        if (data.verdict === "correct") {
          const next = new Set(completedIds); next.add(currentBlock.id);
          const nextSession = { ...session, progress: { ...(session?.progress ?? {}), completedBlockIds: [...next], lastBlockId: currentBlock.id, lastVerdict: data.verdict } } as Session;
          setSession(nextSession); window.localStorage.setItem(cacheKey(sessionId), JSON.stringify(nextSession));
        }
      }
    } catch (e) { setActionError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setChecking(false); }
  }

  async function learningAction(action: "teach-page" | "explain-step" | "why" | "quiz") {
    if (!currentBlock || offline) return;
    setActionError(null);
    setInteraction(null);
    if (action === "quiz") { setTransferId(null); setTransferQuestion(null); setTransferAnswer(""); setTransferResult(null); }
    setChecking(true);
    try {
      const endpoint = action === "quiz"
        ? `/api/learn/paper/${encodeURIComponent(sessionId)}/transfer`
        : `/api/learn/paper/${encodeURIComponent(sessionId)}/attempt`;
      const body = action === "quiz"
        ? { action: "generate", blockId: currentBlock.id }
        : { blockId: currentBlock.id, action, response: answer };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Cortex couldn't process that action.");
      setInteraction(data as InteractionResponse);
      if (action === "quiz") { setTransferId(data.transferId || null); setTransferQuestion(data.question || null); }
    } catch (e) { setActionError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setChecking(false); }
  }

  async function submitTransfer() {
    if (!currentBlock || !transferId || !transferAnswer.trim() || offline) return;
    setActionError(null);
    setChecking(true);
    try {
      const response = await fetch(`/api/learn/paper/${encodeURIComponent(sessionId)}/transfer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit", blockId: currentBlock.id, transferId, response: transferAnswer }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Cortex couldn't grade the transfer.");
      setTransferResult(data as InteractionResponse);
      if (data.completed) {
        const next = new Set(completedIds); next.add(currentBlock.id);
        const nextSession = { ...session, progress: { ...(session?.progress ?? {}), completedBlockIds: [...next], lastBlockId: currentBlock.id, lastVerdict: data.verdict } } as Session;
        setSession(nextSession); window.localStorage.setItem(cacheKey(sessionId), JSON.stringify(nextSession));
      }
    } catch (e) { setActionError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setChecking(false); }
  }

  if (!session && !error) return <main className="min-h-screen bg-[var(--background)] p-6"><div className="mx-auto max-w-4xl py-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--primary)]" /><p className="mt-3 text-sm text-[var(--muted-foreground)]">Opening your learning session…</p></div></main>;
  if (!session) return <main className="min-h-screen bg-[var(--background)] p-6"><div className="mx-auto max-w-4xl py-16 text-center"><p className="font-semibold">{error}</p><button type="button" onClick={() => router.push("/learn")} className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary-foreground)]">Back to Learn</button></div></main>;
  const selectedQuestionNumbers = session.source_metadata?.selectedQuestionNumbers ?? [];
  const uncertainQuestions = (session.source_metadata?.questionIndex ?? []).filter(question => question.extractionConfidence < 0.95);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <button type="button" onClick={() => router.push("/learn")} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><ArrowLeft className="h-4 w-4" /> Back to Learn</button>
        {offline && <div className="flex items-center gap-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-xs"><WifiOff className="h-4 w-4 text-[var(--primary)]" /> Offline copy loaded. Reading works, but Cortex checkpoint checking needs a connection.</div>}

        <header className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--primary)]"><FileText className="h-4 w-4" /> Paper study</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">{session.learning_plan?.title || "Learning from your paper"}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{session.learning_plan?.overview || "Cortex built this session from the selected source pages."}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[var(--muted-foreground)]">
            <span className="rounded-lg bg-[var(--surface)] px-3 py-2">{session.source_name}</span>
            <span className="rounded-lg bg-[var(--surface)] px-3 py-2">Pages {session.selected_page_start}–{session.selected_page_end}</span>
            {session.learning_plan.subject && <span className="rounded-lg bg-[var(--surface)] px-3 py-2">{session.learning_plan.subject}</span>}
            {session.learning_plan.level && <span className="rounded-lg bg-[var(--surface)] px-3 py-2">{session.learning_plan.level}</span>}
            {session.learning_plan.board && <span className="rounded-lg bg-[var(--surface)] px-3 py-2">{session.learning_plan.board}</span>}
          </div>
          {selectedQuestionNumbers.length > 0 && <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-3 text-xs"><span className="font-bold">Question scope:</span> {selectedQuestionNumbers.map(number => `Q${number}`).join(", ")} <span className="text-[var(--muted-foreground)]">with surrounding page context</span></div>}
          {uncertainQuestions.length > 0 && <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-3 text-xs leading-5"><span className="font-bold">Extraction needs checking:</span> {uncertainQuestions.map(question => `Q${question.questionNumber}`).join(", ")}. Numbering was less certain, so Cortex must not treat that provenance as guaranteed.</div>}
          {session.learning_plan.topics?.length ? <div className="mt-4 flex flex-wrap gap-2">{session.learning_plan.topics.slice(0, 10).map(topic => <span key={topic} className="rounded-full border border-[var(--card-border)] px-3 py-1 text-xs">{topic}</span>)}</div> : null}
          {checkpoints.length > 0 && <div className="mt-6"><div className="flex items-center justify-between text-xs font-bold"><span>{allComplete ? "Mastery complete" : `${completedCount} of ${checkpoints.length} checkpoints mastered`}</span><span>{Math.round((completedCount / checkpoints.length) * 100)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${(completedCount / checkpoints.length) * 100}%` }} /></div></div>}
        </header>

        <section className="space-y-3" aria-label="Learning session">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <div><p className="text-sm font-bold">How do you want to learn?</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Guided mode lets you reveal the reasoning only when you are ready.</p></div>
            <button type="button" onClick={() => { setGuidedMode(value => !value); setRevealedBlocks([]); }} className={`rounded-xl px-4 py-2.5 text-xs font-black ${guidedMode ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "border border-[var(--card-border)] bg-[var(--surface)]"}`}>{guidedMode ? "Guided mode on" : "Turn on Guided mode"}</button>
          </div>
          {blocks.map((block, index) => {
            if (!isCheckpoint(block)) return <article key={block.id || `${block.type}-${index}`} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 sm:p-6"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-[var(--primary-glow)] p-2"><BookOpen className="h-4 w-4 text-[var(--primary)]" /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">{block.type.replace(/-/g, " ")}</p>{block.title && <h2 className="mt-1 text-lg font-bold">{block.title}</h2>}{(() => { const gated = guidedMode && ["method","example","application","mistake","pattern"].includes(block.type) && !revealedBlocks.includes(block.id); return gated ? <div className="mt-3 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--surface)] p-4"><p className="text-sm font-semibold">Reasoning hidden</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Try to explain the idea yourself before revealing this part.</p><button type="button" onClick={() => setRevealedBlocks(current => [...current, block.id])} className="mt-3 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-bold text-[var(--primary-foreground)]">Reveal reasoning</button></div> : <div className="mt-3 whitespace-pre-line text-sm leading-7">{block.content}</div>})()}{block.sourcePages?.length ? <p className="mt-3 text-[10px] font-semibold text-[var(--muted-foreground)]">Source pages: {block.sourcePages.join(", ")}</p> : null}</div></div></article>;
            const done = completedIds.has(block.id); const selected = currentId === block.id;
            return <article key={block.id || `${block.type}-${index}`} className={`rounded-2xl border bg-[var(--card)] p-5 sm:p-6 ${selected ? "border-[var(--primary)] shadow-sm" : "border-[var(--card-border)]"}`}>
              <button type="button" onClick={() => selectCheckpoint(block.id)} className="flex w-full items-start gap-3 text-left">
                <div className="mt-0.5 rounded-lg bg-[var(--primary-glow)] p-2">{done ? <Check className="h-4 w-4 text-[var(--primary)]" /> : <Lightbulb className="h-4 w-4 text-[var(--primary)]" />}</div>
                <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">{done ? "mastered" : block.type.replace(/-/g, " ")}</p>{block.title && <h2 className="mt-1 text-lg font-bold">{block.title}</h2>}{guidedMode && ["method","example","application","mistake","pattern"].includes(block.type) && !revealedBlocks.includes(block.id) ? <div className="mt-2 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--surface)] p-3 text-xs text-[var(--muted-foreground)]"><p>Reasoning hidden in Guided mode. Try to explain the idea before opening it.</p><button type="button" onClick={() => setRevealedBlocks(current => [...current, block.id])} className="mt-2 rounded-lg bg-[var(--primary)] px-3 py-2 font-bold text-[var(--primary-foreground)]">Reveal reasoning</button></div> : <div className="mt-2 whitespace-pre-line text-sm leading-7">{block.content}</div>}{block.sourcePages?.length ? <p className="mt-2 text-[10px] font-semibold text-[var(--muted-foreground)]">Source pages: {block.sourcePages.join(", ")}</p> : null}</div>
                {done && <span className="shrink-0 rounded-full bg-[var(--primary-glow)] px-2.5 py-1 text-[10px] font-black text-[var(--primary)]">Done</span>}
              </button>

              {selected && block.interaction?.prompt && !done && <div className="mt-5 border-t border-[var(--card-border)] pt-5">
                <p className="text-sm font-bold">Your turn</p><p className="mt-2 whitespace-pre-line text-sm leading-7">{block.interaction.prompt}</p>
                <textarea value={answer} onChange={e => setAnswer(e.target.value)} disabled={checking || offline} rows={6} placeholder="Show your reasoning. It is okay to be unsure." className="mt-4 w-full resize-y rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4 text-sm outline-none focus:border-[var(--primary)]" />
                {hint && <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4 text-sm leading-6"><div className="flex items-center gap-2 font-bold"><Lightbulb className="h-4 w-4 text-[var(--primary)]" /> Hint</div><p className="mt-2">{hint}</p></div>}
                {result && <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><p className="text-sm font-black uppercase tracking-wide">{result.verdict.replace("_", " ")}</p><p className="mt-2 text-sm leading-6">{result.feedback}</p>{result.misconception && <p className="mt-2 text-sm leading-6"><span className="font-bold">What to fix:</span> {result.misconception}</p>}{result.nextAction && <p className="mt-2 text-sm leading-6"><span className="font-bold">Next:</span> {result.nextAction}</p>}{result.solution && <div className="mt-3 border-t border-[var(--card-border)] pt-3 text-sm leading-6"><span className="font-bold">Reference solution:</span><p className="mt-1 whitespace-pre-line">{result.solution}</p></div>}
                  {result.verdict === "correct" && <button type="button" onClick={continueToNext} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-[var(--primary-foreground)]">{completedCount + 1 >= checkpoints.length ? "Finish session" : "Continue to next checkpoint"}<ChevronRight className="h-4 w-4" /></button>}
                </div>}
                {revealed && <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4 text-sm leading-6"><p className="font-bold">Reference solution</p><p className="mt-2 whitespace-pre-line">{revealed}</p></div>}
                {actionError && <p className="mt-3 text-sm font-semibold">{actionError}</p>}
                {interaction && <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><p className="text-sm leading-7 whitespace-pre-line">{interaction.message}</p>{interaction.question && !transferQuestion && <div className="mt-3 border-t border-[var(--card-border)] pt-3"><p className="text-sm font-bold">New mastery question</p><p className="mt-2 text-sm leading-7 whitespace-pre-line">{interaction.question}</p></div>}</div>}
                {transferQuestion && <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><p className="text-xs font-black uppercase tracking-wider text-[var(--primary)]">Transfer challenge</p><p className="mt-2 text-sm leading-7 whitespace-pre-line">{transferQuestion}</p><textarea value={transferAnswer} onChange={e => setTransferAnswer(e.target.value)} disabled={checking || offline || !!transferResult} rows={5} placeholder="Solve the new problem. Show your reasoning." className="mt-4 w-full resize-y rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm outline-none focus:border-[var(--primary)]" /><button type="button" onClick={submitTransfer} disabled={checking || offline || !transferAnswer.trim() || !!transferResult} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-[var(--primary-foreground)] disabled:opacity-50">{checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit transfer</button>{transferResult && <div className="mt-4 border-t border-[var(--card-border)] pt-4"><p className="text-sm font-black uppercase tracking-wide">{transferResult.verdict?.replace("_", " ")}</p><p className="mt-2 text-sm leading-6">{transferResult.feedback}</p>{transferResult.misconception && <p className="mt-2 text-sm leading-6"><span className="font-bold">What to fix:</span> {transferResult.misconception}</p>}{transferResult.nextAction && <p className="mt-2 text-sm leading-6"><span className="font-bold">Next:</span> {transferResult.nextAction}</p>}</div>}</div>}
                <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => checkpointAction("submit")} disabled={checking || offline} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-[var(--primary-foreground)] disabled:opacity-50">{checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Check my reasoning</button><button type="button" onClick={() => checkpointAction("hint")} disabled={checking || offline} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-bold disabled:opacity-50"><Lightbulb className="h-4 w-4" /> Give me a hint</button><button type="button" onClick={() => checkpointAction("reveal")} disabled={checking || offline} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Show solution</button><button type="button" onClick={() => learningAction("teach-page")} disabled={checking || offline} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><BookOpen className="h-4 w-4" /> Teach this page</button><button type="button" onClick={() => learningAction("explain-step")} disabled={checking || offline} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Explain this step</button><button type="button" onClick={() => learningAction("why")} disabled={checking || offline} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Why?</button><button type="button" onClick={() => learningAction("quiz")} disabled={checking || offline} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Quiz me</button></div>
              </div>}
            </article>;
          })}
        </section>

        {checkpoints.length === 0 && <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--primary)]" /><div><h2 className="font-bold">This session has no interactive checks yet</h2><p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">Generate a new paper session to get the interactive Cortex tutor layer.</p></div></div></section>}
        {allComplete && <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--primary)]" /><div><h2 className="font-bold">Paper session mastered</h2><p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">Cortex has recorded the checkpoint evidence. Those signals now feed the learner's topic mastery and revision queue.</p><button type="button" onClick={() => router.push("/learn")} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-[var(--primary-foreground)]">Return to Learn <ChevronRight className="h-4 w-4" /></button></div></div></section>}
      </div>
    </main>
  );
}
