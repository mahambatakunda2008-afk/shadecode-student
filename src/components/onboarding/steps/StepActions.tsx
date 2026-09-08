'use client';

interface StepActionsProps {
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
}

export function StepActions({ onNext, onBack, nextLabel = 'Continue →', isLoading = false, isDisabled = false }: StepActionsProps) {
  const disabled = isLoading || isDisabled;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
      {onBack ? <button type="button" onClick={onBack} style={{ fontSize: 12, padding: '7px 12px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>← Back</button> : <div />}
      <button type="button" onClick={onNext} disabled={disabled} style={{ fontSize: 12, fontWeight: 650, padding: '9px 20px', borderRadius: 10, background: disabled ? 'color-mix(in srgb, var(--primary) 35%, transparent)' : 'var(--primary)', border: '1px solid transparent', cursor: disabled ? 'not-allowed' : 'pointer', color: 'var(--primary-foreground)', boxShadow: disabled ? 'none' : '0 8px 24px var(--primary-glow)', transition: 'background 150ms, transform 150ms, box-shadow 150ms' }}>
        {isLoading ? 'Saving…' : nextLabel}
      </button>
    </div>
  );
}
