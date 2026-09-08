'use client';

import { useState } from 'react';
import { StepActions } from './StepActions';
import type { StepProps } from '@/types';

const inputStyle = {
  width: '100%', boxSizing: 'border-box' as const, padding: '11px 12px', borderRadius: 10,
  fontSize: 13, background: 'var(--muted)', border: '1px solid var(--card-border)',
  color: 'var(--foreground)', outline: 'none',
};

const curriculumOptions = ['ZIMSEC', 'Cambridge', 'IB', 'Other'];
const languages = ['English', 'Shona', 'Ndebele', 'Other'];

export function AcademicContextStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const [error, setError] = useState('');
  const level = data.studyLevel ?? 'upper-secondary';
  const primary = level === 'primary';
  const secondary = level === 'lower-secondary' || level === 'upper-secondary' || level === 'a-level';
  const tertiary = level === 'university' || level === 'tvet' || level === 'professional';

  const title = primary ? 'Let’s set up your learning world' : secondary ? 'Tell us about your school' : 'Tell us about your programme';
  const subtitle = primary
    ? 'A few details help us show the right activities, language and level.'
    : secondary
      ? 'We’ll use this to keep subjects, explanations and practice at the right level.'
      : 'We’ll organize your workspace around what you actually study.';

  const handleNext = () => {
    if (primary && !data.yearLevel?.trim()) return setError('Choose your grade or year.');
    if (secondary && !data.yearLevel?.trim()) return setError('Choose your school level or year.');
    if (tertiary && !data.programme?.trim()) return setError('Enter your programme or qualification.');
    setError('');
    onNext();
  };

  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 5 }}>Your context</p>
      <h2 style={{ fontSize: 22, fontWeight: 750, marginBottom: 5 }}>{title}</h2>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted-foreground)', marginBottom: 20 }}>{subtitle}</p>

      {primary && (
        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Grade / year
            <select value={data.yearLevel ?? ''} onChange={e => { onUpdate({ yearLevel: e.target.value }); setError(''); }} style={{ ...inputStyle, marginTop: 7 }}>
              <option value="">Choose your grade</option>
              {[1,2,3,4,5,6,7].map(g => <option key={g} value={`Grade ${g}`}>Grade {g}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Curriculum
            <select value={data.curriculumBoard ?? ''} onChange={e => onUpdate({ curriculumBoard: e.target.value })} style={{ ...inputStyle, marginTop: 7 }}>
              <option value="">Choose a curriculum</option>
              {curriculumOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Learning language
            <select value={data.language ?? ''} onChange={e => onUpdate({ language: e.target.value })} style={{ ...inputStyle, marginTop: 7 }}>
              <option value="">Choose a language</option>
              {languages.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        </div>
      )}

      {secondary && (
        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>School level / year
            <input value={data.yearLevel ?? ''} onChange={e => { onUpdate({ yearLevel: e.target.value }); setError(''); }} placeholder={level === 'a-level' ? 'e.g. AS Level' : 'e.g. Form 3'} style={{ ...inputStyle, marginTop: 7 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Curriculum / exam board
            <select value={data.curriculumBoard ?? ''} onChange={e => onUpdate({ curriculumBoard: e.target.value })} style={{ ...inputStyle, marginTop: 7 }}>
              <option value="">Choose a curriculum</option>
              {curriculumOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          {level === 'a-level' && <label style={{ fontSize: 12, fontWeight: 600 }}>Syllabus code (optional)
            <input value={data.syllabusCode ?? ''} onChange={e => onUpdate({ syllabusCode: e.target.value })} placeholder="e.g. 9709" style={{ ...inputStyle, marginTop: 7 }} />
          </label>}
        </div>
      )}

      {tertiary && (
        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Institution (optional)
            <input value={data.institution ?? ''} onChange={e => onUpdate({ institution: e.target.value })} placeholder="University, college or polytechnic" style={{ ...inputStyle, marginTop: 7 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Programme / qualification
            <input value={data.programme ?? ''} onChange={e => { onUpdate({ programme: e.target.value }); setError(''); }} placeholder={level === 'tvet' ? 'e.g. Electrical Engineering' : 'e.g. Computer Science'} style={{ ...inputStyle, marginTop: 7 }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Year / level
              <input value={data.yearLevel ?? ''} onChange={e => onUpdate({ yearLevel: e.target.value })} placeholder="e.g. Year 2" style={{ ...inputStyle, marginTop: 7 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Semester / term
              <input value={data.semester ?? ''} onChange={e => onUpdate({ semester: e.target.value })} placeholder="e.g. Semester 1" style={{ ...inputStyle, marginTop: 7 }} />
            </label>
          </div>
        </div>
      )}

      {error && <p role="alert" style={{ fontSize: 12, color: '#ef4444', marginTop: 14 }}>{error}</p>}
      <StepActions onNext={handleNext} onBack={onBack} />
    </div>
  );
}
