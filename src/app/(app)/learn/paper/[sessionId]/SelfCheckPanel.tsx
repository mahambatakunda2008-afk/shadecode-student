"use client";

import { Check, HelpCircle, Lightbulb, X } from "lucide-react";
import SelfCheckPractice from "./SelfCheckPractice";

export type SelfRating = "got_it" | "unsure" | "not_yet";

type Props = {
  sessionId: string;
  blockId: string;
  concepts: string[];
  busy: boolean;
  onRate: (rating: SelfRating) => void;
  onHint: () => void;
  onReveal: () => void;
};

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-bold transition-colors hover:bg-[var(--primary-glow)] disabled:opacity-50";

/**
 * Model-free checkpoint: the AI could not mark this session, so the student
 * compares their answer with the official syllabus points and rates it.
 */
export default function SelfCheckPanel({ sessionId, blockId, concepts, busy, onRate, onHint, onReveal }: Props) {
  return (
    <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-black uppercase tracking-wide text-[var(--primary)]">Self-check</p>
      {concepts.length > 0 ? (
        <>
          <p className="mt-2 text-sm font-bold">Does your answer cover these syllabus points?</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
            {concepts.map((concept) => <li key={concept}>{concept}</li>)}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm leading-6">Compare your answer with your mark scheme.</p>
      )}

      <p className="mt-4 text-sm font-bold">How did your answer compare?</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button type="button" disabled={busy} onClick={() => onRate("got_it")} className={button}><Check className="h-4 w-4" aria-hidden /> Got it</button>
        <button type="button" disabled={busy} onClick={() => onRate("unsure")} className={button}><HelpCircle className="h-4 w-4" aria-hidden /> Unsure</button>
        <button type="button" disabled={busy} onClick={() => onRate("not_yet")} className={button}><X className="h-4 w-4" aria-hidden /> Not yet</button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={onHint} className={button}><Lightbulb className="h-4 w-4" aria-hidden /> Give me a hint</button>
        <button type="button" disabled={busy} onClick={onReveal} className={button}>Show the points</button>
      </div>
      {concepts.length > 0 && <SelfCheckPractice sessionId={sessionId} blockId={blockId} />}
      <p className="mt-3 text-xs text-[var(--muted-foreground)]">AI marking is unavailable for this session, so you rate your own answer. It still updates your mastery, just with less weight than a marked answer.</p>
    </div>
  );
}
