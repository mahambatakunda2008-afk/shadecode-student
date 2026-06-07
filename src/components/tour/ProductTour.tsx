'use client';

import { useEffect, useState }  from 'react';
import { createPortal }         from 'react-dom';
import { useTour }              from '@/context/TourContext';
import { TourSpotlight }        from './TourSpotlight';
import { TourCard }             from './TourCard';
import { TOUR_STEPS }           from '@/lib/tour-steps';

export function ProductTour() {
  const {
    isActive, currentStep, totalSteps, currentStepData,
    targetRect, nextStep, prevStep, skipTour,
  } = useTour();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !isActive) return null;

  const isLastStep = currentStep === totalSteps - 1;

  return createPortal(
    <>
      <TourSpotlight targetRect={targetRect} onOverlayClick={skipTour} />
      <TourCard
        step={currentStepData}
        currentStep={currentStep}
        totalSteps={totalSteps}
        targetRect={targetRect}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
        isLastStep={isLastStep}
      />
    </>,
    document.body,
  );
}
