import type { LearnerContext } from './context';

export interface RouteScope {
  stage: LearnerContext['stage'];
  subjects: string[];
  board: string;
  qualification?: string;
  syllabusCode?: string;
  syllabusYear?: string;
}

export function toRouteScope(context: LearnerContext): RouteScope {
  return {
    stage: context.stage,
    subjects: [...context.subjects],
    board: context.board,
    qualification: context.qualification,
    syllabusCode: context.syllabusCode,
    syllabusYear: context.syllabusYear,
  };
}

export function assertSubjectInScope(subject: string, scope: RouteScope): void {
  const normalized = subject.trim().toLowerCase();
  if (!scope.subjects.some(value => value.toLowerCase() === normalized)) {
    throw new Error('Subject is outside the learner academic context');
  }
}
