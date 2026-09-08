'use client';

import { useEffect, useMemo, useState } from 'react';
import { StepActions } from './StepActions';
import type { StepProps, StudyLevel } from '@/types';

type SubjectOption = readonly [string, string, string];

const SUBJECTS: Record<StudyLevel, readonly SubjectOption[]> = {
  primary: [
    ['maths', 'Maths', '🔢'], ['english', 'English & Reading', '📖'], ['science', 'Science', '🔬'],
    ['social-studies', 'Social Studies', '🌍'], ['shona', 'Shona', '🗣️'], ['ndebele', 'Ndebele', '🗣️'],
  ],
  'lower-secondary': [
    ['maths', 'Mathematics', '➗'], ['english', 'English', '📖'], ['science', 'Integrated Science', '🔬'],
    ['history', 'History', '🏺'], ['geography', 'Geography', '🌍'], ['computer-science', 'Computer Science', '💻'],
    ['business', 'Business Studies', '💼'], ['art', 'Art & Design', '🎨'], ['music', 'Music', '🎵'],
    ['shona', 'Shona', '🗣️'], ['ndebele', 'Ndebele', '🗣️'],
  ],
  'upper-secondary': [
    ['maths', 'Mathematics', '➗'], ['english', 'English', '📖'], ['physics', 'Physics', '⚛️'], ['chemistry', 'Chemistry', '🧪'],
    ['biology', 'Biology', '🧬'], ['computer-science', 'Computer Science', '💻'], ['history', 'History', '🏺'],
    ['geography', 'Geography', '🌍'], ['economics', 'Economics', '📊'], ['business', 'Business', '💼'], ['accounting', 'Accounting', '🧾'],
  ],
  'a-level': [
    ['maths', 'Mathematics', '➗'], ['physics', 'Physics', '⚛️'], ['chemistry', 'Chemistry', '🧪'], ['biology', 'Biology', '🧬'],
    ['computer-science', 'Computer Science', '💻'], ['economics', 'Economics', '📊'], ['business', 'Business', '💼'],
    ['accounting', 'Accounting', '🧾'], ['english', 'English Language', '📖'], ['history', 'History', '🏺'], ['geography', 'Geography', '🌍'],
  ],
  university: [
    ['maths', 'Mathematics', '➗'], ['computer-science', 'Computer Science', '💻'], ['physics', 'Physics', '⚛️'],
    ['chemistry', 'Chemistry', '🧪'], ['biology', 'Biology', '🧬'], ['business', 'Business', '💼'], ['economics', 'Economics', '📊'],
    ['accounting', 'Accounting', '🧾'], ['english', 'Communication / English', '📖'],
  ],
  tvet: [
    ['computer-science', 'Computing / ICT', '💻'], ['maths', 'Technical Mathematics', '➗'], ['business', 'Business', '💼'],
    ['accounting', 'Accounting', '🧾'], ['english', 'Communication', '📖'], ['science', 'Applied Science', '🔬'],
  ],
  professional: [
    ['computer-science', 'Technology / Computing', '💻'], ['business', 'Business', '💼'], ['accounting', 'Finance / Accounting', '🧾'],
    ['english', 'Communication', '📖'], ['maths', 'Quantitative Skills', '➗'],
  ],
};

export function SubjectsStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const level = data.studyLevel;
  const options = useMemo(() => level ? SUBJECTS[level] : [], [level]);
  const [selected, setSelected] = useState<string[]>(() => (data.subjects ?? []).filter(id => options.some(([subjectId]) => subjectId === id)));
  const [error, setError] = useState('');
  const [in_, setIn] = useState(false);

  useEffect(() => {
    const r = requestAnimationFrame(() => setIn(true));
    return () => cancelAnimationFrame(r);
  }, []);

  useEffect(() => {
    setSelected(prev => prev.filter(id => options.some(([subjectId]) => subjectId === id)));
    setError('');
  }, [level, options]);

  const title = level === 'primary' ? 'What do you want to explore?' : level === 'university' || level === 'tvet' || level === 'professional' ? 'What do you study?' : 'Which subjects are yours?';
  const subtitle = level === 'primary' ? 'Choose the areas you want to practise. We’ll keep everything at your grade level.' : 'Pick the subjects you want Shadecode to focus on first.';

  const toggle = (id: string) => {
    setError('');
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleNext = () => {
    if (!level) return setError('Go back and choose your learning path first.');
    if (!selected.length) return setError('Pick at least one subject.');
    onUpdate({ subjects: selected });
    onNext();
  };

  return (
    <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity .3s ease, transform .3s ease' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--brand-cyan)', marginBottom: 5 }}>Your subjects</p>
      <h2 style={{ fontSize: 22, fontWeight: 750, marginBottom: 5 }}>{title}</h2>
      <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5, marginBottom: 18 }}>{subtitle}</p>

      {options.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, maxHeight: 300, overflowY: 'auto', paddingRight: 3 }}>
          {options.map(([id, label, emoji]) => {
            const active = selected.includes(id);
            return (
              <button key={id} type="button" onClick={() => toggle(id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', background: active ? 'var(--primary-glow)' : 'var(--muted)', border: active ? '1px solid var(--primary)' : '1px solid var(--card-border)', color: 'var(--foreground)', transition: 'background 150ms, border-color 150ms' }}>
                <span aria-hidden="true">{emoji}</span><span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>{active && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--brand-cyan)' }}>✓</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: 16, borderRadius: 12, background: 'var(--muted)', border: '1px solid var(--card-border)', color: 'var(--muted-foreground)', fontSize: 13 }}>Choose your learning path first.</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9 }}><span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{selected.length} selected</span>{selected.length > 0 && <button type="button" onClick={() => setSelected([])} style={{ border: 0, background: 'none', color: 'var(--muted-foreground)', fontSize: 11, cursor: 'pointer' }}>Clear</button>}</div>
      {error && <p role="alert" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 10 }}>{error}</p>}
      <StepActions onNext={handleNext} onBack={onBack} />
    </div>
  );
}
