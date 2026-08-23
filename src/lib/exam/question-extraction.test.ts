import { describe, expect, it } from 'vitest';
import { extractTopLevelQuestionsFromPages } from './question-extraction';

describe('extractTopLevelQuestionsFromPages', () => {
  it('preserves question boundaries, marks, and page provenance', () => {
    const questions = extractTopLevelQuestionsFromPages([
      { pageNumber: 1, text: '1. Solve x + 2 = 7. [3]\n( a ) Show your working.' },
      { pageNumber: 2, text: 'Continue the explanation here.\n2) Explain why the graph has this shape. [4]' },
    ]);

    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({
      questionNumber: '1',
      marks: 3,
      sourcePageStart: 1,
      sourcePageEnd: 2,
      extractionMethod: 'explicit-numbering',
      extractionConfidence: 0.98,
    });
    expect(questions[1]).toMatchObject({
      questionNumber: '2',
      marks: 4,
      sourcePageStart: 2,
      sourcePageEnd: 2,
      extractionMethod: 'explicit-numbering',
      extractionConfidence: 0.98,
    });
  });

  it('does not treat common subparts as top-level questions', () => {
    const questions = extractTopLevelQuestionsFromPages([
      { pageNumber: 3, text: '3. Find the value.\n(a) Hence find y.\n(b) Explain your answer.' },
    ]);

    expect(questions).toHaveLength(1);
    expect(questions[0].questionNumber).toBe('3');
    expect(questions[0].questionText).toContain('(a) Hence find y.');
  });
});
