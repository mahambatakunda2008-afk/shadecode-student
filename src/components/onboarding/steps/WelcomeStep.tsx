'use client';

import { useEffect, useState } from 'react';
import { StepActions } from './StepActions';
import { trackEvent } from '@/lib/traction/client';
import type { StepProps, StudyLevel } from '@/types';

const LEVELS: { id: StudyLevel; label: string; desc: string }[] = [
  { id: 'early-childhood', label: 'Early Childhood', desc: 'ECD A / ECD B' },
  { id: 'primary', label: 'Primary school', desc: 'Grades 1–7' },
  { id: 'lower-secondary', label: 'Junior secondary', desc: 'Forms 1–4' },
  { id: 'upper-secondary', label: 'Senior secondary', desc: 'Forms 5–6' },
  { id: 'a-level', label: 'A-Level', desc: 'AS / A2' },
  { id: 'university', label: 'University', desc: 'Degree study' },
  { id: 'tvet', label: 'Polytechnic / TVET', desc: 'Technical & vocational' },
  { id: 'professional', label: 'Professional', desc: 'Certification & career learning' },
];

export function WelcomeStep({ data, onUpdate, onNext }: StepProps) {
  const [error, setError] = useState('');
  const [in_, setIn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);
  const handleNext = () => {
    if (!data.studyLevel) { setError('Choose your learning path.'); return; }
    onUpdate({ displayName: data.displayName?.trim() ?? '' });
    void trackEvent('onboarding_step_completed', { step: 'path', studyLevel: data.studyLevel });
    onNext();
  };
  return <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity .25s ease, transform .25s ease' }}>
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.11em', textTransform: 'uppercase', color: '#22D3EE', marginBottom: 6 }}>01 · Path</p>
    <h2 style={{ fontSize: 23, lineHeight: 1.15, fontWeight: 720, color: '#F5F7FA', marginBottom: 6 }}>{data.displayName ? `Good to have you, ${data.displayName.split(' ')[0]}.` : 'Where are you learning?'}</h2>
    <p style={{ fontSize: 13, lineHeight: 1.5, color: '#AAB2BF', marginBottom: 19 }}>Choose your current stage. Your home, lessons, activities, tools and navigation will adapt to it.</p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {LEVELS.map(level => { const active = data.studyLevel === level.id; return <button key={level.id} type="button" onClick={() => { onUpdate({ studyLevel: level.id }); setError(''); }} style={{ padding: '13px 12px', borderRadius: 11, textAlign: 'left', cursor: 'pointer', background: active ? 'rgba(36,91,255,.16)' : 'rgba(255,255,255,.045)', border: active ? '1px solid #245BFF' : '1px solid rgba(255,255,255,.09)', color: '#F5F7FA' }}><div style={{ fontSize: 13, fontWeight: 680 }}>{level.label}</div><div style={{ fontSize: 10, marginTop: 4, color: '#8F9AA8' }}>{level.desc}</div></button>; })}
    </div>
    {error && <p role="alert" style={{ fontSize: 12, color: '#FB7185', marginTop: 12 }}>{error}</p>}
    <StepActions onNext={handleNext} />
  </div>;
}
