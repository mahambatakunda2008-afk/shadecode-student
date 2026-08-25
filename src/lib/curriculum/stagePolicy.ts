import type { EducationStage } from './catalog';

export interface LearningPolicy {
  stage: EducationStage;
  readingLevel: 'emerging' | 'developing' | 'fluent' | 'advanced';
  maxExplanationWords: number;
  preferVisuals: boolean;
  allowAdvancedNotation: boolean;
  requireScaffolding: boolean;
  questionStyle: 'playful' | 'guided' | 'exam' | 'professional';
}

export const STAGE_POLICIES: Record<EducationStage, LearningPolicy> = {
  primary: { stage: 'primary', readingLevel: 'emerging', maxExplanationWords: 900, preferVisuals: true, allowAdvancedNotation: false, requireScaffolding: true, questionStyle: 'playful' },
  lower_secondary: { stage: 'lower_secondary', readingLevel: 'developing', maxExplanationWords: 1400, preferVisuals: true, allowAdvancedNotation: false, requireScaffolding: true, questionStyle: 'guided' },
  upper_secondary: { stage: 'upper_secondary', readingLevel: 'fluent', maxExplanationWords: 2200, preferVisuals: true, allowAdvancedNotation: true, requireScaffolding: true, questionStyle: 'exam' },
  advanced_secondary: { stage: 'advanced_secondary', readingLevel: 'advanced', maxExplanationWords: 3200, preferVisuals: true, allowAdvancedNotation: true, requireScaffolding: false, questionStyle: 'exam' },
  tertiary: { stage: 'tertiary', readingLevel: 'advanced', maxExplanationWords: 4500, preferVisuals: true, allowAdvancedNotation: true, requireScaffolding: false, questionStyle: 'professional' },
};

export function getLearningPolicy(stage: EducationStage): LearningPolicy {
  return STAGE_POLICIES[stage];
}
