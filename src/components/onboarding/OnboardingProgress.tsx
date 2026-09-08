'use client';

interface Props {
  currentStep: number;
  totalSteps: number;
  labels: readonly string[];
}

export function OnboardingProgress({ currentStep, totalSteps, labels }: Props) {
  const pct = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div style={{ width: '100%', marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        {labels.map((label, i) => {
          const n = i + 1;
          const isComplete = n < currentStep;
          const isActive = n === currentStep;
          return (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: isComplete ? 'var(--primary)' : isActive ? 'var(--primary-glow)' : 'var(--muted)', border: isActive ? '2px solid var(--primary)' : '2px solid transparent', color: isComplete ? 'var(--primary-foreground)' : isActive ? 'var(--primary)' : 'var(--muted-foreground)', transition: 'all 300ms' }}>
                {isComplete ? '✓' : n}
              </div>
              <span style={{ fontSize: 10, color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)', transition: 'color 300ms' }} className="sm:block">{label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ height: 2, borderRadius: 999, background: 'var(--muted)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: 'var(--brand-gradient)', transition: 'width 500ms cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  );
}
