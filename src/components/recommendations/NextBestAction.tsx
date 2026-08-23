"use client";

import { ArrowRight, Clock3, Sparkles } from "lucide-react";
import type { RecommendedStudyAction } from "@/lib/recommendation-engine/types";

interface NextBestActionProps {
  recommendation: RecommendedStudyAction | null | undefined;
  href?: string;
  onStart?: () => void;
  loading?: boolean;
  className?: string;
}

const priorityLabel: Record<RecommendedStudyAction["priority"], string> = {
  critical: "Critical",
  high: "High priority",
  medium: "Recommended",
  low: "Optional",
};

/**
 * A compact, reusable surface for the recommendation engine's next action.
 * It intentionally accepts the engine's existing output type rather than
 * introducing a second recommendation contract in the UI.
 */
export function NextBestAction({
  recommendation,
  href,
  onStart,
  loading = false,
  className = "",
}: NextBestActionProps) {
  if (loading) {
    return (
      <section
        aria-label="Loading your next best action"
        className={`rounded-2xl border border-border/60 bg-card p-5 shadow-sm ${className}`}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-7 w-3/4 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-10 w-28 rounded-xl bg-muted" />
        </div>
      </section>
    );
  }

  if (!recommendation) {
    return (
      <section
        aria-label="No recommendation available"
        className={`rounded-2xl border border-border/60 bg-card p-5 shadow-sm ${className}`}
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Next best action</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep studying at your own pace. Your next recommendation will appear here when enough learning data is available.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const action = recommendation.action.trim() || "Continue studying";
  const reason = recommendation.reason.trim() || "This is the next useful step based on your current study progress.";
  const minutes = Math.max(0, Math.round(recommendation.estimatedTime));
  const priority = priorityLabel[recommendation.priority];
  const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <section
      aria-labelledby="next-best-action-title"
      className={`overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ${className}`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Next best action
              </p>
              <h2 id="next-best-action-title" className="mt-1 text-xl font-bold tracking-tight text-foreground">
                {action}
              </h2>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {priority}
          </span>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{reason}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {minutes > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock3 className="size-4" aria-hidden="true" />
              {minutes} min
            </span>
          )}
          <span className="text-xs font-medium capitalize text-muted-foreground">{recommendation.category}</span>
        </div>

        <div className="mt-5">
          {href ? (
            <a href={href} onClick={onStart} className={buttonClass}>
              Start now
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          ) : (
            <button type="button" onClick={onStart} className={buttonClass}>
              Start now
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
