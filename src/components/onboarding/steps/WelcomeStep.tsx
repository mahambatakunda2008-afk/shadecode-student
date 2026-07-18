'use client';

import { useState, useEffect } from 'react';
import { StepActions }         from './StepActions';
import type { StepProps }      from '@/types';

const LEVELS = [
  { id: 'high-school',  label: 'High School',  emoji: '📚', desc: 'GCSE & equivalent' },
  { id: 'a-level',      label: 'A-Level',       emoji: '🎓', desc: 'AS / A2 exams'    },
  { id: 'university',   label: 'University',    emoji: '🏛️', desc: 'Degree level'     },
  { id: 'professional', label: 'Professional',  emoji: '💼', desc: 'Certifications'   },
] as const;

export function WelcomeStep({ data, onUpdate, onNext }: StepProps) {
  const [name,  setName]  = useState(data.displayName ?? '');
  const [error, setError] = useState('');
  const [in_,   setIn]    = useState(false);

  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);

  const handleNext = () => {
    if (!name.trim())     return setError('Please enter your name.');
    if (!data.studyLevel) return setError('Please select your study level.');
    onUpdate({ displayName: name.trim() });
    onNext();
  };

  return (
    <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity 0.3s ease, transform 0.3s ease' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgb(124,58,237)', marginBottom: 4 }}>
        Welcome
      </p>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 4 }}>
        Let&apos;s set up your profile
      </h2>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 24 }}>
        Takes about 60 seconds. You can change this later.
      </p>

      {/* Name */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>
          What should we call you?
        </label>
        <input
          type="text"
          value={name}
          autoFocus
          maxLength={40}
          placeholder="Your name"
          onChange={e => { setName(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleNext()}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 14px', borderRadius: 10, fontSize: 13,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.9)', outline: 'none', caretColor: 'rgb(124,58,237)',
            transition: 'border-color 150ms',
          }}
          onFocus={e  => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)')}
          onBlur={e   => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      </div>

      {/* Level */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>
          Study level
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {LEVELS.map(level => {
            const active = data.studyLevel === level.id;
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => { onUpdate({ studyLevel: level.id }); setError(''); }}
                style={{
                  padding: '12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                  background: active ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                  border:     active ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.07)',
                  transition: 'all 150ms',
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 2 }}>{level.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: active ? 'rgb(167,139,250)' : 'rgba(255,255,255,0.7)' }}>
                  {level.label}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{level.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p style={{ fontSize: 12, color: 'rgb(248,113,113)', marginBottom: 12 }}>{error}</p>}
      <StepActions onNext={handleNext} />
    </div>
  );
}
