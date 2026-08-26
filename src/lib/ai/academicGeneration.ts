import type { LearnerContext } from '@/lib/learner/context';
import type { CurriculumNode } from '@/lib/curriculum/catalog';

export interface AcademicGenerationRequest {
  context: LearnerContext;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'exam';
  curriculumNode?: CurriculumNode | null;
}

export function assertGenerationScope(request: AcademicGenerationRequest): void {
  if (!request.context.onboardingComplete) throw new Error('ACADEMIC_CONTEXT_INCOMPLETE');
  const subject = request.subject.trim().toLowerCase();
  if (!request.context.subjects.some(item => item.trim().toLowerCase() === subject)) throw new Error('SUBJECT_NOT_ENROLLED');
  const node = request.curriculumNode;
  if (!node) return;
  if (node.stage !== request.context.stage) throw new Error('CURRICULUM_STAGE_MISMATCH');
  if (node.subject.trim().toLowerCase() !== subject) throw new Error('CURRICULUM_SUBJECT_MISMATCH');
  if (request.context.syllabusYear && node.syllabusYear !== request.context.syllabusYear) throw new Error('SYLLABUS_VERSION_MISMATCH');
}

export function academicGrounding(request: AcademicGenerationRequest): string {
  const c = request.context;
  const node = request.curriculumNode;
  return [
    'ACADEMIC CONTEXT',
    `Stage: ${c.stage}`,
    `Board: ${c.board}`,
    `Qualification: ${c.qualification ?? 'unspecified'}`,
    `Syllabus code: ${c.syllabusCode ?? 'unspecified'}`,
    `Syllabus year: ${c.syllabusYear ?? 'unspecified'}`,
    `Subject: ${request.subject}`,
    `Pedagogical difficulty: ${request.difficulty}`,
    node ? `VERIFIED CURRICULUM NODE: ${node.title}` : 'No verified curriculum node. Do not claim syllabus alignment.',
    node?.learningOutcomes?.length ? `Learning outcomes: ${node.learningOutcomes.join(' | ')}` : '',
    node?.commandWords?.length ? `Command words: ${node.commandWords.join(', ')}` : '',
    node?.assessmentObjectives?.length ? `Assessment objectives: ${node.assessmentObjectives.join(', ')}` : '',
    node?.practicalSkills?.length ? `Practical skills: ${node.practicalSkills.join(' | ')}` : '',
  ].filter(Boolean).join('\n');
}

export function buildLessonGenerationPrompt(request: AcademicGenerationRequest): string {
  assertGenerationScope(request);
  return `${academicGrounding(request)}\n\nTASK: Create a rigorous, engaging lesson on "${request.topic}". Teach for durable understanding, not keyword coverage. Include prerequisite activation, precise definitions, intuitive explanation, worked examples, misconceptions, application, retrieval practice, exam technique, and a curiosity/extension section. Return structured JSON. Add a structured diagram specification when visual reasoning improves understanding. Never invent syllabus alignment.`;
}

export function buildExamGenerationPrompt(request: AcademicGenerationRequest): string {
  assertGenerationScope(request);
  return `${academicGrounding(request)}\n\nTASK: Generate a rigorous exam question on "${request.topic}" appropriate to the stated qualification. Include marks, command word, assessment objective, syllabus outcome when verified, expected answer, and marking points. Add a structured diagram specification when visual reasoning is required. Make every value, unit, diagram and instruction internally consistent. Return structured JSON.`;
}

export function academicCacheKey(request: AcademicGenerationRequest, kind: 'lesson' | 'exam'): string {
  const c = request.context;
  return ['academic-generation', kind, c.stage, c.board, c.qualification ?? '-', c.syllabusCode ?? '-', c.syllabusYear ?? '-', request.subject.trim().toLowerCase(), request.topic.trim().toLowerCase(), request.difficulty, request.curriculumNode?.id ?? 'unverified', 'v1'].join(':');
}
