'use client';

interface Props { currentStep: number; totalSteps: number; labels: readonly string[]; }

export function OnboardingProgress({ currentStep, totalSteps, labels }: Props) {
  const pct = ((currentStep - 1) / Math.max(1, totalSteps - 1)) * 100;
  return (
    <div style={{ width: '100%', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
        {labels.map((label, i) => {
          const n = i + 1;
          const complete = n < currentStep;
          const active = n === currentStep;
          return <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 0 }}>
            <div style={{ width: 25, height: 25, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 750, background: complete ? '#245BFF' : active ? 'rgba(34,211,238,.13)' : 'rgba(255,255,255,.055)', border: active ? '1.5px solid #22D3EE' : '1px solid rgba(255,255,255,.10)', color: complete ? '#fff' : active ? '#67E8F9' : '#778291' }}>{complete ? '✓' : n}</div>
            <span style={{ fontSize: 10, color: active ? '#F5F7FA' : '#778291', whiteSpace: 'nowrap' }}>{label}</span>
          </div>;
        })}
      </div>
      <div aria-hidden="true" style={{ height: 2, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: 'linear-gradient(90deg,#22D3EE,#00A8FF,#245BFF)', transition: 'width 400ms ease' }} />
      </div>
    </div>
  );
}
