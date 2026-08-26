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
  const stage = context.stage;
  if (stage === 'primary') return { id: 'primary', label: 'Primary', difficulty: 'easy', curriculum: `${context.board} ${context.qualification}`.trim() };
  if (stage === 'lower_secondary' || stage === 'upper_secondary') return { id: 'secondary', label: context.qualification || 'Secondary', difficulty: 'medium', curriculum: `${context.board} ${context.qualification}`.trim() };
  if (stage === 'advanced_secondary') return { id: 'advanced', label: context.qualification || 'Advanced Level', difficulty: 'exam', curriculum: `${context.board} ${context.qualification}`.trim() };
  if (stage === 'tertiary') return { id: 'tertiary', label: context.qualification || 'University', difficulty: 'hard', curriculum: `${context.board} ${context.qualification}`.trim() };
  return FALLBACK_LEVEL;
}

export function canGenerateExamForSubject(context: LearnerContext, subject: string): boolean {
  const wanted = subject.trim().toLowerCase();
  return context.subjects.some(item => item.trim().toLowerCase() === wanted);
}
