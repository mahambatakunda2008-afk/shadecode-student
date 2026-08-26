import type { CurriculumBoard } from '@/lib/curriculum/catalog';
import type { LearnerContext } from '@/lib/learner/context';

export type CurriculumResolution = {
  stage: LearnerContext['stage'];
  board: CurriculumBoard;
  qualification?: string;
  syllabusCode?: string;
  syllabusYear?: string;
  subject: string;
  topic?: string;
};

export function resolveCurriculum(context: LearnerContext, subject: string, topic?: string): CurriculumResolution | null {
  const normalizedSubject = subject.trim();
  if (!normalizedSubject) return null;
  if (!context.subjects.some(s => s.trim().toLowerCase() === normalizedSubject.toLowerCase())) return null;
  return {
    stage: context.stage,
    board: context.board,
    qualification: context.qualification,
    syllabusCode: context.syllabusCode,
    syllabusYear: context.syllabusYear,
    subject: normalizedSubject,
    topic: topic?.trim() || undefined,
  };
}
