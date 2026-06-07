'use client';

interface Props {
  currentStep: number;
  totalSteps:  number;
  labels:      readonly string[];
}

export function OnboardingProgress({ currentStep, totalSteps, labels }: Props) {
  const pct = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div style={{ width: '100%', marginBottom: 28 }}>
      {/* Dot + label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        {labels.map((label, i) => {
          const n          = i + 1;
          const isComplete = n < currentStep;
          const isActive   = n === currentStep;
          return (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 600,
                background:  isComplete ? 'rgb(124,58,237)' : isActive ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.06)',
                border:      isActive ? '2px solid rgb(124,58,237)' : '2px solid transparent',
                color:       isComplete || isActive ? 'rgb(167,139,250)' : 'rgba(255,255,255,0.22)',
                transition:  'all 300ms',
              }}>
                {isComplete ? '✓' : n}
              </div>
              <span style={{
                fontSize: 10, color: isActive ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.22)',
                display: 'none',
                transition: 'color 300ms',
              }}
                className="sm:block"
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress track */}
      <div style={{ height: 2, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 999,
          width: `${pct}%`,
          background: 'linear-gradient(90deg, rgb(124,58,237), rgb(167,139,250))',
          transition: 'width 500ms cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}
