'use client';

import { useEffect, useMemo, useState } from 'react';
import { StepActions } from './StepActions';
import type { StepProps } from '@/types';
import { SUBJECT_CATALOG, SUBJECT_CATEGORIES } from '@/lib/subjects/catalog';

export function SubjectsStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const level = data.studyLevel;
  const [selected, setSelected] = useState<string[]>(data.subjects ?? []);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');
  const [in_, setIn] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const matchingSubjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return SUBJECT_CATALOG.filter(subject => {
      const inPathway = Boolean(level && subject.pathways.includes(level));
      if (!showAll && !inPathway) return false;
      if (!query) return true;
      return [subject.name, subject.id, ...(subject.aliases ?? [])]
        .some(value => value.toLocaleLowerCase().includes(query));
    }).sort((a, b) => {
      const aRecommended = Boolean(level && a.pathways.includes(level));
      const bRecommended = Boolean(level && b.pathways.includes(level));
      if (aRecommended !== bRecommended) return aRecommended ? -1 : 1;
      const categoryOrder = SUBJECT_CATEGORIES.indexOf(a.category) - SUBJECT_CATEGORIES.indexOf(b.category);
      return categoryOrder || a.name.localeCompare(b.name);
    });
  }, [level, search, showAll]);

  const groupedSubjects = useMemo(() => SUBJECT_CATEGORIES
    .map(category => ({ category, subjects: matchingSubjects.filter(subject => subject.category === category) }))
    .filter(group => group.subjects.length > 0), [matchingSubjects]);

  const handleNext = () => {
    if (!level) return setError('Choose your learning path first.');
    if (!selected.length) return setError(level === 'early-childhood' ? 'Choose at least one learning area.' : 'Choose at least one subject.');
    onUpdate({ subjects: selected });
    onNext();
  };

  const title = level === 'early-childhood'
    ? 'What would you like to explore?'
    : level === 'primary'
      ? 'What do you want to explore?'
      : 'What are you studying?';
  const description = level === 'early-childhood'
    ? 'Choose age-appropriate learning areas. Other subjects are available if you want to explore beyond them.'
    : 'Choose your subjects. We recommend options for your learning stage, but you can browse the full catalogue too.';
  const collectCodes = level === 'lower-secondary' || level === 'upper-secondary' || level === 'a-level';
  const setSubjectCode = (subjectId: string, value: string) =>
    onUpdate({ curriculumSubjectCodes: { ...(data.curriculumSubjectCodes ?? {}), [subjectId]: value } });

  return <div style={{ opacity: in_ ? 1 : 0, transform: in_ ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity .25s ease, transform .25s ease' }}>
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.11em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 6 }}>03 · Learning areas</p>
    <h2 style={{ fontSize: 23, lineHeight: 1.15, fontWeight: 720, color: 'var(--foreground)', marginBottom: 6 }}>{title}</h2>
    <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted-foreground)', marginBottom: 14 }}>{description}</p>

    <div style={{ display: 'grid', gap: 9, marginBottom: 10 }}>
      <input
        type="search"
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="Search subjects, languages or aliases"
        aria-label="Search the subject catalogue"
        style={inputStyle}
      />
      <button type="button" onClick={() => setShowAll(value => !value)} style={browseButtonStyle}>
        {showAll ? 'Show recommended for my level' : 'Browse all subjects and learning areas'}
      </button>
    </div>

    {groupedSubjects.length ? <div style={{ display: 'grid', gap: 13, maxHeight: 390, overflowY: 'auto', paddingRight: 2 }}>
      {groupedSubjects.map(group => <section key={group.category} aria-label={group.category}>
        <h3 style={{ fontSize: 10, fontWeight: 750, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted-foreground)', margin: '2px 0 6px' }}>{group.category}</h3>
        <div style={{ display: 'grid', gap: 6 }}>
          {group.subjects.map(subject => {
            const active = selected.includes(subject.id);
            const recommended = Boolean(level && subject.pathways.includes(level));
            return <div key={subject.id} style={{ borderRadius: 10, background: active ? 'var(--primary-glow)' : 'rgba(255,255,255,.045)', border: active ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,.09)' }}>
              <button type="button" aria-pressed={active} onClick={() => {
                setError('');
                setSelected(previous => previous.includes(subject.id) ? previous.filter(id => id !== subject.id) : [...previous, subject.id]);
              }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '11px 10px', border: 0, background: 'transparent', color: 'var(--foreground)', textAlign: 'left', cursor: 'pointer' }}>
                <span style={{ display: 'grid', gap: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 620 }}>{subject.name}</span>
                  {showAll && !recommended && <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>Outside your current pathway · still selectable</span>}
                </span>
                {active && <span aria-hidden="true" style={{ fontSize: 11, color: 'var(--primary)' }}>✓</span>}
              </button>
              {active && collectCodes && <div style={{ padding: '0 10px 10px' }}>
                <input value={data.curriculumSubjectCodes?.[subject.id] ?? ''} onChange={event => setSubjectCode(subject.id, event.target.value)} placeholder="Syllabus / subject code (if known)" aria-label={`${subject.name} syllabus or subject code`} style={inputStyle} />
              </div>}
            </div>;
          })}
        </div>
      </section>)}
    </div> : <div style={{ padding: 14, borderRadius: 11, background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.09)', color: 'var(--muted-foreground)', fontSize: 13 }}>No subjects match that search. Try another term or browse all subjects.</div>}

    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9 }}>
      <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{selected.length} selected</span>
      {selected.length > 0 && <button type="button" onClick={() => setSelected([])} style={{ border: 0, background: 'none', color: 'var(--muted-foreground)', fontSize: 11, cursor: 'pointer' }}>Clear</button>}
    </div>
    {collectCodes && <p style={{ marginTop: 9, marginBottom: 0, fontSize: 11, lineHeight: 1.45, color: 'var(--muted-foreground)' }}>Syllabus codes are optional. If you don’t know them, leave them blank. Shadecode must not guess an unverified curriculum.</p>}
    {error && <p role="alert" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 10 }}>{error}</p>}
    <StepActions onNext={handleNext} onBack={onBack} />
  </div>;
}

const inputStyle = { width: '100%', boxSizing: 'border-box' as const, padding: '9px 10px', borderRadius: 8, fontSize: 12, background: 'rgba(0,0,0,.14)', border: '1px solid rgba(255,255,255,.10)', color: 'var(--foreground)', outline: 'none' };
const browseButtonStyle = { width: '100%', padding: '9px 10px', borderRadius: 8, fontSize: 12, fontWeight: 650, background: 'var(--surface-2)', border: '1px solid var(--card-border)', color: 'var(--foreground)', cursor: 'pointer' };
