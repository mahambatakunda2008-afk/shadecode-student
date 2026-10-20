"use client";

export interface LearningEvidenceItem {
  label: string;
  value: string;
}

interface LearningEvidenceTraceProps {
  title: string;
  items: LearningEvidenceItem[];
  note: string;
  compact?: boolean;
}

/**
 * Shared progress language. Each surface supplies evidence it actually has;
 * the component never converts activity counts into a mastery claim.
 */
export default function LearningEvidenceTrace({
  title,
  items,
  note,
  compact = false,
}: LearningEvidenceTraceProps) {
  return (
    <section
      aria-label={title}
      className={compact ? "rounded-xl border border-[var(--card-border)] p-3" : "rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"}
    >
      <p className="text-xs font-bold text-[var(--muted-foreground)]">{title}</p>
      <div className={compact ? "mt-2 grid grid-cols-2 gap-2" : "mt-3 grid grid-cols-2 gap-3"}>
        {items.map((item) => (
          <div key={item.label} className="min-w-0 rounded-xl bg-[var(--muted)] px-3 py-2">
            <p className="text-[10px] leading-4 text-[var(--muted-foreground)]">{item.label}</p>
            <p className="mt-0.5 break-words text-sm font-bold text-[var(--foreground)]">{item.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[var(--muted-foreground)]">{note}</p>
    </section>
  );
}
