'use client';

import { useState, useEffect } from 'react';
import { StepActions }         from './StepActions';
import type { StepProps }      from '@/types';

const ALL_SUBJECTS = [
  { id: 'maths',            label: 'Maths',           emoji: '➗' },
  { id: 'physics',          label: 'Physics',         emoji: '⚛️' },
  { id: 'chemistry',        label: 'Chemistry',       emoji: '🧪' },
  { id: 'biology',          label: 'Biology',         emoji: '🧬' },
  { id: 'english',          label: 'English',         emoji: '📖' },
  { id: 'history',          label: 'History',         emoji: '🏺' },
  { id: 'geography',        label: 'Geography',       emoji: '🌍' },
  { id: 'computer-science', label: 'Computer Sci.',   emoji: '💻' },
  { id: 'economics',        label: 'Economics',       emoji: '📊' },
  { id: 'psychology',       label: 'Psychology',      emoji: '🧠' },
  { id: 'business',         label: 'Business',        emoji: '💼' },
  { id: 'french',           label: 'French',          emoji: '🇫🇷' },
  { id: 'spanish',          label: 'Spanish',         emoji: '🇪🇸' },
  { id: 'art',              label: 'Art & Design',    emoji: '🎨' },
  { id: 'music',            label: 'Music',           emoji: '🎵' },
  { id: 'philosophy',       label: 'Philosophy',      emoji: '🔭' },
];

export function SubjectsStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const [selected, setSelected] = useState<string[]>(data.subjects ?? []);
  const [error,    setError]    = useState('');
  const [in_,      setIn]       = useState(false);

  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);

  const toggle = (id: string) => {
    setError('');
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleNext = () => {
    if (selected.length === 0) return setError('Pick at least one subject.');
    onUpdate({ subjects: selected });
    onNext();
  };

  return (
    <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity 0.3s ease, transform 0.3s ease' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgb(124,58,237)', marginBottom: 4 }}>
        Step 2 of 4
      </p>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 4 }}>
        What are you studying?
      </h2>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 20 }}>
        Select all that apply. Your learning paths are built from these.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 256, overflowY: 'auto', marginBottom: 12, paddingRight: 4 }}>
        {ALL_SUBJECTS.map(subject => {
          const active = selected.includes(subject.id);
          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => toggle(subject.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                background: active ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                border:     active ? '1px solid rgba(124,58,237,0.45)' : '1px solid rgba(255,255,255,0.07)',
                transition: 'all 150ms',
              }}
            >
              <span style={{ fontSize: 14 }}>{subject.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: active ? 'rgb(167,139,250)' : 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {subject.label}
              </span>
              {active && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgb(124,58,237)' }}>✓</span>}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: error ? 12 : 0 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>{selected.length} selected</span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => setSelected([])}
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.22)')}
          >
            Clear all
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: 12, color: 'rgb(248,113,113)', marginBottom: 8 }}>{error}</p>}
      <StepActions onNext={handleNext} onBack={onBack} />
    </div>
  );
}
