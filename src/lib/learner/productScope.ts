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

export function hasCompleteAcademicContext(context: LearnerContext): boolean {
  return Boolean(
    context.onboardingComplete &&
    context.board &&
    context.qualification &&
    context.syllabusCode &&
    context.syllabusYear &&
    context.subjects.length > 0,
  );
}

export function scopeQuery<T extends Record<string, unknown>>(query: T, context: LearnerContext): T & {
  learnerStage: LearnerContext['stage'];
  curriculumBoard: LearnerContext['board'];
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

export function buildAcademicCacheKey(
  context: LearnerContext,
  subject: string,
  artifact: string,
  version: string,
): string {
  const normalizedSubject = subject.trim().toLowerCase();
  return [
    'academic',
    version,
    context.stage,
    context.board,
    context.qualification ?? 'unknown-qualification',
    context.syllabusCode ?? 'unknown-syllabus',
    context.syllabusYear ?? 'unknown-year',
    normalizedSubject,
    artifact.trim().toLowerCase(),
  ].join(':');
}

export function canUseSubject(subject: string, context: LearnerContext): boolean {
  const normalized = subject.trim().toLowerCase();
  return context.subjects.some(item => item.trim().toLowerCase() === normalized);
}
