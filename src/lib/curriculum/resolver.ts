import type { CurriculumBoard } from '@/lib/curriculum/catalog';
import type { LearnerContext } from '@/lib/learner/context';

export type CurriculumResolution = {
  board: CurriculumBoard;
  stage: LearnerContext['stage'];
  qualification?: string;
  syllabusCode?: string;
  syllabusYear?: string;
  subject: string;
  topic?: string;
  verified: boolean;
  source: 'learner_context';
};

export function resolveCurriculum(context: LearnerContext, subject: string, topic?: string): CurriculumResolution | null {
  const normalizedSubject = subject.trim();
  if (!normalizedSubject) return null;
  const enrolled = context.subjects.some(item => item.trim().toLowerCase() === normalizedSubject.toLowerCase());
  if (!enrolled) return null;

  return {
    board: context.board,
    stage: context.stage,
    qualification: context.qualification,
    syllabusCode: context.syllabusCode,
    syllabusYear: context.syllabusYear,
    subject: normalizedSubject,
    topic: topic?.trim() || undefined,
    verified: Boolean(context.board && (context.syllabusCode || context.qualification)),
    source: 'learner_context',
  };
}

export function curriculumPrompt(resolution: CurriculumResolution): string {
  const parts = [
    `Stage: ${resolution.stage}`,
    `Board: ${resolution.board}`,
    resolution.qualification && `Qualification: ${resolution.qualification}`,
    resolution.syllabusCode && `Syllabus code: ${resolution.syllabusCode}`,
    resolution.syllabusYear && `Syllabus year: ${resolution.syllabusYear}`,
    `Subject: ${resolution.subject}`,
    resolution.topic && `Topic: ${resolution.topic}`,
  ].filter(Boolean);
  return parts.join('\n');
}
