import { describe, expect, it } from 'vitest';
import { extractTopLevelQuestions } from './question-extraction';

describe('extractTopLevelQuestions', () => {
  it('extracts explicit and plain top-level questions', () => {
    const result = extractTopLevelQuestions(`
1. Explain the principle. [3]
(a) This is a subpart.
2 Explain the second principle. [5]
3) Calculate the value.
`);

    expect(result).toEqual([
      { questionNumber: '1', questionText: 'Explain the principle. (a) This is a subpart.', marks: 3 },
      { questionNumber: '2', questionText: 'Explain the second principle.', marks: 5 },
      { questionNumber: '3', questionText: 'Calculate the value.', marks: null },
    ]);
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
