'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTour } from '@/context/TourContext';
import { TourSpotlight } from './TourSpotlight';
import { TourCard } from './TourCard';
import { TOUR_STEPS } from '@/lib/tour-steps';

/**
 * ProductTour
 * Drop this once anywhere in your dashboard layout (client boundary).
 * It renders into a portal so z-index and stacking contexts can't trap it.
 *
 * Example:
 *   // app/dashboard/layout.tsx
 *   import { ProductTour } from '@/components/tour/ProductTour';
 *   <ProductTour />
 */
export function ProductTour() {
  const { isActive, currentStep, totalSteps, currentStepData, targetRect, nextStep, prevStep, skipTour } =
    useTour();
  const [mounted, setMounted] = useState(false);

  // Hydration guard — portals require the DOM to be ready
  useEffect(() => setMounted(true), []);

  if (!mounted || !isActive) return null;

  const isLastStep = currentStep === totalSteps - 1;

  return createPortal(
    <>
      {/* Layer 1: spotlight overlay */}
      <TourSpotlight targetRect={targetRect} onOverlayClick={skipTour} />

      {/* Layer 2: step card — sits above the overlay */}
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
