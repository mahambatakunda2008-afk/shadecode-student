"use client";

import { useMemo, useState } from "react";
import { REVIEW_VERDICTS, type ReviewVerdict } from "@/lib/exam/curated/registry";
import type { ReviewItem } from "@/lib/teacher/reviewItems";

export interface StoredReview {
  question_id: string;
  verdict: ReviewVerdict;
  note: string | null;
  reviewer_id: string;
  reviewed_at: string;
}

interface Props {
  items: ReviewItem[];
  groups: { id: string; label: string }[];
  reviews: StoredReview[];
  reviewerId: string;
  initialGroup: string;
}

type Filter = "todo" | "flagged" | "all";

function verdictLabel(verdict: ReviewVerdict, group: string): string {
  if (verdict === "wrong_answer") return group === "lesson" || group === "tutorial" ? "Factual error" : "Wrong answer";
  return { correct: "Correct", ambiguous: group === "lesson" || group === "tutorial" ? "Unclear" : "Ambiguous", out_of_syllabus: "Out of syllabus" }[verdict];
}

export function ReviewClient({ items, groups, reviews, reviewerId, initialGroup }: Props) {
  const [mine, setMine] = useState<Record<string, StoredReview>>(() =>
    Object.fromEntries(reviews.filter((r) => r.reviewer_id === reviewerId).map((r) => [r.question_id, r])),
  );
  const [group, setGroup] = useState<string>(initialGroup);
  const [filter, setFilter] = useState<Filter>("todo");
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inGroup = useMemo(() => items.filter((i) => i.group === group), [items, group]);
  const reviewedCount = inGroup.filter((i) => mine[i.id]).length;
  const flaggedCount = inGroup.filter((i) => mine[i.id] && mine[i.id].verdict !== "correct").length;

  const queue = useMemo(
    () =>
      inGroup.filter((i) => {
        const r = mine[i.id];
        if (filter === "todo") return !r;
        if (filter === "flagged") return r && r.verdict !== "correct";
        return true;
      }),
    [inGroup, mine, filter],
  );

  const position = Math.min(index, Math.max(queue.length - 1, 0));
  const current = queue[position];
  const existing = current ? mine[current.id] : undefined;

  function reset() {
    setIndex(0);
    setNote("");
    setError(null);
  }

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
      // In the "todo" queue the saved item leaves the list, so the same position now points at the next item.
      if (filter !== "todo") go(position + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const pct = inGroup.length ? Math.round((reviewedCount / inGroup.length) * 100) : 0;
  const isLesson = group === "lesson" || group === "tutorial";

  return (
    <div className="flex flex-col gap-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Review</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {isLesson
            ? "Read each lesson: are the facts right, is it clear, and does it match the syllabus?"
            : "Check each question: is the marked answer right, is it unambiguous, and is it on the syllabus?"}
        </p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Content type">
        {groups.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={group === g.id}
            onClick={() => { setGroup(g.id); reset(); }}
            className={`whitespace-nowrap rounded-2xl border px-4 py-2 text-sm transition ${group === g.id ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span>{reviewedCount} of {inGroup.length} reviewed</span>
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
            onClick={() => { setFilter(f); reset(); }}
            className={`rounded-xl px-3 py-1.5 transition ${filter === f ? "bg-[var(--surface-2)] font-medium" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
          >
            {f === "todo" ? "To review" : f === "flagged" ? "My flags" : "All"}
          </button>
        ))}
      </div>

      {!current ? (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted-foreground)]">
          {filter === "todo" ? "Everything here is reviewed. Switch tab or open “All” to revisit." : "Nothing here yet."}
        </div>
      ) : (
        <section className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span>{current.topic}</span>
            <span>{position + 1} / {queue.length}</span>
          </div>
          <h2 className="text-lg font-medium leading-snug">{current.title}</h2>

          {current.options && (
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
          )}

          {current.body !== undefined && (
            <div className="max-h-80 overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3">
              {current.body ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{current.body}</p>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">This lesson has no readable text.</p>
              )}
            </div>
          )}

          {current.media && current.media.length > 0 && (
            <div className="space-y-3">
              {current.media.map((m, i) =>
                m.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`${m.url}-${i}`} src={m.url} alt={m.label || "Tutorial image"} loading="lazy" className="max-h-80 w-full rounded-xl border border-[var(--card-border)] object-contain" />
                ) : (
                  <div key={`${m.url}-${i}`} className="aspect-video overflow-hidden rounded-xl border border-[var(--card-border)]">
                    <iframe src={m.url} title={m.label || "Tutorial video"} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="h-full w-full" />
                  </div>
                ),
              )}
            </div>
          )}

          {existing && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Your verdict: {verdictLabel(existing.verdict, group)}{existing.note ? ` — ${existing.note}` : ""}
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
                {verdictLabel(v, group)}
              </button>
            ))}
          </div>

          <div className="flex justify-between text-sm">
            <button onClick={() => go(position - 1)} disabled={position <= 0} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30">← Previous</button>
            <button onClick={() => go(position + 1)} disabled={position >= queue.length - 1} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30">Skip →</button>
          </div>
        </section>
      )}
    </div>
  );
}
