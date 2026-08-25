import type { LearnerAcademicContext } from './context';

export interface ProductScope {
  academic: LearnerAcademicContext;
  subjectIds: string[];
  allowCrossCurriculumBrowse: boolean;
  allowCrossStageBrowse: boolean;
}

export function buildProductScope(context: LearnerAcademicContext): ProductScope {
  return {
    academic: context,
    subjectIds: [...context.subjects],
    allowCrossCurriculumBrowse: false,
    allowCrossStageBrowse: false,
  };
}

export function scopeQuery<T extends Record<string, unknown>>(query: T, context: LearnerAcademicContext): T & {
  learnerStage: LearnerAcademicContext['stage'];
  curriculumBoard: string;
  qualification: string;
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

export function canUseSubject(subject: string, context: LearnerAcademicContext): boolean {
  const normalized = subject.trim().toLowerCase();
  return context.subjects.some(item => item.trim().toLowerCase() === normalized);
}
