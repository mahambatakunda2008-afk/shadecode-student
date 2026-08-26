import type { LearnerContext } from '@/lib/learner/context';

export interface ExamLevelOption {
  id: string;
  label: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'exam';
  curriculum: string;
}

const FALLBACK_LEVEL: ExamLevelOption = {
  id: 'exam',
  label: 'Exam standard',
  difficulty: 'exam',
  curriculum: 'current learner curriculum',
};

export function getLearnerExamLevel(context: LearnerContext): ExamLevelOption {
  const stage = context.stage.toLowerCase();
  if (stage.includes('primary')) return { id: 'primary', label: 'Primary', difficulty: 'easy', curriculum: `${context.board} ${context.qualification}`.trim() };
  if (stage.includes('secondary') || stage.includes('o-level') || stage.includes('igcse')) return { id: 'secondary', label: context.qualification || 'Secondary', difficulty: 'medium', curriculum: `${context.board} ${context.qualification}`.trim() };
  if (stage.includes('a-level') || stage.includes('advanced')) return { id: 'advanced', label: context.qualification || 'Advanced Level', difficulty: 'exam', curriculum: `${context.board} ${context.qualification}`.trim() };
  if (stage.includes('university') || stage.includes('tertiary')) return { id: 'tertiary', label: context.qualification || 'University', difficulty: 'hard', curriculum: `${context.board} ${context.qualification}`.trim() };
  return FALLBACK_LEVEL;
}

export function canGenerateExamForSubject(context: LearnerContext, subject: string): boolean {
  const wanted = subject.trim().toLowerCase();
  return context.subjects.some(item => item.trim().toLowerCase() === wanted);
}
