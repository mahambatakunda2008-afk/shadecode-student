import type { CurriculumBoard, EducationStage } from '@/lib/curriculum/catalog';

export interface LearnerContext {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  stage: EducationStage;
  board: CurriculumBoard;
  qualification?: string;
  syllabusCode?: string;
  syllabusYear?: string;
  schoolName?: string;
  subjects: string[];
  timezone?: string;
  locale?: string;
  onboardingComplete: boolean;
}

export interface FeatureScope {
  stage: EducationStage;
  allowedBoards: CurriculumBoard[];
  showQualificationSwitcher: boolean;
  allowCrossStageContent: boolean;
  examMode: 'primary_assessment' | 'secondary_exam' | 'advanced_exam' | 'tertiary_assessment';
}

export function getFeatureScope(context: LearnerContext): FeatureScope {
  const advanced = context.stage === 'advanced_secondary';
  const primary = context.stage === 'primary';
  return {
    stage: context.stage,
    allowedBoards: [context.board],
    showQualificationSwitcher: false,
    allowCrossStageContent: false,
    examMode: primary ? 'primary_assessment' : advanced ? 'advanced_exam' : context.stage === 'tertiary' ? 'tertiary_assessment' : 'secondary_exam',
  };
}

export function canUseSyllabus(context: LearnerContext, board: CurriculumBoard, syllabusCode?: string) {
  if (board !== context.board) return false;
  if (syllabusCode && context.syllabusCode && syllabusCode !== context.syllabusCode) return false;
  return true;
}

export function normalizeLearnerContext(input: Partial<LearnerContext> & Pick<LearnerContext, 'userId'>): LearnerContext {
  return {
    userId: input.userId,
    displayName: input.displayName?.trim() || undefined,
    avatarUrl: input.avatarUrl,
    stage: input.stage ?? 'advanced_secondary',
    board: input.board ?? 'cambridge',
    qualification: input.qualification?.trim() || undefined,
    syllabusCode: input.syllabusCode?.trim() || undefined,
    syllabusYear: input.syllabusYear?.trim() || undefined,
    schoolName: input.schoolName?.trim() || undefined,
    subjects: [...new Set((input.subjects ?? []).map(s => s.trim()).filter(Boolean))],
    timezone: input.timezone,
    locale: input.locale,
    onboardingComplete: Boolean(input.onboardingComplete),
  };
}
