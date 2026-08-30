import { describe, expect, it } from 'vitest';
import { extractTopLevelQuestionsFromPages } from '@/lib/exam/question-extraction';

describe('extractTopLevelQuestionsFromPages', () => {
  it('extracts top-level questions across page boundaries with provenance', () => {
    const questions = extractTopLevelQuestionsFromPages([
      { pageNumber: 1, text: '1. Explain the experiment. [4]\nContinue the explanation.' },
      { pageNumber: 2, text: 'Continue with the result.\n2) Calculate the value. [3]' },
    ]);

    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({
      questionNumber: '1',
      marks: 4,
      sourcePageStart: 1,
      sourcePageEnd: 2,
      extractionMethod: 'explicit-numbering',
    });
    expect(questions[0].questionText).toContain('Explain the experiment.');
    expect(questions[0].questionText).toContain('Continue with the result.');
    expect(questions[1]).toMatchObject({
      questionNumber: '2',
      marks: 3,
      sourcePageStart: 2,
      sourcePageEnd: 2,
    });
  });

  it('rejects common subparts as top-level questions', () => {
    const questions = extractTopLevelQuestionsFromPages([
      { pageNumber: 1, text: '1. Main question\n(a) first part\n1 (b) second part\n2. Next question [2]' },
    ]);

    expect(questions.map((question) => question.questionNumber)).toEqual(['1', '2']);
  });
});
