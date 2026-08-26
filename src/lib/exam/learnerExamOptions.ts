import type { LearnerContext } from '@/lib/learner/context';

export interface ExamLevelOption { id: string; label: string; difficulty: 'easy' | 'medium' | 'hard' | 'exam'; curriculum: string; }

export function getLearnerExamLevel(context: LearnerContext): ExamLevelOption {
  const curriculum = `${context.board} ${context.qualification ?? ''}`.trim();
  switch (context.stage) {
    case 'primary': return { id: 'primary', label: context.qualification ?? 'Primary', difficulty: 'easy', curriculum };
    case 'lower_secondary':
    case 'upper_secondary': return { id: 'secondary', label: context.qualification ?? 'Secondary', difficulty: 'medium', curriculum };
    case 'advanced_secondary': return { id: 'advanced', label: context.qualification ?? 'Advanced Level', difficulty: 'exam', curriculum };
    case 'tertiary': return { id: 'tertiary', label: context.qualification ?? 'Tertiary', difficulty: 'hard', curriculum };
  }
}

export function canGenerateExamForSubject(context: LearnerContext, subject: string): boolean {
  const wanted = subject.trim().toLowerCase();
  return Boolean(wanted) && context.subjects.some(item => item.trim().toLowerCase() === wanted);
}
