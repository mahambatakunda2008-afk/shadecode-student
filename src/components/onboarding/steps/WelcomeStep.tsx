'use client';

import { useEffect, useState } from 'react';
import { StepActions } from './StepActions';
import { trackEvent } from '@/lib/traction/client';
import type { StepProps, StudyLevel } from '@/types';

const LEVELS: { id: StudyLevel; label: string; emoji: string; desc: string }[] = [
  { id: 'primary', label: 'Primary', emoji: '🌱', desc: 'Primary school' },
  { id: 'lower-secondary', label: 'Secondary', emoji: '📘', desc: 'Junior secondary' },
  { id: 'upper-secondary', label: 'Secondary', emoji: '📚', desc: 'Senior secondary' },
  { id: 'a-level', label: 'A-Level', emoji: '🎓', desc: 'AS / A2 / Sixth Form' },
  { id: 'university', label: 'University', emoji: '🏛️', desc: 'Degree study' },
  { id: 'tvet', label: 'Polytechnic / TVET', emoji: '🛠️', desc: 'Technical & vocational' },
];

export function WelcomeStep({ data, onUpdate, onNext }: StepProps) {
  const [error, setError] = useState('');
  const [in_, setIn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);

  const handleNext = () => {
    if (!data.studyLevel) return setError('Choose where you are studying.');
    onUpdate({ displayName: data.displayName?.trim() ?? '' });
    void trackEvent('onboarding_step_completed', { step: 'path', studyLevel: data.studyLevel });
    onNext();
  };

  return (
    <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity .3s ease, transform .3s ease' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 5 }}>First, the important bit</p>
      <h2 style={{ fontSize: 22, fontWeight: 750, marginBottom: 6 }}>{data.displayName ? `Good to have you, ${data.displayName}.` : 'Where are you in your learning?'}</h2>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted-foreground)', marginBottom: 20 }}>Pick your current path. Your next questions will change based on this choice.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {LEVELS.map(level => {
          const active = data.studyLevel === level.id;
          return <button key={level.id} type="button" onClick={() => { onUpdate({ studyLevel: level.id }); setError(''); }} style={{ padding: '13px 12px', borderRadius: 11, textAlign: 'left', cursor: 'pointer', background: active ? 'color-mix(in srgb, var(--primary) 12%, var(--card))' : 'var(--muted)', border: active ? '1px solid var(--primary)' : '1px solid var(--card-border)' }}><div style={{ fontSize: 18, marginBottom: 4 }}>{level.emoji}</div><div style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--primary)' : 'var(--foreground)' }}>{level.label}</div><div style={{ fontSize: 10, marginTop: 2, color: 'var(--muted-foreground)' }}>{level.desc}</div></button>;
        })}
      </div>
      <button type="button" onClick={() => { onUpdate({ studyLevel: 'professional' }); setError(''); }} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', background: data.studyLevel === 'professional' ? 'color-mix(in srgb, var(--primary) 12%, var(--card))' : 'var(--muted)', border: data.studyLevel === 'professional' ? '1px solid var(--primary)' : '1px solid var(--card-border)', color: 'var(--foreground)' }}><span style={{ fontSize: 12, fontWeight: 650 }}>💼 Professional / certification</span></button>
      {error && <p role="alert" style={{ fontSize: 12, color: '#ef4444', marginTop: 12 }}>{error}</p>}
      <StepActions onNext={handleNext} />
    </div>
  );
}
