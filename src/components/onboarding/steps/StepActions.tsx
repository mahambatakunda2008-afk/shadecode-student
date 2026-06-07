'use client';

interface StepActionsProps {
  onNext:      () => void;
  onBack?:     () => void;
  nextLabel?:  string;
  isLoading?:  boolean;
  isDisabled?: boolean;
}

export function StepActions({
  onNext,
  onBack,
  nextLabel  = 'Continue →',
  isLoading  = false,
  isDisabled = false,
}: StepActionsProps) {
  const disabled = isLoading || isDisabled;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          style={{
            fontSize: 12, padding: '7px 12px', borderRadius: 10,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.35)', transition: 'color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
        >
          ← Back
        </button>
      ) : <div />}

      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        style={{
          fontSize: 12, fontWeight: 600, padding: '8px 20px', borderRadius: 10,
          background: disabled ? 'rgba(124,58,237,0.35)' : 'rgb(124,58,237)',
          border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          color: 'white', transition: 'background 150ms, box-shadow 150ms',
        }}
        onMouseEnter={e => {
          if (!disabled) {
            e.currentTarget.style.background  = 'rgb(109,40,217)';
            e.currentTarget.style.boxShadow   = '0 0 20px rgba(124,58,237,0.4)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = disabled ? 'rgba(124,58,237,0.35)' : 'rgb(124,58,237)';
          e.currentTarget.style.boxShadow  = 'none';
        }}
      >
        {isLoading ? 'Saving…' : nextLabel}
      </button>
    </div>
  );
}
