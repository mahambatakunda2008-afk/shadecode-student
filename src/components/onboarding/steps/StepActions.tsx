'use client';

interface StepActionsProps { onNext: () => void; onBack?: () => void; nextLabel?: string; isLoading?: boolean; isDisabled?: boolean; }

export function StepActions({ onNext, onBack, nextLabel = 'Continue →', isLoading = false, isDisabled = false }: StepActionsProps) {
  const disabled = isLoading || isDisabled;
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 22, paddingTop: 17, borderTop: '1px solid rgba(255,255,255,.07)' }}>
    {onBack ? <button type="button" onClick={onBack} style={{ minHeight: 40, padding: '8px 12px', borderRadius: 9, background: 'transparent', border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer', color: '#AAB2BF', fontSize: 12 }}>← Back</button> : <div />}
    <button type="button" onClick={onNext} disabled={disabled} style={{ minHeight: 40, fontSize: 12, fontWeight: 700, padding: '9px 18px', borderRadius: 9, background: disabled ? 'rgba(36,91,255,.35)' : 'linear-gradient(135deg,#00A8FF,#245BFF)', border: '1px solid rgba(103,232,249,.12)', cursor: disabled ? 'not-allowed' : 'pointer', color: '#fff', boxShadow: disabled ? 'none' : '0 8px 24px rgba(36,91,255,.20)', transition: 'transform 150ms, box-shadow 150ms' }}>{isLoading ? 'Saving…' : nextLabel}</button>
  </div>;
}
