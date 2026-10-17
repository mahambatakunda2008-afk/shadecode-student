'use client';

interface Props { currentStep: number; totalSteps: number; labels: readonly string[]; }

export function OnboardingProgress({ currentStep, totalSteps, labels }: Props) {
  const safeTotal = Math.max(1, totalSteps);
  const safeStep = Math.min(safeTotal, Math.max(1, currentStep));
  const pct = safeTotal === 1 ? 100 : ((safeStep - 1) / (safeTotal - 1)) * 100;

  return (
    <div style={{ width: '100%', marginBottom: 20 }}>
      <div
        role="group"
        aria-label={`Account setup, step ${safeStep} of ${safeTotal}: ${labels[safeStep - 1] ?? 'Current step'}`}
        style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 9 }}
      >
        {labels.slice(0, safeTotal).map((label, i) => {
          const n = i + 1;
          const complete = n < safeStep;
          const active = n === safeStep;
          return (
            <div
              key={label}
              aria-current={active ? 'step' : undefined}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 0, flex: '1 1 0' }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 27,
                  height: 27,
                  flexShrink: 0,
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 750,
                  background: complete ? 'var(--primary)' : active ? 'var(--primary-glow)' : 'var(--surface-2)',
                  border: active ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  color: complete ? 'var(--primary-foreground)' : active ? 'var(--primary)' : 'var(--muted-foreground)',
                }}
              >
                {complete ? '✓' : n}
              </div>
              <span
                style={{
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: 'clamp(9px, 2.5vw, 11px)',
                  lineHeight: 1.3,
                  color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                  fontWeight: active ? 700 : 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={1}
        aria-valuemax={safeTotal}
        aria-valuenow={safeStep}
        aria-valuetext={`Step ${safeStep} of ${safeTotal}`}
        style={{ height: 3, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}
      >
        <div
          aria-hidden="true"
          style={{
            height: '100%',
            borderRadius: 999,
            width: `${pct}%`,
            background: 'var(--primary)',
            transition: 'width 240ms ease',
          }}
        />
      </div>
    </div>
  );
}
