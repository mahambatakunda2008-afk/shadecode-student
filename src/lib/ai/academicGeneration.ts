import type { LearnerContext } from '@/lib/learner/context';
import { canUseSubject } from '@/lib/learner/productScope';
import type { CurriculumNode } from '@/lib/curriculum/catalog';

export interface AcademicGenerationRequest {
  context: LearnerContext;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'exam';
  curriculumNode?: CurriculumNode | null;
}

export function assertGenerationScope(request: AcademicGenerationRequest): void {
  if (!request.context.onboardingComplete) throw new Error('Academic context is incomplete.');
  if (!canUseSubject(request.subject, request.context)) throw new Error('Subject is not enrolled.');
  if (request.curriculumNode) {
    if (request.curriculumNode.stage !== request.context.stage) throw new Error('Curriculum stage mismatch.');
    if (request.curriculumNode.subject.trim().toLowerCase() !== request.subject.trim().toLowerCase()) throw new Error('Curriculum subject mismatch.');
    if (request.context.syllabusYear && request.curriculumNode.syllabusYear !== request.context.syllabusYear) throw new Error('Syllabus version mismatch.');
  }
}

export function academicGrounding(request: AcademicGenerationRequest): string {
  const { context, curriculumNode } = request;
  return [
    `ACADEMIC CONTEXT`,
    `Stage: ${context.stage}`,
    `Board: ${context.board}`,
    `Qualification: ${context.qualification ?? 'unspecified'}`,
    `Syllabus code: ${context.syllabusCode ?? 'unspecified'}`,
    `Syllabus year: ${context.syllabusYear ?? 'unspecified'}`,
    `Subject: ${request.subject}`,
    `Pedagogical difficulty: ${request.difficulty}`,
    curriculumNode ? `VERIFIED CURRICULUM NODE: ${curriculumNode.title}` : 'No verified curriculum node. Do not claim syllabus alignment.',
    curriculumNode?.learningOutcomes?.length ? `Learning outcomes: ${curriculumNode.learningOutcomes.join(' | ')}` : '',
    curriculumNode?.commandWords?.length ? `Command words: ${curriculumNode.commandWords.join(', ')}` : '',
    curriculumNode?.assessmentObjectives?.length ? `Assessment objectives: ${curriculumNode.assessmentObjectives.join(', ')}` : '',
    curriculumNode?.practicalSkills?.length ? `Practical skills: ${curriculumNode.practicalSkills.join(' | ')}` : '',
  ].filter(Boolean).join('\n');
}

export function buildLessonGenerationPrompt(request: AcademicGenerationRequest): string {
  assertGenerationScope(request);
  return `${academicGrounding(request)}\n\nTASK: Create a complete lesson on "${request.topic}". Teach for durable understanding, not keyword coverage. Include clear explanation, intuition, worked example, misconception correction, retrieval practice, application, exam connection, and a curiosity/extension section. Use a structured JSON document. Add a structured editable diagram when it materially improves understanding; never invent syllabus claims. Return JSON only.`;
}

export function buildExamGenerationPrompt(request: AcademicGenerationRequest): string {
  assertGenerationScope(request);
  return `${academicGrounding(request)}\n\nTASK: Generate a syllabus-grounded exam question on "${request.topic}". Include marks, command word, assessment objective, syllabus outcome, expected answer and marking points. Add a structured editable diagram when visual reasoning is required. Make the question unambiguous, internally consistent and appropriate to the stated qualification. Return JSON only.`;
}

export function academicCacheKey(request: AcademicGenerationRequest, kind: 'lesson' | 'exam'): string {
  const c = request.context;
  return [
    'academic-generation', kind, c.stage, c.board, c.qualification ?? '-', c.syllabusCode ?? '-',
    c.syllabusYear ?? '-', request.subject.toLowerCase().trim(), request.topic.toLowerCase().trim(),
    request.difficulty, request.curriculumNode?.id ?? 'unverified', 'v1',
  ].join(':');
}
