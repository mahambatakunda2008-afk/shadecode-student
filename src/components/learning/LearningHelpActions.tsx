"use client";

import { LEARNING_HELP_ACTIONS, type LearningHelpAction } from "@/lib/learning/helpActions";

interface LearningHelpActionsProps {
  onAction: (action: LearningHelpAction, prompt: string) => void;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
}

/** Shared student-agency controls for tutoring, checking and post-assessment review. */
export default function LearningHelpActions({
  onAction,
  disabled = false,
  compact = false,
  label = "Need a different kind of help?",
}: LearningHelpActionsProps) {
  return (
    <section aria-label="Choose a different kind of help" className={compact ? "space-y-2" : "space-y-3"}>
      <p className="text-xs font-bold text-[var(--muted-foreground)]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {LEARNING_HELP_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={disabled}
            onClick={() => onAction(action.id, action.prompt)}
            className="min-h-10 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-left text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
