'use client';

import { useState, useEffect } from 'react';
import { StepActions } from './StepActions';
import type { StepProps } from '@/types';

const GOALS = [
  { mins: 15, label: '15 min', desc: 'Light touch' }, { mins: 30, label: '30 min', desc: 'Recommended' },
  { mins: 45, label: '45 min', desc: 'Solid' }, { mins: 60, label: '1 hour', desc: 'Deep focus' },
  { mins: 90, label: '90 min', desc: 'Intensive' }, { mins: 120, label: '2 hours', desc: 'Power mode' },
] as const;
const STYLES = [
  { id: 'structured', label: 'Structured', emoji: '🗓️', desc: 'Fixed daily plan • best for exams.' },
  { id: 'flexible', label: 'Flexible', emoji: '🌊', desc: 'Your own pace • best for exploration.' },
] as const;

export function GoalsStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const [goal, setGoal] = useState<number>(data.dailyGoalMinutes ?? 30);
  const [style, setStyle] = useState<'structured' | 'flexible'>(data.studyStyle ?? 'flexible');
  const [in_, setIn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);
  const handleNext = () => { onUpdate({ dailyGoalMinutes: goal, studyStyle: style }); onNext(); };

  return (
    <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity .3s ease, transform .3s ease' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--brand-cyan)', marginBottom: 4 }}>Daily rhythm</p>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>How much time feels right?</h2>
      <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 20 }}>Set a realistic daily target. You can change it later.</p>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 8 }}>Minutes per day</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {GOALS.map(g => { const active = goal === g.mins; return <button key={g.mins} type="button" onClick={() => setGoal(g.mins)} style={{ padding: '10px 8px', borderRadius: 10, textAlign: 'center', cursor: 'pointer', background: active ? 'var(--primary-glow)' : 'var(--muted)', border: active ? '1px solid var(--primary)' : '1px solid var(--card-border)', transition: 'background 150ms, border-color 150ms' }}><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{g.label}</div><div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 2 }}>{g.desc}</div></button>; })}
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 8 }}>Study style</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {STYLES.map(s => { const active = style === s.id; return <button key={s.id} type="button" onClick={() => setStyle(s.id)} style={{ padding: '12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', background: active ? 'var(--primary-glow)' : 'var(--muted)', border: active ? '1px solid var(--primary)' : '1px solid var(--card-border)', transition: 'background 150ms, border-color 150ms' }}><div style={{ fontSize: 18, marginBottom: 4 }}>{s.emoji}</div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 2 }}>{s.label}</div><div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{s.desc}</div></button>; })}
        </div>
      </div>
      <StepActions onNext={handleNext} onBack={onBack} />
    </div>
  );
}
