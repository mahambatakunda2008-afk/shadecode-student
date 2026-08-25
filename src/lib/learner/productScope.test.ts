import { describe, expect, it } from 'vitest';
import { buildAcademicCacheKey, buildProductScope, canUseSubject, hasCompleteAcademicContext, scopeQuery } from './productScope';
import type { LearnerContext } from './context';

const context: LearnerContext = {
  userId: 'test-user',
  stage: 'advanced_secondary',
  board: 'cambridge',
  qualification: 'AS & A Level',
  syllabusCode: '9702',
  syllabusYear: '2025-2027',
  subjects: ['Physics', 'Mathematics'],
  onboardingComplete: true,
};

describe('product scope', () => {
  it('limits the product scope to the learner context', () => {
    const scope = buildProductScope(context);
    expect(scope.academic.board).toBe('cambridge');
    expect(scope.subjectIds).toEqual(['Physics', 'Mathematics']);
    expect(scope.allowCrossStageBrowse).toBe(false);
  });

  it('requires complete academic context before generation is considered ready', () => {
    expect(hasCompleteAcademicContext(context)).toBe(true);
    expect(hasCompleteAcademicContext({ ...context, syllabusCode: undefined })).toBe(false);
  });

  it('allows only enrolled subjects', () => {
    expect(canUseSubject('physics', context)).toBe(true);
    expect(canUseSubject('Chemistry', context)).toBe(false);
  });

  it('propagates the complete academic scope into queries', () => {
    expect(scopeQuery({ topic: 'Momentum' }, context)).toMatchObject({
      learnerStage: 'advanced_secondary',
      curriculumBoard: 'cambridge',
      qualification: 'AS & A Level',
      syllabusCode: '9702',
      syllabusYear: '2025-2027',
    });
  });

  it('separates cache keys across syllabus context', () => {
    const otherYear = { ...context, syllabusYear: '2028' };
    expect(buildAcademicCacheKey(context, 'Physics', 'lesson:momentum', 'v1'))
      .not.toBe(buildAcademicCacheKey(otherYear, 'Physics', 'lesson:momentum', 'v1'));
  });
});
