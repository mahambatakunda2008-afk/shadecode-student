'use client';

import { useState, useEffect } from 'react';
import { StepActions } from './StepActions';
import type { StepProps } from '@/types';

const GOALS = [
  ['Pass school exams', 'Focused exam preparation'], ['Improve grades', 'Targeted weakness remediation'],
  ['Learn a new skill', 'Hands-on project-first learning'], ['Prepare for university', 'Readiness and diagnostics'],
  ['Get a job', 'Portfolio and interview prep'], ['Change careers', 'Career pivot curriculum'],
  ['Build projects', 'Project scaffolds and templates'], ['Explore interests', 'Short discovery modules'],
] as const;

export function StepGoalSelection({ data, onUpdate, onNext, onBack }: StepProps) {
  const [selected, setSelected] = useState<string[]>(data.goals ?? []);
  const [in_, setIn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);
  const toggle = (g: string) => setSelected(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  const handleNext = () => { onUpdate({ goals: selected }); onNext(); };

  return (
    <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity .3s ease, transform .3s ease' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--brand-cyan)', marginBottom: 4 }}>Your direction</p>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>What are you working towards?</h2>
      <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 14 }}>Choose what matters most so Shadecode can shape your recommendations.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 18 }}>
        {GOALS.map(([goal, description]) => {
          const active = selected.includes(goal);
          return <button key={goal} type="button" onClick={() => toggle(goal)} style={{ padding: '12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', background: active ? 'var(--primary-glow)' : 'var(--muted)', border: active ? '1px solid var(--primary)' : '1px solid var(--card-border)', transition: 'background 150ms, border-color 150ms' }}><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{goal}</div><div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 5 }}>{description}</div></button>;
        })}
      </div>
      <StepActions onNext={handleNext} onBack={onBack} />
    </div>
  );
}
