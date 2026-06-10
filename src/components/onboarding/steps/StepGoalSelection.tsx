'use client';

import { useState, useEffect } from 'react';
import { StepActions } from './StepActions';
import type { StepProps } from '@/types';

const GOALS = [
  'Pass school exams',
  'Improve grades',
  'Learn a new skill',
  'Prepare for university',
  'Get a job',
  'Change careers',
  'Build projects',
  'Explore interests',
] as const;

export function StepGoalSelection({ data, onUpdate, onNext, onBack }: StepProps) {
  const [selected, setSelected] = useState<string[]>(data.goals ?? []);
  const [in_, setIn] = useState(false);

  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);

  const toggle = (g: string) => {
    setSelected(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const handleNext = () => { onUpdate({ goals: selected }); onNext(); };

  return (
    <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity 0.3s ease, transform 0.3s ease' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgb(124,58,237)', marginBottom: 4 }}>
        Step 3 — Goals
      </p>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 4 }}>
        What are your goals?
      </h2>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 12 }}>
        Pick one or more goals — these help Cortex recommend paths, courses and first lessons.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 18 }}>
        {GOALS.map((g) => {
          const active = selected.includes(g);
          return (
            <button
              key={g}
              type="button"
              onClick={() => toggle(g)}
              style={{
                padding: '12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                background: active ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)',
                border: active ? '1px solid rgba(124,58,237,0.35)' : '1px solid rgba(255,255,255,0.04)'
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: active ? 'rgb(167,139,250)' : 'rgba(255,255,255,0.85)' }}>{g}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                {g === 'Pass school exams' && 'Focused past-papers & exam plan'}
                {g === 'Improve grades' && 'Targeted weakness remediation'}
                {g === 'Learn a new skill' && 'Hands-on project-first learning'}
                {g === 'Prepare for university' && 'Depth, readiness & diagnostics'}
                {g === 'Get a job' && 'Portfolio & interview prep'}
                {g === 'Change careers' && 'Career pivot curriculum'}
                {g === 'Build projects' && 'Project scaffolds & templates'}
                {g === 'Explore interests' && 'Short discovery modules'}
              </div>
            </button>
          );
        })}
      </div>

      <StepActions onNext={handleNext} onBack={onBack} />
    </div>
  );
}
