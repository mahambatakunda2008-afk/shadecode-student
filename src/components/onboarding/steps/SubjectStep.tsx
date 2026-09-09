'use client';

import { useEffect, useMemo, useState } from 'react';
import { StepActions } from './StepActions';
import type { StepProps, StudyLevel } from '@/types';

type SubjectOption = readonly [string, string];
const SUBJECTS: Record<StudyLevel, readonly SubjectOption[]> = {
  'early-childhood': [['early-literacy','Early Literacy'],['early-numeracy','Early Numeracy'],['discovery','My World & Discovery'],['creative','Creative Expression'],['movement','Movement & Wellbeing'],['shona','Shona Language'],['ndebele','Ndebele Language']],
  primary: [['maths','Maths'],['english','English & Reading'],['science','Science'],['social-studies','Social Studies'],['shona','Shona'],['ndebele','Ndebele']],
  'lower-secondary': [['maths','Mathematics'],['english','English'],['science','Integrated Science'],['history','History'],['geography','Geography'],['computer-science','Computer Science'],['business','Business Studies'],['art','Art & Design'],['music','Music'],['shona','Shona'],['ndebele','Ndebele']],
  'upper-secondary': [['maths','Mathematics'],['english','English'],['physics','Physics'],['chemistry','Chemistry'],['biology','Biology'],['computer-science','Computer Science'],['history','History'],['geography','Geography'],['economics','Economics'],['business','Business'],['accounting','Accounting']],
  'a-level': [['maths','Mathematics'],['physics','Physics'],['chemistry','Chemistry'],['biology','Biology'],['computer-science','Computer Science'],['economics','Economics'],['business','Business'],['accounting','Accounting'],['english','English Language'],['history','History'],['geography','Geography']],
  university: [['maths','Mathematics'],['computer-science','Computer Science'],['physics','Physics'],['chemistry','Chemistry'],['biology','Biology'],['business','Business'],['economics','Economics'],['accounting','Accounting'],['english','Communication / English']],
  tvet: [['computer-science','Computing / ICT'],['maths','Technical Mathematics'],['business','Business'],['accounting','Accounting'],['english','Communication'],['science','Applied Science']],
  professional: [['computer-science','Technology / Computing'],['business','Business'],['accounting','Finance / Accounting'],['english','Communication'],['maths','Quantitative Skills']],
};

export function SubjectsStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const level = data.studyLevel;
  const options = useMemo(() => level ? SUBJECTS[level] : [], [level]);
  const [selected, setSelected] = useState<string[]>(data.subjects ?? []);
  const [error, setError] = useState('');
  const [in_, setIn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);
  useEffect(() => { setSelected(prev => prev.filter(id => options.some(([subjectId]) => subjectId === id))); setError(''); }, [options]);
  const handleNext = () => { if (!level) return setError('Choose your path first.'); if (!selected.length) return setError(level === 'early-childhood' ? 'Choose at least one area to explore.' : 'Choose at least one subject.'); onUpdate({ subjects: selected }); onNext(); };
  const title = level === 'early-childhood' ? 'What would you like to explore?' : level === 'primary' ? 'What do you want to explore?' : 'What are you studying?';
  const description = level === 'early-childhood' ? 'These are learning areas, not exam subjects. We will turn them into age-appropriate activities.' : 'Pick the subjects you want Shadecode to focus on first. You can add more later.';
  return <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity .25s ease, transform .25s ease' }}>
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.11em', textTransform: 'uppercase', color: '#22D3EE', marginBottom: 6 }}>03 · Learning areas</p>
    <h2 style={{ fontSize: 23, lineHeight: 1.15, fontWeight: 720, color: '#F5F7FA', marginBottom: 6 }}>{title}</h2>
    <p style={{ fontSize: 13, lineHeight: 1.5, color: '#AAB2BF', marginBottom: 18 }}>{description}</p>
    {options.length ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, maxHeight: 330, overflowY: 'auto', paddingRight: 2 }}>{options.map(([id,label]) => { const active = selected.includes(id); return <button key={id} type="button" onClick={() => { setError(''); setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev,id]); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '11px 10px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', background: active ? 'rgba(36,91,255,.16)' : 'rgba(255,255,255,.045)', border: active ? '1px solid #245BFF' : '1px solid rgba(255,255,255,.09)', color: '#F5F7FA' }}><span style={{ fontSize: 12, fontWeight: 620 }}>{label}</span>{active && <span style={{ fontSize: 11, color: '#67E8F9' }}>✓</span>}</button>; })}</div> : <div style={{ padding: 14, borderRadius: 11, background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.09)', color: '#8F9AA8', fontSize: 13 }}>Choose your learning path first.</div>}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9 }}><span style={{ fontSize: 11, color: '#778291' }}>{selected.length} selected</span>{selected.length > 0 && <button type="button" onClick={() => setSelected([])} style={{ border: 0, background: 'none', color: '#8F9AA8', fontSize: 11, cursor: 'pointer' }}>Clear</button>}</div>
    {error && <p role="alert" style={{ fontSize: 12, color: '#FB7185', marginTop: 10 }}>{error}</p>}
    <StepActions onNext={handleNext} onBack={onBack} />
  </div>;
}
