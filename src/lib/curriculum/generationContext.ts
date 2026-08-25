import type { LearnerContext } from '@/lib/learner/context';
import type { CurriculumNode } from './catalog';

export interface GenerationContext {
  learner: LearnerContext;
  curriculumNode?: CurriculumNode;
  pedagogicalDifficulty: 'foundation' | 'standard' | 'challenging' | 'exam';
  generationVersion: string;
}

export interface GenerationQualityResult {
  valid: boolean;
  score: number;
  reasons: string[];
}

export function buildGenerationContext(
  learner: LearnerContext,
  curriculumNode?: CurriculumNode,
  pedagogicalDifficulty: GenerationContext['pedagogicalDifficulty'] = 'standard',
): GenerationContext {
  return { learner, curriculumNode, pedagogicalDifficulty, generationVersion: 'curriculum-grounded-v1' };
}

export function validateGenerationScope(context: GenerationContext, requestedSubject: string): GenerationQualityResult {
  const reasons: string[] = [];
  const subject = requestedSubject.trim().toLowerCase();
  if (!context.learner.subjects.some(value => value.toLowerCase() === subject)) reasons.push('Requested subject is not enrolled in the learner academic context.');
  if (!context.learner.board || !context.learner.qualification) reasons.push('Curriculum board and qualification are required.');
  if (context.curriculumNode) {
    if (context.curriculumNode.subject.toLowerCase() !== subject) reasons.push('Curriculum node subject does not match requested subject.');
    if (context.learner.syllabusYear && context.curriculumNode.syllabusYear !== context.learner.syllabusYear) reasons.push('Curriculum node is from a different syllabus year.');
  }
  return { valid: reasons.length === 0, score: Math.max(0, 1 - reasons.length * 0.3), reasons };
}

export function buildCurriculumGroundingPrompt(context: GenerationContext): string {
  const { learner, curriculumNode } = context;
  return [
    `Learner stage: ${learner.stage}`,
    `Curriculum board: ${learner.board}`,
    `Qualification: ${learner.qualification ?? 'not specified'}`,
    `Syllabus code: ${learner.syllabusCode ?? 'not specified'}`,
    `Syllabus year: ${learner.syllabusYear ?? 'not specified'}`,
    `Enrolled subjects: ${learner.subjects.join(', ')}`,
    `Pedagogical difficulty: ${context.pedagogicalDifficulty}`,
    curriculumNode ? `Verified curriculum topic: ${curriculumNode.title}` : 'No verified curriculum node is available; do not invent syllabus claims.',
    curriculumNode?.learningOutcomes?.length ? `Learning outcomes: ${curriculumNode.learningOutcomes.join(' | ')}` : '',
    curriculumNode?.commandWords?.length ? `Command words: ${curriculumNode.commandWords.join(', ')}` : '',
    curriculumNode?.assessmentObjectives?.length ? `Assessment objectives: ${curriculumNode.assessmentObjectives.join(', ')}` : '',
    curriculumNode?.practicalSkills?.length ? `Practical skills: ${curriculumNode.practicalSkills.join(' | ')}` : '',
  ].filter(Boolean).join('\n');
}
