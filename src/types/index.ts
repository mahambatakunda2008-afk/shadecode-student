// ─── Onboarding ───────────────────────────────────────────────────────────────

export type StudyLevel = 'high-school' | 'a-level' | 'university' | 'professional';
export type StudyStyle = 'structured' | 'flexible';

export interface OnboardingFormData {
  displayName:      string;
  studyLevel:       StudyLevel;
  subjects:         string[];
  dailyGoalMinutes: number;
  studyStyle:       StudyStyle;
}

export interface StepProps {
  data:     Partial<OnboardingFormData>;
  onUpdate: (patch: Partial<OnboardingFormData>) => void;
  onNext:   () => void;
  onBack?:  () => void;
}

// ─── Tour ─────────────────────────────────────────────────────────────────────

export type TourPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TourStep {
  id:             string;
  step:           number;
  title:          string;
  description:    string;
  targetSelector: string | null;
  position:       TourPosition;
  icon:           string;
  badge?:         string;
  tip?:           string;
}

export interface TourRect {
  x:      number;
  y:      number;
  width:  number;
  height: number;
}

export interface TourContextValue {
  isActive:        boolean;
  currentStep:     number;
  totalSteps:      number;
  currentStepData: TourStep;
  targetRect:      TourRect | null;
  startTour:       () => void;
  nextStep:        () => void;
  prevStep:        () => void;
  skipTour:        () => void;
}
