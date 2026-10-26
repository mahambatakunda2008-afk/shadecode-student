"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MessageSquareText, X } from "lucide-react";
import { trackEvent } from "@/lib/traction/client";

const STORAGE_KEY = "shadecode:review-prompt:v1";
const VISITS_BEFORE_PROMPT = 5;
const SNOOZE_DAYS = 30;

type ReviewState = { visits: number; dismissedUntil?: number; completed?: boolean };

function readState(): ReviewState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { visits: 0 };
    const value = JSON.parse(raw) as ReviewState;
    return {
      visits: Number.isFinite(value.visits) ? Math.max(0, value.visits) : 0,
      dismissedUntil: Number.isFinite(value.dismissedUntil) ? value.dismissedUntil : undefined,
      completed: value.completed === true,
    };
  } catch {
    return { visits: 0 };
  }
}

function writeState(value: ReviewState) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {}
}

/**
 * A low-pressure review invitation. It is shown only after repeated app use,
 * only when a public destination is configured, and never blocks study flows.
 */
export default function ReviewPrompt() {
  const [visible, setVisible] = useState(false);
  const reviewUrl = process.env.NEXT_PUBLIC_REVIEW_URL?.trim();

  useEffect(() => {
    if (!reviewUrl || !/^https:\/\//i.test(reviewUrl)) return;
    const state = readState();
    if (state.completed || (state.dismissedUntil && state.dismissedUntil > Date.now())) return;

    const next = { ...state, visits: state.visits + 1 };
    writeState(next);
    if (next.visits >= VISITS_BEFORE_PROMPT) {
      setVisible(true);
      void trackEvent("review_prompt_shown", { source: "app_usage_threshold" });
    }
  }, [reviewUrl]);

  if (!visible || !reviewUrl) return null;

  const snooze = () => {
    const state = readState();
    writeState({ ...state, dismissedUntil: Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000 });
    void trackEvent("review_prompt_dismissed", { choice: "not_now" });
    setVisible(false);
  };

  const leaveReview = () => {
    const state = readState();
    writeState({ ...state, completed: true });
    void trackEvent("review_prompt_clicked", { destination: "configured_public_review" });
    setVisible(false);
    window.open(reviewUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <aside className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-[9000] w-[min(22rem,calc(100vw-1.5rem))] md:bottom-5 md:right-5" aria-label="Share your experience">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-raised)] p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><MessageSquareText size={18} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="pr-5 text-sm font-semibold text-[var(--foreground)]">Has Shadecode helped your study?</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">If you have a moment, an honest public review helps other students decide whether to try it. Feedback, including criticism, is welcome.</p>
          </div>
          <button type="button" onClick={snooze} className="rounded-lg p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]" aria-label="Not now"><X size={16} /></button>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button type="button" onClick={snooze} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]">Not now</button>
          <button type="button" onClick={leaveReview} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90">Leave a review <ExternalLink size={13} aria-hidden="true" /></button>
        </div>
      </div>
    </aside>
  );
}
