export type TourPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TourStep {
  id: string;
  step: number;
  title: string;
  description: string;
  targetSelector: string | null; // matches data-tour-target="value"
  position: TourPosition;
  icon: string;
  badge?: string;
  tip?: string;
}

export interface TourRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TourContextValue {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TourStep;
  targetRect: TourRect | null;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
}
