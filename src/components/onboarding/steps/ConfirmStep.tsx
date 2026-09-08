'use client';

import { useEffect, useState } from 'react';
import { StepActions } from './StepActions';
import type { StepProps, OnboardingFormData } from '@/types';

const LEVEL_MAP: Record<string, string> = {
  primary: 'Primary', 'lower-secondary': 'Lower Secondary', 'upper-secondary': 'Upper Secondary', 'a-level': 'A-Level',
  university: 'University', tvet: 'Polytechnic / TVET', professional: 'Professional',
};
const STYLE_MAP: Record<string, string> = { structured: 'Structured plan', flexible: 'Flexible pace' };
interface Props extends StepProps { onSubmit: () => Promise<void>; isSubmitting: boolean; error: string | null; }

export function ConfirmStep({ data, onBack, onSubmit, isSubmitting, error }: Props) {
  const [in_, setIn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);
  const d = data as OnboardingFormData;
  const isPostSecondary = ['university', 'tvet', 'professional'].includes(d.studyLevel);
  const rows = [
    { label: 'Name', value: d.displayName || '—' },
    { label: 'Level', value: LEVEL_MAP[d.studyLevel] ?? d.studyLevel },
    ...(isPostSecondary ? [
      { label: 'Institution', value: d.institution || '—' },
      { label: 'Programme', value: d.programme || '—' },
      { label: 'Year / semester', value: [d.yearLevel, d.semester].filter(Boolean).join(' · ') || '—' },
      { label: 'Courses / modules', value: d.courses?.length ? d.courses.slice(0, 3).join(', ') + (d.courses.length > 3 ? ` +${d.courses.length - 3}` : '') : '—' },
    ] : []),
    { label: 'Subjects', value: d.subjects?.length ? d.subjects.slice(0, 4).join(', ') + (d.subjects.length > 4 ? ` +${d.subjects.length - 4}` : '') : '—' },
    { label: 'Daily goal', value: `${d.dailyGoalMinutes ?? 30} min / day` },
    { label: 'Study style', value: STYLE_MAP[d.studyStyle] ?? d.studyStyle ?? 'Flexible pace' },
  ];

  return (
    <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity .3s ease, transform .3s ease' }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>🚀</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>You&apos;re all set{d.displayName ? `, ${d.displayName.split(' ')[0]}` : ''}</h2>
      <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 20 }}>Review your setup, then we&apos;ll build your learning path.</p>
      <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16, border: '1px solid var(--card-border)', background: 'var(--surface)' }}>
        {rows.map((row, i) => <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 14px', background: i % 2 === 0 ? 'var(--muted)' : 'transparent', borderBottom: i < rows.length - 1 ? '1px solid var(--card-border)' : 'none' }}><span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{row.label}</span><span style={{ fontSize: 12, fontWeight: 550, color: 'var(--foreground)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{row.value}</span></div>)}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px', borderRadius: 10, marginBottom: 16, background: 'var(--primary-glow)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)' }}>
        <span style={{ fontSize: 14, marginTop: 1, color: 'var(--brand-cyan)' }}>✦</span>
        <p style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.55 }}>Your academic context becomes the foundation for course planning, materials and Cortex recommendations.</p>
      </div>
      {error && <p role="alert" style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>⚠️ {error}</p>}
      <StepActions onNext={onSubmit} onBack={onBack} nextLabel="Create my profile →" isLoading={isSubmitting} />
    </div>
  );
}
