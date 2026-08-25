import type { LearningLesson } from './content';

const REQUIRED_COVERAGE: (keyof LearningLesson['coverage'])[] = [
  'definitions', 'principles', 'relationships', 'prerequisites', 'examples',
  'misconceptions', 'examSkills', 'transfer', 'curiosity',
];

export interface LessonQualityResult {
  ok: boolean;
  score: number;
  missing: string[];
  warnings: string[];
}

export function evaluateLessonQuality(lesson: LearningLesson): LessonQualityResult {
  const missing = REQUIRED_COVERAGE.filter((key) => lesson.coverage[key] < 0.5);
  const warnings: string[] = [];

  if (!lesson.learningPromise.trim()) warnings.push('Missing learning promise');
  if (lesson.blocks.length < 5) warnings.push('Lesson has very few content blocks');
  if (!lesson.blocks.some((block) => block.type === 'question')) warnings.push('No embedded practice question');
  if (!lesson.blocks.some((block) => block.type === 'worked_solution')) warnings.push('No worked solution');
  if (!lesson.blocks.some((block) => block.type === 'callout' && block.tone === 'curiosity')) warnings.push('No curiosity bridge');

  const values = Object.values(lesson.coverage);
  const score = values.length ? values.reduce((a, b) => a + Math.max(0, Math.min(1, b)), 0) / values.length : 0;
  return { ok: missing.length === 0 && warnings.length <= 1, score, missing, warnings };
}
