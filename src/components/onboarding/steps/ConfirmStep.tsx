'use client';

import { useEffect, useState }         from 'react';
import { StepActions }                 from './StepActions';
import type { StepProps, OnboardingFormData } from '@/types';

const LEVEL_MAP: Record<string, string> = {
  'high-school':  'High School',
  'a-level':      'A-Level',
  'university':   'University',
  'professional': 'Professional',
};
const STYLE_MAP: Record<string, string> = {
  structured: 'Structured plan',
  flexible:   'Flexible pace',
};

interface Props extends StepProps {
  onSubmit:     () => Promise<void>;
  isSubmitting: boolean;
  error:        string | null;
}

export function ConfirmStep({ data, onBack, onNext, onSubmit, isSubmitting, error }: Props) {
  const [in_, setIn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);

  const d = data as OnboardingFormData;
  const rows = [
    { label: 'Name',        value: d.displayName },
    { label: 'Level',       value: LEVEL_MAP[d.studyLevel] ?? d.studyLevel },
    {
      label: 'Subjects',
      value: d.subjects?.length
        ? d.subjects.slice(0, 4).join(', ') + (d.subjects.length > 4 ? ` +${d.subjects.length - 4}` : '')
        : '—',
    },
    { label: 'Daily goal',  value: `${d.dailyGoalMinutes} min / day` },
    { label: 'Study style', value: STYLE_MAP[d.studyStyle] ?? d.studyStyle },
  ];

  return (
    <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity 0.3s ease, transform 0.3s ease' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 4 }}>
        You&apos;re all set{d.displayName ? `, ${d.displayName.split(' ')[0]}` : ''}
      </h2>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 20 }}>
        Review your setup, then we&apos;ll build your learning path.
      </p>

      {/* Summary */}
      <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px',
              background:   i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
              borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}
          >
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)' }}>{row.label}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.75)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Tour notice */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        padding: '10px 14px', borderRadius: 10, marginBottom: 16,
        background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
      }}>
        <span style={{ fontSize: 14, marginTop: 1 }}>✨</span>
        <p style={{ fontSize: 11, color: 'rgba(167,139,250,0.85)', lineHeight: 1.55 }}>
          Next up: a 5-step tour of your dashboard. Takes under a minute and only runs once.
        </p>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: 'rgb(248,113,113)', marginBottom: 12 }}>⚠️ {error}</p>
      )}

      <StepActions
        onNext={onSubmit}
        onBack={onBack}
        nextLabel="Create my profile →"
        isLoading={isSubmitting}
      />
    </div>
  );
}
