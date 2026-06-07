'use client';

import { useState, useEffect } from 'react';
import { StepActions }         from './StepActions';
import type { StepProps }      from '@/types';

const GOALS = [
  { mins: 15,  label: '15 min',  desc: 'Light touch'  },
  { mins: 30,  label: '30 min',  desc: 'Recommended'  },
  { mins: 45,  label: '45 min',  desc: 'Solid'        },
  { mins: 60,  label: '1 hour',  desc: 'Deep focus'   },
  { mins: 90,  label: '90 min',  desc: 'Intensive'    },
  { mins: 120, label: '2 hours', desc: 'Power mode'   },
] as const;

const STYLES = [
  { id: 'structured', label: 'Structured', emoji: '🗓️', desc: 'Fixed daily plan — best for exams.' },
  { id: 'flexible',   label: 'Flexible',   emoji: '🌊', desc: 'Your own pace — best for exploration.' },
] as const;

export function GoalsStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const [goal,  setGoal]  = useState<number>(data.dailyGoalMinutes ?? 30);
  const [style, setStyle] = useState<'structured' | 'flexible'>(data.studyStyle ?? 'flexible');
  const [in_,   setIn]    = useState(false);

  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);

  const handleNext = () => { onUpdate({ dailyGoalMinutes: goal, studyStyle: style }); onNext(); };

  return (
    <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity 0.3s ease, transform 0.3s ease' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgb(124,58,237)', marginBottom: 4 }}>
        Step 3 of 4
      </p>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 4 }}>
        Set your daily goal
      </h2>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 20 }}>
        Consistency beats intensity. Start small, build the habit.
      </p>

      {/* Goal */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>
          Minutes per day
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {GOALS.map(g => {
            const active = goal === g.mins;
            return (
              <button
                key={g.mins}
                type="button"
                onClick={() => setGoal(g.mins)}
                style={{
                  padding: '10px 8px', borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                  background: active ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                  border:     active ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.07)',
                  transition: 'all 150ms',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: active ? 'rgb(167,139,250)' : 'rgba(255,255,255,0.75)' }}>
                  {g.label}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{g.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Style */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>
          Study style
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {STYLES.map(s => {
            const active = style === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                style={{
                  padding: '12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                  background: active ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                  border:     active ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.07)',
                  transition: 'all 150ms',
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: active ? 'rgb(167,139,250)' : 'rgba(255,255,255,0.7)', marginBottom: 2 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{s.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <StepActions onNext={handleNext} onBack={onBack} />
    </div>
  );
}
