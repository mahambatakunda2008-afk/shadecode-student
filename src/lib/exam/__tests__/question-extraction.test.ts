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

    expect(result).toEqual([
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
  });

  it('normalizes wrapped lines and strips trailing marks', () => {
    const result = extractTopLevelQuestions('3. Calculate the force\nacting on the mass. [ 5 ]');
    expect(result[0]).toEqual({
      questionNumber: '3',
      questionText: 'Calculate the force acting on the mass.',
      marks: 5,
    });
  });

  it('does not invent a question from unnumbered content', () => {
    expect(extractTopLevelQuestions('Instructions\nAnswer all questions.')).toEqual([]);
  });
});
