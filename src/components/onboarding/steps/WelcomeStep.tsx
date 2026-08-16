'use client';

import { useState, useEffect } from 'react';
import { StepActions } from './StepActions';
import { trackEvent } from '@/lib/traction/client';
import type { StepProps } from '@/types';

const LEVELS = [
  { id: 'high-school', label: 'High School', emoji: '📚', desc: 'GCSE & equivalent' },
  { id: 'a-level', label: 'A-Level', emoji: '🎓', desc: 'AS / A2 exams' },
  { id: 'university', label: 'University', emoji: '🏛️', desc: 'Degree / undergraduate' },
  { id: 'tvet', label: 'Polytechnic / TVET', emoji: '🛠️', desc: 'Technical & practical study' },
  { id: 'professional', label: 'Professional', emoji: '💼', desc: 'Certifications' },
] as const;

const POST_SECONDARY_LEVELS = new Set(['university', 'tvet', 'professional']);

const fieldStyle = {
  width: '100%', boxSizing: 'border-box' as const, padding: '10px 12px', borderRadius: 10,
  fontSize: 13, background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)', outline: 'none',
};

export function WelcomeStep({ data, onUpdate, onNext }: StepProps) {
  const [name, setName] = useState(data.displayName ?? '');
  const [error, setError] = useState('');
  const [in_, setIn] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoAnswer, setDemoAnswer] = useState('');
  const demoCorrect = demoAnswer.trim() === '42';
  const isPostSecondary = POST_SECONDARY_LEVELS.has(data.studyLevel ?? '');

  useEffect(() => { const r = requestAnimationFrame(() => setIn(true)); return () => cancelAnimationFrame(r); }, []);

  const handleNext = () => {
    if (!name.trim()) return setError('Please enter your name.');
    if (!data.studyLevel) return setError('Please select your study level.');
    if (isPostSecondary && !data.programme?.trim()) return setError('Please enter your programme or qualification.');
    onUpdate({ displayName: name.trim() });
    void trackEvent('onboarding_step_completed', { step: 'profile', studyLevel: data.studyLevel });
    onNext();
  };

  const openDemo = () => { setDemoOpen(true); void trackEvent('onboarding_demo_opened', { demo: 'instant_math' }); };

  return (
    <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity 0.3s ease, transform 0.3s ease' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgb(124,58,237)', marginBottom: 4 }}>Welcome</p>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 4 }}>Let&apos;s get you studying</h2>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 18 }}>Tell Shadecode where you are academically so Cortex can build the right study context.</p>

      <button type="button" onClick={openDemo} style={{ width: '100%', marginBottom: 20, padding: '12px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(63,200,255,0.12), rgba(124,58,237,0.12))', border: '1px solid rgba(63,200,255,0.2)', color: 'rgba(255,255,255,0.9)' }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>Try Shadecode now →</div>
        <div style={{ marginTop: 3, fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Solve one quick problem before you finish setup.</div>
      </button>

      {demoOpen && (
        <div style={{ marginBottom: 20, padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 5 }}>Quick Math</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>What is 6 × 7?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={demoAnswer} onChange={(e) => setDemoAnswer(e.target.value)} inputMode="numeric" placeholder="Answer" style={{ ...fieldStyle, flex: 1, minWidth: 0 }} />
            <button type="button" onClick={() => void trackEvent('onboarding_demo_answered', { demo: 'instant_math', correct: demoCorrect })} style={{ padding: '9px 13px', borderRadius: 9, background: 'rgba(63,200,255,0.15)', border: '1px solid rgba(63,200,255,0.25)', color: 'white', fontWeight: 600 }}>Check</button>
          </div>
          {demoAnswer && <p style={{ marginTop: 8, fontSize: 11, color: demoCorrect ? 'rgb(74,222,128)' : 'rgba(255,255,255,0.5)' }}>{demoCorrect ? 'Correct. That is the instant-feedback loop.' : 'Not quite. Try again.'}</p>}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>What should we call you?</label>
        <input type="text" value={name} autoFocus maxLength={40} placeholder="Your name" onChange={e => { setName(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && handleNext()} style={fieldStyle} />
      </div>

      <div style={{ marginBottom: isPostSecondary ? 16 : 24 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>Study level</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {LEVELS.map(level => {
            const active = data.studyLevel === level.id;
            return <button key={level.id} type="button" onClick={() => { onUpdate({ studyLevel: level.id }); setError(''); }} style={{ padding: '12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', background: active ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', border: active ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.07)' }}><div style={{ fontSize: 18, marginBottom: 2 }}>{level.emoji}</div><div style={{ fontSize: 12, fontWeight: 600, color: active ? 'rgb(167,139,250)' : 'rgba(255,255,255,0.7)' }}>{level.label}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{level.desc}</div></button>;
          })}
        </div>
      </div>

      {isPostSecondary && (
        <div style={{ marginBottom: 20, padding: 14, borderRadius: 12, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.16)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.82)', marginBottom: 10 }}>Your academic context</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <input value={data.institution ?? ''} onChange={e => onUpdate({ institution: e.target.value })} placeholder="Institution (e.g. university or polytechnic)" style={fieldStyle} />
            <input value={data.programme ?? ''} onChange={e => { onUpdate({ programme: e.target.value }); setError(''); }} placeholder="Programme / qualification" style={fieldStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={data.yearLevel ?? ''} onChange={e => onUpdate({ yearLevel: e.target.value })} placeholder="Year / level" style={fieldStyle} />
              <input value={data.semester ?? ''} onChange={e => onUpdate({ semester: e.target.value })} placeholder="Semester / term" style={fieldStyle} />
            </div>
            <input value={(data.courses ?? []).join(', ')} onChange={e => onUpdate({ courses: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })} placeholder="Courses / modules (comma separated)" style={fieldStyle} />
          </div>
          <p style={{ marginTop: 9, fontSize: 10, lineHeight: 1.5, color: 'rgba(255,255,255,0.38)' }}>You can change these later. Shadecode uses them to organize your study around your actual programme rather than a school exam board.</p>
        </div>
      )}

      {error && <p style={{ fontSize: 12, color: 'rgb(248,113,113)', marginBottom: 12 }}>{error}</p>}
      <StepActions onNext={handleNext} />
    </div>
  );
}
