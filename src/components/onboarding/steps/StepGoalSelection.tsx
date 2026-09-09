'use client';

import { useState, useEffect } from 'react';
import { StepActions } from './StepActions';
import type { StepProps } from '@/types';

const GOALS = [
  ['Pass exams', 'Prepare with targeted practice'], ['Improve grades', 'Find and fix weak areas'],
  ['Build skills', 'Learn by doing real work'], ['Prepare for university', 'Build the foundations you need'],
  ['Get a job', 'Build a portfolio and job readiness'], ['Explore', 'Follow curiosity without pressure'],
] as const;
const TIMES = [15, 30, 45, 60, 90, 120] as const;
const STYLES = [
  { id: 'structured', label: 'Structured', desc: 'A clear plan for each day.' },
  { id: 'flexible', label: 'Flexible', desc: 'Choose what fits your day.' },
] as const;

export function StepGoalSelection({ data, onUpdate, onNext, onBack }: StepProps) {
  const [selected, setSelected] = useState<string[]>(data.goals ?? []);
  const [minutes, setMinutes] = useState(data.dailyGoalMinutes ?? 30);
  const [style, setStyle] = useState<'structured' | 'flexible'>(data.studyStyle ?? 'flexible');
  const [error, setError] = useState('');
  const [in_, setIn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);

  const toggle = (goal: string) => { setError(''); setSelected(prev => prev.includes(goal) ? prev.filter(x => x !== goal) : [...prev, goal]); };
  const handleNext = () => {
    if (!selected.length) { setError('Choose at least one goal.'); return; }
    onUpdate({ goals: selected, dailyGoalMinutes: minutes, studyStyle: style });
    onNext();
  };

  return (
    <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity .25s ease, transform .25s ease' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.11em', textTransform: 'uppercase', color: '#22D3EE', marginBottom: 6 }}>Your direction</p>
      <h2 style={{ fontSize: 23, lineHeight: 1.15, fontWeight: 720, color: '#F5F7FA', marginBottom: 6 }}>What should Shadecode help you do?</h2>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: '#AAB2BF', marginBottom: 18 }}>Pick one or more. You can change these later.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {GOALS.map(([goal, description]) => { const active = selected.includes(goal); return <button key={goal} type="button" onClick={() => toggle(goal)} style={{ padding: 12, borderRadius: 11, textAlign: 'left', cursor: 'pointer', background: active ? 'rgba(36,91,255,.16)' : 'rgba(255,255,255,.045)', border: active ? '1px solid #245BFF' : '1px solid rgba(255,255,255,.09)', color: '#F5F7FA' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ fontSize: 13, fontWeight: 680 }}>{goal}</span>{active && <span style={{ color: '#67E8F9', fontSize: 12 }}>✓</span>}</div><div style={{ fontSize: 11, color: '#8F9AA8', marginTop: 5, lineHeight: 1.35 }}>{description}</div></button>; })}
      </div>

      <div style={{ paddingTop: 17, borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{ fontSize: 12, fontWeight: 650, color: '#DCE2E8', marginBottom: 8 }}>How much do you want to study each day?</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {TIMES.map(value => { const active = minutes === value; return <button key={value} type="button" onClick={() => setMinutes(value)} style={{ padding: '9px 5px', borderRadius: 9, cursor: 'pointer', background: active ? 'rgba(34,211,238,.11)' : 'rgba(255,255,255,.035)', border: active ? '1px solid #22D3EE' : '1px solid rgba(255,255,255,.08)', color: active ? '#67E8F9' : '#B8C0CB', fontSize: 12, fontWeight: 650 }}>{value >= 60 ? `${value / 60}h` : `${value}m`}</button>; })}
        </div>
      </div>

      <div style={{ marginTop: 17 }}>
        <div style={{ fontSize: 12, fontWeight: 650, color: '#DCE2E8', marginBottom: 8 }}>How should we plan it?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          {STYLES.map(option => { const active = style === option.id; return <button key={option.id} type="button" onClick={() => setStyle(option.id)} style={{ padding: 11, borderRadius: 10, textAlign: 'left', cursor: 'pointer', background: active ? 'rgba(36,91,255,.16)' : 'rgba(255,255,255,.035)', border: active ? '1px solid #245BFF' : '1px solid rgba(255,255,255,.08)' }}><div style={{ fontSize: 12, fontWeight: 680, color: '#F5F7FA' }}>{option.label}</div><div style={{ fontSize: 10, color: '#8F9AA8', marginTop: 3 }}>{option.desc}</div></button>; })}
        </div>
      </div>

      {error && <p role="alert" style={{ fontSize: 12, color: '#FB7185', marginTop: 12 }}>{error}</p>}
      <StepActions onNext={handleNext} onBack={onBack} />
    </div>
  );
}
