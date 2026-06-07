'use client';

import { useState }               from 'react';
import { useRouter }              from 'next/navigation';
import { OnboardingProgress }     from './OnboardingProgress';
import { WelcomeStep }            from './steps/WelcomeStep';
import { SubjectStep }           from './steps/SubjectStep';
import { GoalsStep }              from './steps/GoalsStep';
import { ConfirmStep }            from './steps/ConfirmStep';
import { completeOnboarding }     from '@/lib/actions/onboarding';
import type { OnboardingFormData } from '@/types';

const STEP_LABELS = ['Profile', 'Subjects', 'Goals', 'Confirm'] as const;
const TOTAL       = STEP_LABELS.length;

const DEFAULTS: Partial<OnboardingFormData> = {
  subjects:         [],
  dailyGoalMinutes: 30,
  studyStyle:       'flexible',
};

export function OnboardingFlow() {
  const router = useRouter();

  const [step,         setStep]         = useState(1);
  const [formData,     setFormData]     = useState<Partial<OnboardingFormData>>(DEFAULTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  const update = (patch: Partial<OnboardingFormData>) =>
    setFormData(prev => ({ ...prev, ...patch }));

  const next = () => setStep(s => Math.min(s + 1, TOTAL));
  const back = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await completeOnboarding(formData as OnboardingFormData);
      /**
       * Redirect to dashboard.
       * TourProvider on the dashboard reads onboardingCompleted=true, tourCompleted=false
       * from the DB and calls startTour() automatically after a short delay.
       */
      router.push('/dashboard');
    } catch {
      setSubmitError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const common = { data: formData, onUpdate: update };

  return (
    <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>
      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(124,58,237,0.2)', color: 'rgb(167,139,250)',
          fontSize: 12, fontWeight: 700,
        }}>
          S
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
          Shadecode Student
        </span>
      </div>

      <OnboardingProgress currentStep={step} totalSteps={TOTAL} labels={STEP_LABELS} />

      {/* Step card — keyed so React remounts on step change, triggering fade-in */}
      <div
        key={step}
        style={{
          borderRadius: 16, padding: 24,
          background:   'rgba(255,255,255,0.03)',
          border:       '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {step === 1 && <WelcomeStep   {...common} onNext={next} />}
        {step === 2 && <SubjectsStep  {...common} onNext={next} onBack={back} />}
        {step === 3 && <GoalsStep     {...common} onNext={next} onBack={back} />}
        {step === 4 && (
          <ConfirmStep
            {...common}
            onNext={next}
            onBack={back}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            error={submitError}
          />
        )}
      </div>
    </div>
  );
}
