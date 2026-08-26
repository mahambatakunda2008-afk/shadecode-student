import { describe, expect, it } from 'vitest';
import { curriculumPrompt, resolveCurriculum } from './resolver';
import type { LearnerContext } from '@/lib/learner/context';

const learner: LearnerContext = {
  userId: 'test', stage: 'advanced_secondary', board: 'cambridge', qualification: 'AS & A Level', syllabusCode: '9702', syllabusYear: '2027', subjects: ['Physics'], onboardingComplete: true,
};

describe('curriculum resolver', () => {
  it('resolves an enrolled subject with learner curriculum metadata', () => {
    const result = resolveCurriculum(learner, 'Physics', 'Forces');
    expect(result?.verified).toBe(true);
    expect(result?.syllabusCode).toBe('9702');
  });

  it('rejects subjects outside the learner scope', () => {
    expect(resolveCurriculum(learner, 'Chemistry')).toBeNull();
  });

  it('creates grounded prompt metadata', () => {
    const result = resolveCurriculum(learner, 'Physics', 'Forces');
    expect(curriculumPrompt(result!)).toContain('Syllabus code: 9702');
  });
});
