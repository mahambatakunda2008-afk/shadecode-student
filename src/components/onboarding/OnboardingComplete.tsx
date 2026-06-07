import { useTour } from '@/context/TourContext';
 
export function OnboardingComplete() {
  const { startTour } = useTour();
 
  const handleFinishOnboarding = async () => {
    // ... save onboarding data ...
    startTour(); // fires the tour immediately after
  };
 
  return <button onClick={handleFinishOnboarding}>Finish Setup</button>;
}
