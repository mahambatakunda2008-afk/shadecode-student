"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";

type Practice = { seed: number; generator: string; question: string; marks: number };
type Outcome = { correct: boolean; answer: string; working: string; hint?: string };
type Phase = "idle" | "loading" | "question" | "checking" | "result" | "unavailable" | "error";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-bold transition-colors hover:bg-[var(--primary-glow)] disabled:opacity-50";

/**
 * A fresh, exactly-marked question on the checkpoint's syllabus topic. Built and
 * marked on the server from a seed, so it works with no AI and the answer never
 * reaches the browser until after the student has tried.
 */
export default function SelfCheckPractice({ sessionId, blockId }: { sessionId: string; blockId: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [practice, setPractice] = useState<Practice | null>(null);
  const [answer, setAnswer] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const endpoint = `/api/learn/paper/${encodeURIComponent(sessionId)}/practice`;

  async function call(body: object) {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  }

  async function next() {
    setPhase("loading");
    setAnswer("");
    setOutcome(null);
    try {
      const { ok, status, data } = await call({ blockId, action: "new" });
      if (ok) { setPractice(data as Practice); setPhase("question"); }
      else setPhase(status === 404 ? "unavailable" : "error");
    } catch { setPhase("error"); }
  }

  async function check() {
    if (!practice || !answer.trim()) return;
    setPhase("checking");
    try {
      const { ok, status, data } = await call({ blockId, action: "check", seed: practice.seed, generator: practice.generator, answer });
      if (ok) { setOutcome(data as Outcome); setPhase("result"); }
      else setPhase(status === 404 ? "unavailable" : "error");
    } catch { setPhase("error"); }
  }

  if (phase === "unavailable") return <p className="mt-3 text-xs text-[var(--muted-foreground)]">No practice question is available for this topic yet.</p>;

  return (
    <div className="mt-3">
      {phase === "idle" && <button type="button" onClick={() => void next()} className={button}>Try a fresh question on this topic</button>}
      {(phase === "loading") && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Preparing a question…</p>}
      {phase === "error" && <div role="alert" className="text-sm"><p>Couldn't get a practice question. Please try again.</p><button type="button" onClick={() => void next()} className={`${button} mt-2`}>Try again</button></div>}

      {(phase === "question" || phase === "checking" || phase === "result") && practice && (
        <div className="rounded-2xl border border-[var(--card-border)] p-4">
          <p className="text-xs font-black uppercase tracking-wide text-[var(--primary)]">Fresh question · {practice.marks} mark{practice.marks === 1 ? "" : "s"}</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-7">{practice.question}</p>
          <label className="sr-only" htmlFor={`practice-${blockId}`}>Your answer</label>
          <input
            id={`practice-${blockId}`}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && phase === "question") void check(); }}
            disabled={phase !== "question"}
            inputMode="decimal"
            placeholder="Your answer"
            className="mt-3 h-11 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)]"
          />
          {phase !== "result" ? (
            <button type="button" onClick={() => void check()} disabled={phase === "checking" || !answer.trim()} className={`${button} mt-3`}>
              {phase === "checking" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Check
            </button>
          ) : outcome && (
            <div role="status" className="mt-3 rounded-xl bg-[var(--surface)] p-3 text-sm leading-6">
              <p className="font-bold">{outcome.correct ? "Correct." : `Not quite. The answer is ${outcome.answer}.`}</p>
              {!outcome.correct && outcome.hint && <p className="mt-1">{outcome.hint}</p>}
              {outcome.working && <p className="mt-1 text-[var(--muted-foreground)]">{outcome.working}</p>}
              <button type="button" onClick={() => void next()} className={`${button} mt-3`}><RotateCcw className="h-4 w-4" aria-hidden /> Another one</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
