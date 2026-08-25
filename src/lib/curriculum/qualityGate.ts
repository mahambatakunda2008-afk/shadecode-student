import type { GenerationContext, GenerationQualityResult } from './generationContext';
import { validateGenerationScope } from './generationContext';

export interface GeneratedContentShape {
  title?: string;
  sections?: Array<{ title?: string; body?: string; type?: string }>;
  questions?: Array<{ prompt?: string; answer?: unknown; marks?: number }>;
  diagrams?: Array<{ type?: string; description?: string; data?: unknown }>;
  workedExamples?: Array<{ question?: string; solution?: string }>;
  retrievalQuestions?: Array<{ prompt?: string; answer?: string }>;
  curiosityPrompts?: string[];
}

export function validateGeneratedLesson(context: GenerationContext, subject: string, content: GeneratedContentShape): GenerationQualityResult {
  const scope = validateGenerationScope(context, subject);
  const reasons = [...scope.reasons];
  if (!content.title?.trim()) reasons.push('Missing lesson title.');
  if (!content.sections?.length) reasons.push('Lesson has no substantive sections.');
  if (!content.workedExamples?.length && context.pedagogicalDifficulty !== 'foundation') reasons.push('Missing worked example.');
  if (!content.retrievalQuestions?.length) reasons.push('Missing retrieval practice.');
  if (!content.curiosityPrompts?.length) reasons.push('Missing curiosity/extension prompt.');
  if (context.learner.stage === 'primary' && !content.diagrams?.length) reasons.push('Primary lesson should contain at least one visual/diagram when appropriate.');
  return { valid: reasons.length === 0, score: Math.max(0, 1 - reasons.length * 0.12), reasons };
}

export function validateGeneratedExam(context: GenerationContext, subject: string, content: GeneratedContentShape): GenerationQualityResult {
  const scope = validateGenerationScope(context, subject);
  const reasons = [...scope.reasons];
  if (!content.questions?.length) reasons.push('Exam contains no questions.');
  for (const [index, question] of (content.questions ?? []).entries()) {
    if (!question.prompt?.trim()) reasons.push(`Question ${index + 1} has no prompt.`);
    if (typeof question.marks !== 'number' || question.marks <= 0) reasons.push(`Question ${index + 1} has invalid marks.`);
  }
  return { valid: reasons.length === 0, score: Math.max(0, 1 - reasons.length * 0.1), reasons };
}
