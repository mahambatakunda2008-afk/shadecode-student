"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EvidenceBasedReviewSuggestion } from "@/lib/cortex/review-suggestions";

type LoadState = "loading" | "ready" | "unavailable";

const SUBJECT_LABEL: Record<string, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  mathematics: "Mathematics",
};

function formatLastPractised(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function CortexReviewSuggestions() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<EvidenceBasedReviewSuggestion[]>([]);
  const [reviewActivity, setReviewActivity] = useState<Array<{ subjectKey: string; topicId: string; answeredQuestionCount: number; state: "practised" | "completed" }>>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/cortex/student-context", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("context unavailable");
        return response.json();
      })
      .then((context: { reviewSuggestions?: { items?: EvidenceBasedReviewSuggestion[] }; reviewActivity?: { sessions?: Array<{ subjectKey: string; topicId: string; answeredQuestionCount: number; state: "practised" | "completed" }> } }) => {
        if (!active) return;
        setItems(Array.isArray(context.reviewSuggestions?.items) ? context.reviewSuggestions.items : []);
        setReviewActivity(Array.isArray(context.reviewActivity?.sessions) ? context.reviewActivity.sessions : []);
        setState("ready");
      })
      .catch(() => {
        if (active) setState("unavailable");
      });
    return () => { active = false; };
  }, []);

  if (state === "loading") {
    return <p role="status" className="mb-5 text-xs text-[var(--muted-foreground)]">Checking your learning history for useful review suggestions…</p>;
  }

  if (state === "unavailable" || items.length === 0) return null;

  return (
    <section aria-labelledby="cortex-review-heading" className="mb-7 rounded-2xl border border-[var(--primary)]/25 bg-[var(--card)] p-4 shadow-lg">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="cortex-review-heading" className="text-sm font-semibold text-[var(--foreground)]">Suggested from your learning history</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Practice suggestions based on your recorded attempts, not predicted forgetting.</p>
        </div>
        <span className="rounded-full bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">{items.length} topics</span>
      </div>

      <ul className="grid gap-2">
        {items.slice(0, 5).map((item) => {
          const lastPractised = formatLastPractised(item.lastObservedAt);
          const latestActivity = reviewActivity.find((activity) => activity.subjectKey === item.subjectKey.toLocaleLowerCase() && activity.topicId === item.topicId.toLocaleLowerCase());
          const subject = SUBJECT_LABEL[item.subjectKey] ?? item.subjectKey;
          const reason = item.reason === "repeated_errors"
            ? `Incorrect answers across ${item.distinctAttempts} separate attempts`
            : `Practised across ${item.distinctAttempts} separate attempts`;

          return (
            <li key={`${item.subjectKey}:${item.topicId}`} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[var(--muted-foreground)]">{subject}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[var(--foreground)]">{item.topicId}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{reason}{lastPractised ? ` · Last practised ${lastPractised}` : ""}</p>
                {latestActivity && <p className="mt-1 text-xs font-medium text-[var(--success)]">{latestActivity.state === "completed" ? "Review quiz completed" : "Practice recorded"} · {latestActivity.answeredQuestionCount} questions answered</p>}
                {item.observedMedianIntervalDays !== null && (
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">Observed practice interval: median {item.observedMedianIntervalDays} days</p>
                )}
              </div>
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.priority === "high" ? "bg-amber-500/10 text-amber-500" : "bg-white/5 text-[var(--muted-foreground)]"}`}>
                {item.priority === "high" ? "Review priority" : "Keep practising"}
              </span>
              <button
                type="button"
                onClick={() => {
                  const reviewSessionId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                    ? crypto.randomUUID()
                    : `review-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                  try {
                    sessionStorage.setItem("shadecode:cortex:active-review:v1", JSON.stringify({
                      reviewSessionId,
                      subjectKey: item.subjectKey,
                      topicId: item.topicId,
                      startedAt: new Date().toISOString(),
                    }));
                  } catch {}
                  router.push(`/learn?subject=${encodeURIComponent(item.subjectKey)}&topic=${encodeURIComponent(item.topicId)}`);
                }}
                className="h-9 shrink-0 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
              >
                Practise
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-[var(--muted-foreground)]">These are evidence-backed prompts. No due date or retention score is inferred.</p>
    </section>
  );
}
