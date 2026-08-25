import type { LearnerContext } from './context';

export interface ProductScope {
  academic: LearnerContext;
  subjectIds: string[];
  allowCrossCurriculumBrowse: boolean;
  allowCrossStageBrowse: boolean;
}

export function buildProductScope(context: LearnerContext): ProductScope {
  return {
    academic: context,
    subjectIds: [...context.subjects],
    allowCrossCurriculumBrowse: false,
    allowCrossStageBrowse: false,
  };
}

export function scopeQuery<T extends Record<string, unknown>>(query: T, context: LearnerContext): T & {
  learnerStage: LearnerContext['stage'];
  curriculumBoard: string;
  qualification?: string;
  syllabusCode?: string;
  syllabusYear?: string;
} {
  return {
    ...query,
    learnerStage: context.stage,
    curriculumBoard: context.board,
    qualification: context.qualification,
    syllabusCode: context.syllabusCode,
    syllabusYear: context.syllabusYear,
  };
}

export function canUseSubject(subject: string, context: LearnerContext): boolean {
  const normalized = subject.trim().toLowerCase();
  return context.subjects.some(item => item.trim().toLowerCase() === normalized);
}
