"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { REVIEW_VERDICTS, type ReviewableQuestion, type ReviewVerdict } from "@/lib/exam/curated/registry";

export interface StoredReview {
  question_id: string;
  verdict: ReviewVerdict;
  note: string | null;
  reviewer_id: string;
  reviewed_at: string;
}

interface Props {
  questions: ReviewableQuestion[];
  banks: { id: string; label: string }[];
  reviews: StoredReview[];
  reviewerId: string;
  isAdmin: boolean;
}

type Filter = "todo" | "flagged" | "all";

const VERDICT_LABEL: Record<ReviewVerdict, string> = {
  correct: "Correct",
  wrong_answer: "Wrong answer",
  ambiguous: "Ambiguous",
  out_of_syllabus: "Out of syllabus",
};

export function ReviewClient({ questions, banks, reviews, reviewerId, isAdmin }: Props) {
  const [mine, setMine] = useState<Record<string, StoredReview>>(() =>
    Object.fromEntries(reviews.filter((r) => r.reviewer_id === reviewerId).map((r) => [r.question_id, r])),
  );
  const [bank, setBank] = useState<string>(banks[0]?.id ?? "");
  const [filter, setFilter] = useState<Filter>("todo");
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inBank = useMemo(() => questions.filter((q) => q.bank === bank), [questions, bank]);
  const reviewedCount = inBank.filter((q) => mine[q.id]).length;
  const flaggedCount = inBank.filter((q) => mine[q.id] && mine[q.id].verdict !== "correct").length;

  const queue = useMemo(
    () =>
      inBank.filter((q) => {
        const r = mine[q.id];
        if (filter === "todo") return !r;
        if (filter === "flagged") return r && r.verdict !== "correct";
        return true;
      }),
    [inBank, mine, filter],
  );

  const current = queue[Math.min(index, Math.max(queue.length - 1, 0))];
  const existing = current ? mine[current.id] : undefined;

  function go(next: number) {
    setIndex(Math.max(0, Math.min(next, queue.length - 1)));
    setNote("");
    setError(null);
  }

  async function submit(verdict: ReviewVerdict) {
    if (!current || saving) return;
    const text = note.trim() || (existing?.verdict === verdict ? existing.note ?? "" : "");
    if (verdict !== "correct" && !text) {
      setError("Add a short note so the fix is clear.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: current.id, verdict, note: text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Could not save. Try again.");
      setMine((prev) => ({
        ...prev,
        [current.id]: { question_id: current.id, verdict, note: text || null, reviewer_id: reviewerId, reviewed_at: new Date().toISOString() },
      }));
      setNote("");
      // In the "todo" queue the saved item leaves the list, so the same index now points at the next question.
      if (filter !== "todo") go(index + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const pct = inBank.length ? Math.round((reviewedCount / inBank.length) * 100) : 0;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 bg-[var(--background)] px-4 py-6 text-[var(--foreground)]">
      <header className="space-y-1">
        <Link href={isAdmin ? "/admin" : "/"} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">← {isAdmin ? "Admin" : "Home"}</Link>
        <h1 className="text-xl font-semibold">Content review</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Check each question: is the marked answer right, is it unambiguous, and is it on the Form 1–4 syllabus?
        </p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Question bank">
        {banks.map((b) => (
          <button
            key={b.id}
            role="tab"
            aria-selected={bank === b.id}
            onClick={() => { setBank(b.id); setIndex(0); setNote(""); setError(null); }}
            className={`whitespace-nowrap rounded-2xl border px-4 py-2 text-sm transition ${bank === b.id ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span>{reviewedCount} of {inBank.length} reviewed</span>
          <span className="text-[var(--muted-foreground)]">{flaggedCount} flagged</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--brand-gradient)" }} />
        </div>
      </div>

      <div className="flex gap-2 text-sm" role="tablist" aria-label="Queue filter">
        {(["todo", "flagged", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => { setFilter(f); setIndex(0); setNote(""); setError(null); }}
            className={`rounded-xl px-3 py-1.5 transition ${filter === f ? "bg-[var(--surface-2)] font-medium" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
          >
            {f === "todo" ? "To review" : f === "flagged" ? "My flags" : "All"}
          </button>
        ))}
      </div>

      {!current ? (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted-foreground)]">
          {filter === "todo" ? "Everything in this bank is reviewed. Switch bank or open “All” to revisit." : "Nothing here yet."}
        </div>
      ) : (
        <section className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span>{current.topic}</span>
            <span>{Math.min(index, queue.length - 1) + 1} / {queue.length}</span>
          </div>
          <h2 className="text-lg font-medium leading-snug">{current.question}</h2>
          <ul className="space-y-2">
            {current.options.map((o) => {
              const isAnswer = o === current.answer;
              return (
                <li key={o} className={`rounded-xl border px-3 py-2 text-sm ${isAnswer ? "border-[var(--success)] bg-[var(--success-soft)]" : "border-[var(--card-border)]"}`}>
                  {o}
                  {isAnswer && <span className="ml-2 text-xs text-[var(--success)]">marked answer</span>}
                </li>
              );
            })}
          </ul>

          {existing && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Your verdict: {VERDICT_LABEL[existing.verdict]}{existing.note ? ` — ${existing.note}` : ""}
            </p>
          )}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Note (required unless correct): what is wrong, or what it should say"
            className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          />
          {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}

          <div className="grid grid-cols-2 gap-2">
            {REVIEW_VERDICTS.map((v) => (
              <button
                key={v}
                disabled={saving}
                onClick={() => submit(v)}
                className={`min-h-11 rounded-2xl border px-3 py-2 text-sm transition disabled:opacity-50 ${v === "correct" ? "border-[var(--success)] hover:bg-[var(--success-soft)]" : "border-[var(--card-border)] hover:bg-[var(--surface-2)]"}`}
              >
                {VERDICT_LABEL[v]}
              </button>
            ))}
          </div>

          <div className="flex justify-between text-sm">
            <button onClick={() => go(index - 1)} disabled={index <= 0} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30">← Previous</button>
            <button onClick={() => go(index + 1)} disabled={index >= queue.length - 1} className="">Skip →</button>
          </div>
        </section>
      )}
    </div>
  );
}
