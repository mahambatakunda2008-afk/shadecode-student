'use client';

import { useEffect, useState } from 'react';
import { StepActions } from './StepActions';
import type { StepProps, OnboardingFormData } from '@/types';

const LEVEL_MAP: Record<string, string> = { primary: 'Primary school', 'lower-secondary': 'Junior secondary', 'upper-secondary': 'Senior secondary', 'a-level': 'A-Level', university: 'University', tvet: 'Polytechnic / TVET', professional: 'Professional' };
const STYLE_MAP: Record<string, string> = { structured: 'Structured plan', flexible: 'Flexible pace' };
interface Props extends StepProps { onSubmit: () => Promise<void>; isSubmitting: boolean; error: string | null; }

export function ConfirmStep({ data, onBack, onSubmit, isSubmitting, error }: Props) {
  const [in_, setIn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);
  const d = data as OnboardingFormData;
  const postSecondary = ['university','tvet','professional'].includes(d.studyLevel);
  const rows = [
    { label: 'Learning path', value: LEVEL_MAP[d.studyLevel] ?? d.studyLevel },
    ...(postSecondary ? [{ label: 'Programme', value: d.programme || 'Not set' }, { label: 'Institution', value: d.institution || 'Not set' }, { label: 'Year / level', value: d.yearLevel || 'Not set' }] : [{ label: 'Level', value: d.yearLevel || 'Not set' }]),
    { label: 'Subjects', value: d.subjects?.length ? d.subjects.slice(0, 3).join(', ') + (d.subjects.length > 3 ? ` +${d.subjects.length - 3}` : '') : 'Not set' },
    { label: 'Goal', value: d.goals?.length ? d.goals.slice(0, 2).join(', ') + (d.goals.length > 2 ? ` +${d.goals.length - 2}` : '') : 'Not set' },
    { label: 'Daily target', value: `${d.dailyGoalMinutes ?? 30} minutes` },
    { label: 'Planning', value: STYLE_MAP[d.studyStyle] ?? 'Flexible pace' },
  ];
  return <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity .25s ease, transform .25s ease' }}>
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.11em', textTransform: 'uppercase', color: '#22D3EE', marginBottom: 6 }}>05 · Ready</p>
    <h2 style={{ fontSize: 23, lineHeight: 1.15, fontWeight: 720, color: '#F5F7FA', marginBottom: 6 }}>Your starting point is ready.</h2>
    <p style={{ fontSize: 13, lineHeight: 1.5, color: '#AAB2BF', marginBottom: 18 }}>One last look. Nothing here is permanent.</p>
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.09)', marginBottom: 15 }}>
      {rows.map((row, i) => <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '10px 13px', background: i % 2 === 0 ? 'rgba(255,255,255,.035)' : 'transparent', borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,.07)' : 'none' }}><span style={{ fontSize: 11, color: '#8F9AA8' }}>{row.label}</span><span style={{ fontSize: 11, fontWeight: 620, color: '#E6EBF0', maxWidth: '62%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{row.value}</span></div>)}
    </div>
    <div style={{ padding: '11px 13px', borderRadius: 11, background: 'rgba(34,211,238,.06)', border: '1px solid rgba(34,211,238,.15)', marginBottom: 15 }}><div style={{ fontSize: 12, fontWeight: 650, color: '#67E8F9' }}>What happens next?</div><div style={{ fontSize: 11, lineHeight: 1.45, color: '#AAB2BF', marginTop: 4 }}>Shadecode uses this setup to shape your dashboard, recommendations and first learning session.</div></div>
    {error && <p role="alert" style={{ fontSize: 12, color: '#FB7185', marginBottom: 12 }}>⚠ {error}</p>}
    <StepActions onNext={onSubmit} onBack={onBack} nextLabel="Start learning →" isLoading={isSubmitting} />
  </div>;
}
