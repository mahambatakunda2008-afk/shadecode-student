'use client';

import { useState } from 'react';
import { StepActions } from './StepActions';
import type { StepProps } from '@/types';

const inputStyle = { width: '100%', boxSizing: 'border-box' as const, padding: '11px 12px', borderRadius: 10, fontSize: 13, background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.10)', color: '#F5F7FA', outline: 'none' };
const curriculumOptions = ['ZIMSEC', 'Cambridge International', 'Pearson Edexcel', 'IB', 'Other / not listed', 'I don’t know yet'];
const languages = ['English', 'Shona', 'Ndebele', 'Other'];

export function AcademicContextStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const [error, setError] = useState('');
  const level = data.studyLevel;
  const ecd = level === 'early-childhood';
  const primary = level === 'primary';
  const secondary = level === 'lower-secondary' || level === 'upper-secondary' || level === 'a-level';
  const tertiary = level === 'university' || level === 'tvet' || level === 'professional';
  const title = ecd ? 'Set up early learning' : primary ? 'Set your primary level' : secondary ? 'Set your school context' : 'Set your study context';
  const subtitle = ecd ? 'ECD A and ECD B need a different learning experience from primary grades.' : primary ? 'This keeps activities, language and difficulty at the right level.' : secondary ? 'This helps us use the right subjects, syllabus and difficulty.' : 'This helps us organize learning around your actual programme.';
  const handleNext = () => {
    if (!level) return setError('Go back and choose your path first.');
    if (!data.yearLevel?.trim()) return setError(ecd ? 'Choose ECD A or ECD B.' : primary ? 'Choose your grade.' : tertiary ? 'Enter your year or level.' : 'Enter your school level or year.');
    if (tertiary && !data.programme?.trim()) return setError('Enter your programme or qualification.');
    setError(''); onNext();
  };
  const labelStyle = { fontSize: 12, fontWeight: 650, color: '#DCE2E8' };
  const showDetailedCurriculum = primary || secondary;

  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.11em', textTransform: 'uppercase', color: '#22D3EE', marginBottom: 6 }}>02 · Setup</p>
      <h2 style={{ fontSize: 23, lineHeight: 1.15, fontWeight: 720, color: '#F5F7FA', marginBottom: 6 }}>{title}</h2>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: '#AAB2BF', marginBottom: 20 }}>{subtitle}</p>

      {ecd && <div style={{ display: 'grid', gap: 13 }}>
        <label style={labelStyle}>ECD level<select value={data.yearLevel ?? ''} onChange={e => { onUpdate({ yearLevel: e.target.value }); setError(''); }} style={{ ...inputStyle, marginTop: 7 }}><option value="">Choose an ECD level</option><option value="ECD A">ECD A</option><option value="ECD B">ECD B</option></select></label>
        <label style={labelStyle}>Learning language<select value={data.language ?? ''} onChange={e => onUpdate({ language: e.target.value })} style={{ ...inputStyle, marginTop: 7 }}><option value="">Choose a language</option>{languages.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
        <label style={labelStyle}>Curriculum<select value={data.curriculumBoard ?? ''} onChange={e => onUpdate({ curriculumBoard: e.target.value })} style={{ ...inputStyle, marginTop: 7 }}><option value="">Choose a curriculum</option>{curriculumOptions.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
      </div>}

      {primary && <div style={{ display: 'grid', gap: 13 }}>
        <label style={labelStyle}>Grade<select value={data.yearLevel ?? ''} onChange={e => { onUpdate({ yearLevel: e.target.value }); setError(''); }} style={{ ...inputStyle, marginTop: 7 }}><option value="">Choose your grade</option>{[1,2,3,4,5,6,7].map(g => <option key={g} value={`Grade ${g}`}>Grade {g}</option>)}</select></label>
        <label style={labelStyle}>Curriculum / education system<select value={data.curriculumBoard ?? ''} onChange={e => onUpdate({ curriculumBoard: e.target.value })} style={{ ...inputStyle, marginTop: 7 }}><option value="">Choose one, or say you don’t know</option>{curriculumOptions.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
        <label style={labelStyle}>Learning language<select value={data.language ?? ''} onChange={e => onUpdate({ language: e.target.value })} style={{ ...inputStyle, marginTop: 7 }}><option value="">Choose a language</option>{languages.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
      </div>}

      {secondary && <div style={{ display: 'grid', gap: 13 }}>
        <label style={labelStyle}>{level === 'a-level' ? 'Level' : 'School level / year'}<select value={data.yearLevel ?? ''} onChange={e => { onUpdate({ yearLevel: e.target.value }); setError(''); }} style={{ ...inputStyle, marginTop: 7 }}><option value="">Choose your level</option>{level === 'lower-secondary' ? ['Form 1','Form 2','Form 3','Form 4'].map(v => <option key={v} value={v}>{v}</option>) : level === 'upper-secondary' ? ['Form 5','Form 6'].map(v => <option key={v} value={v}>{v}</option>) : ['AS Level','A2 Level'].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
        <label style={labelStyle}>Curriculum / exam board<select value={data.curriculumBoard ?? ''} onChange={e => onUpdate({ curriculumBoard: e.target.value })} style={{ ...inputStyle, marginTop: 7 }}><option value="">Choose your board, or say you don’t know</option>{curriculumOptions.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
        <label style={labelStyle}>Qualification <span style={{ color: '#778291', fontWeight: 450 }}>(if you know it)</span><input value={data.curriculumQualification ?? ''} onChange={e => onUpdate({ curriculumQualification: e.target.value })} placeholder="e.g. ZIMSEC O Level" style={{ ...inputStyle, marginTop: 7 }} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          <label style={labelStyle}>Syllabus / subject code <span style={{ color: '#778291', fontWeight: 450 }}>(if known)</span><input value={data.syllabusCode ?? ''} onChange={e => onUpdate({ syllabusCode: e.target.value })} placeholder="e.g. 4021 or 9709" style={{ ...inputStyle, marginTop: 7 }} /></label>
          <label style={labelStyle}>Syllabus version <span style={{ color: '#778291', fontWeight: 450 }}>(if known)</span><input value={data.syllabusVersion ?? ''} onChange={e => onUpdate({ syllabusVersion: e.target.value })} placeholder="e.g. 2024-2030" style={{ ...inputStyle, marginTop: 7 }} /></label>
        </div>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#778291' }}>Don’t know these yet? Leave them blank. Shadecode will not guess your syllabus or treat unverified information as official.</p>
      </div>}

      {tertiary && <div style={{ display: 'grid', gap: 13 }}>
        <label style={labelStyle}>Institution <span style={{ color: '#778291', fontWeight: 450 }}>(optional)</span><input value={data.institution ?? ''} onChange={e => onUpdate({ institution: e.target.value })} placeholder="University, college or polytechnic" style={{ ...inputStyle, marginTop: 7 }} /></label>
        <label style={labelStyle}>Programme / qualification<input value={data.programme ?? ''} onChange={e => { onUpdate({ programme: e.target.value }); setError(''); }} placeholder={level === 'tvet' ? 'e.g. Electrical Engineering' : 'e.g. Computer Science'} style={{ ...inputStyle, marginTop: 7 }} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}><label style={labelStyle}>Year / level<input value={data.yearLevel ?? ''} onChange={e => { onUpdate({ yearLevel: e.target.value }); setError(''); }} placeholder="e.g. Year 2" style={{ ...inputStyle, marginTop: 7 }} /></label><label style={labelStyle}>Semester / term <span style={{ color: '#778291', fontWeight: 450 }}>(optional)</span><input value={data.semester ?? ''} onChange={e => onUpdate({ semester: e.target.value })} placeholder="e.g. Semester 1" style={{ ...inputStyle, marginTop: 7 }} /></label></div>
        <label style={labelStyle}>Education system / awarding body <span style={{ color: '#778291', fontWeight: 450 }}>(optional)</span><select value={data.curriculumBoard ?? ''} onChange={e => onUpdate({ curriculumBoard: e.target.value })} style={{ ...inputStyle, marginTop: 7 }}><option value="">Choose one, or say you don’t know</option>{curriculumOptions.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
        <label style={labelStyle}>Qualification / programme code <span style={{ color: '#778291', fontWeight: 450 }}>(optional)</span><input value={data.syllabusCode ?? ''} onChange={e => onUpdate({ syllabusCode: e.target.value })} placeholder="e.g. course or qualification code" style={{ ...inputStyle, marginTop: 7 }} /></label>
      </div>}

      {showDetailedCurriculum && secondary && <p style={{ marginTop: 14, marginBottom: 0, fontSize: 11, color: '#8F9AA8' }}>You can add the subjects you actually take on the next step. We’ll use those names with the curriculum details above when an exact syllabus identity is available.</p>}
      {error && <p role="alert" style={{ fontSize: 12, color: '#FB7185', marginTop: 13 }}>{error}</p>}
      <StepActions onNext={handleNext} onBack={onBack} />
    </div>
  );
}
