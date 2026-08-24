import { describe, expect, it } from 'vitest';
import { extractTopLevelQuestions } from '../question-extraction';

describe('extractTopLevelQuestions', () => {
  it('extracts numbered questions and preserves subparts', () => {
    const result = extractTopLevelQuestions(`
      1. Define acceleration. [2]
      (a) State its SI unit.
      (b) Give one example.
      2 Explain why the object accelerates.
    `);

    expect(result).toMatchObject([
      {
        questionNumber: '1',
        questionText: 'Define acceleration. (a) State its SI unit. (b) Give one example.',
        marks: 2,
      },
      {
        questionNumber: '2',
        questionText: 'Explain why the object accelerates.',
        marks: null,
      },
    ]);
    expect(result[0]).toHaveProperty('extractionConfidence');
    expect(result[0]).toHaveProperty('extractionMethod');
    expect(result[0]).toHaveProperty('sourcePageStart');
    expect(result[0]).toHaveProperty('sourcePageEnd');
  });

  it('normalizes wrapped lines and strips trailing marks', () => {
    const result = extractTopLevelQuestions('3. Calculate the force\nacting on the mass. [ 5 ]');
    expect(result[0]).toMatchObject({
      questionNumber: '3',
      questionText: 'Calculate the force acting on the mass.',
      marks: 5,
    });
  });

  it('does not invent a question from unnumbered content', () => {
    expect(extractTopLevelQuestions('Instructions\nAnswer all questions.')).toEqual([]);
  });

  it('does not promote numbered subparts to top-level questions', () => {
    const result = extractTopLevelQuestions(`
1. Discuss the process.
2 (a) Define the term.
2 (b) Give one example.
3 a) Explain the exception.
3. State the conclusion.
`);

    expect(result.map((question) => question.questionNumber)).toEqual(['1', '3']);
    expect(result[0].questionText).toContain('2 (a) Define the term.');
    expect(result[0].questionText).toContain('2 (b) Give one example.');
  });

  it('does not treat a bare page number as a question', () => {
    const result = extractTopLevelQuestions(`
1
Cambridge International Examination
2
1. Answer the question.
`);

    expect(result).toHaveLength(1);
    expect(result[0].questionNumber).toBe('1');
  });
});
