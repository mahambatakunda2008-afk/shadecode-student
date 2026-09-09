'use client';

import { useState, useEffect, useMemo } from 'react';
import { StepActions } from './StepActions';
import type { StepProps } from '@/types';

type Goal = readonly [string, string];
const GOALS_BY_LEVEL: Record<string, Goal[]> = {
  'early-childhood': [
    ['Explore', 'Discover through play, stories and activities'],
    ['Build early skills', 'Grow language, number sense and everyday skills'],
    ['Stories & language', 'Listen, speak, recognise and communicate'],
    ['Numbers & shapes', 'Count, compare, sort and build'],
  ],
  primary: [
    ['Build foundations', 'Strengthen the skills everything else depends on'],
    ['Improve schoolwork', 'Understand lessons and practise with confidence'],
    ['Explore', 'Follow curiosity beyond the classroom'],
    ['Prepare for Grade 7', 'Build exam confidence and strong foundations'],
  ],
  'lower-secondary': [
    ['Improve grades', 'Find and fix weak areas'],
    ['Build foundations', 'Master concepts before they get harder'],
    ['Prepare for O-Level', 'Build the habits and knowledge for later exams'],
    ['Explore interests', 'Go deeper into subjects you enjoy'],
  ],
  'upper-secondary': [
    ['Improve grades', 'Find and fix weak areas'],
    ['Prepare for exams', 'Practise content, technique and timing'],
    ['Build deeper skills', 'Go beyond memorising answers'],
    ['Explore interests', 'Follow curiosity beyond the syllabus'],
  ],
  'a-level': [
    ['Prepare for exams', 'Master syllabus content and exam technique'],
    ['Fix weak topics', 'Turn difficult areas into strengths'],
    ['Prepare for university', 'Build the depth and independence you will need'],
    ['Explore interests', 'Go deeper than the syllabus'],
  ],
  university: [
    ['Master my programme', 'Understand modules deeply, not just pass them'],
    ['Improve academic performance', 'Target weak areas and improve results'],
    ['Build practical skills', 'Turn theory into useful work and projects'],
    ['Prepare for work', 'Connect study to career direction'],
  ],
  tvet: [
    ['Master practical skills', 'Connect theory to real tasks'],
    ['Pass assessments', 'Prepare for written and practical assessment'],
    ['Build a portfolio', 'Keep evidence of what you can do'],
    ['Prepare for work', 'Build job-ready confidence'],
  ],
  professional: [
    ['Build a skill', 'Develop knowledge you can use immediately'],
    ['Earn a qualification', 'Stay on track with your certification'],
    ['Improve at work', 'Turn real work into deliberate practice'],
    ['Change direction', 'Build toward a new professional path'],
  ],
};

const TIMES_BY_LEVEL: Record<string, readonly number[]> = {
  'early-childhood': [10, 15, 20, 30],
  primary: [15, 20, 30, 45, 60],
  default: [15, 30, 45, 60, 90, 120],
};

const STYLES = [
  { id: 'structured', label: 'Structured', desc: 'A clear plan for each day.' },
  { id: 'flexible', label: 'Flexible', desc: 'Choose what fits your day.' },
] as const;

export function StepGoalSelection({ data, onUpdate, onNext, onBack }: StepProps) {
  const level = data.studyLevel ?? 'upper-secondary';
  const goals = useMemo(() => GOALS_BY_LEVEL[level] ?? GOALS_BY_LEVEL['upper-secondary'], [level]);
  const times = useMemo(() => TIMES_BY_LEVEL[level] ?? TIMES_BY_LEVEL.default, [level]);
  const [selected, setSelected] = useState<string[]>(data.goals ?? []);
  const [minutes, setMinutes] = useState(data.dailyGoalMinutes ?? times[1] ?? 30);
  const [style, setStyle] = useState<'structured' | 'flexible'>(data.studyStyle ?? 'flexible');
  const [error, setError] = useState('');
  const [in_, setIn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);
  useEffect(() => { setSelected(prev => prev.filter(value => goals.some(([goal]) => goal === value))); setMinutes(prev => times.includes(prev) ? prev : (times[1] ?? times[0])); }, [goals, times]);

  const toggle = (goal: string) => { setError(''); setSelected(prev => prev.includes(goal) ? prev.filter(x => x !== goal) : [...prev, goal]); };
  const handleNext = () => {
    if (!selected.length) { setError(level === 'early-childhood' ? 'Choose at least one area to explore.' : 'Choose at least one goal.'); return; }
    onUpdate({ goals: selected, dailyGoalMinutes: minutes, studyStyle: style });
    onNext();
  };

  return (
    <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity .25s ease, transform .25s ease' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.11em', textTransform: 'uppercase', color: '#22D3EE', marginBottom: 6 }}>04 · Direction</p>
      <h2 style={{ fontSize: 23, lineHeight: 1.15, fontWeight: 720, color: '#F5F7FA', marginBottom: 6 }}>{level === 'early-childhood' ? 'What should we explore together?' : 'What should Shadecode help you do?'}</h2>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: '#AAB2BF', marginBottom: 18 }}>{level === 'early-childhood' ? 'These choices shape the kinds of activities we put first.' : 'Pick one or more. You can change these later.'}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {goals.map(([goal, description]) => { const active = selected.includes(goal); return <button key={goal} type="button" onClick={() => toggle(goal)} style={{ padding: 12, borderRadius: 11, textAlign: 'left', cursor: 'pointer', background: active ? 'rgba(36,91,255,.16)' : 'rgba(255,255,255,.045)', border: active ? '1px solid #245BFF' : '1px solid rgba(255,255,255,.09)', color: '#F5F7FA' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ fontSize: 13, fontWeight: 680 }}>{goal}</span>{active && <span style={{ color: '#67E8F9', fontSize: 12 }}>✓</span>}</div><div style={{ fontSize: 11, color: '#8F9AA8', marginTop: 5, lineHeight: 1.35 }}>{description}</div></button>; })}
      </div>

      <div style={{ paddingTop: 17, borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{ fontSize: 12, fontWeight: 650, color: '#DCE2E8', marginBottom: 8 }}>{level === 'early-childhood' ? 'How much activity time feels right?' : 'How much do you want to study each day?'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(times.length, 4)}, 1fr)`, gap: 6 }}>
          {times.map(value => { const active = minutes === value; return <button key={value} type="button" onClick={() => setMinutes(value)} style={{ padding: '9px 5px', borderRadius: 9, cursor: 'pointer', background: active ? 'rgba(34,211,238,.11)' : 'rgba(255,255,255,.035)', border: active ? '1px solid #22D3EE' : '1px solid rgba(255,255,255,.08)', color: active ? '#67E8F9' : '#B8C0CB', fontSize: 12, fontWeight: 650 }}>{value >= 60 ? `${value / 60}h` : `${value}m`}</button>; })}
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
