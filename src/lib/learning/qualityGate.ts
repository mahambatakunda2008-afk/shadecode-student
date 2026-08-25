import type { LearningContentBlock } from './content';

export interface ContentQualityResult {
  ok: boolean;
  score: number;
  errors: string[];
  warnings: string[];
}

export function evaluateContentBlocks(blocks: LearningContentBlock[]): ContentQualityResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!blocks.length) errors.push('Lesson contains no content');
  if (blocks.filter(b => b.type === 'prose').length < 2) warnings.push('Lesson needs more explanatory prose');
  if (!blocks.some(b => b.type === 'question')) errors.push('Lesson has no retrieval practice');
  if (!blocks.some(b => b.type === 'worked_solution')) warnings.push('Lesson has no worked solution');
  if (!blocks.some(b => b.type === 'diagram')) warnings.push('No diagram provided');
  if (!blocks.some(b => b.type === 'callout' && b.tone === 'curiosity')) warnings.push('No curiosity bridge');

  for (const block of blocks) {
    if ('id' in block && !block.id.trim()) errors.push('Content block has an empty id');
    if (block.type === 'prose' && block.markdown.trim().length < 30) warnings.push('A prose block is unusually short');
    if (block.type === 'question' && block.question.marks <= 0) errors.push('Question has invalid marks');
  }

  const score = Math.max(0, Math.min(100,
    100 - errors.length * 20 - warnings.length * 5
  ));
  return { ok: errors.length === 0 && score >= 80, score, errors, warnings };
}
