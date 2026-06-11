'use client';

import { useState }               from 'react';
import { useRouter }              from 'next/navigation';
import { OnboardingProgress }     from './OnboardingProgress';
import { WelcomeStep }            from './steps/WelcomeStep';
import { SubjectsStep }           from './steps/SubjectStep';
import { GoalsStep }              from './steps/GoalsStep';
import { ConfirmStep }            from './steps/ConfirmStep';
import { StepGoalSelection }      from './steps/StepGoalSelection';
import { mapOnboardingFormData }  from '@/lib/onboarding/mapFormData';
import type { OnboardingFormData } from '@/types';

interface OnboardingRecommendations {
  recommendedSubjects?: string[];
  suggestedCourse?: { title?: string; summary?: string };
  firstLesson?: { title?: string; description?: string } | null;
}

const STEP_LABELS = ['Profile', 'Subjects', 'Goals', 'Daily', 'Confirm'] as const;
const TOTAL       = STEP_LABELS.length;

const DEFAULTS: Partial<OnboardingFormData> = {
  subjects:         [],
  goals:            [],
  dailyGoalMinutes: 30,
  studyStyle:       'flexible',
};

export function OnboardingFlow() {
  const router = useRouter();

  const [step,         setStep]         = useState(1);
  const [formData,     setFormData]     = useState<Partial<OnboardingFormData>>(DEFAULTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<OnboardingRecommendations | null>(null);

  const update = (patch: Partial<OnboardingFormData>) =>
    setFormData(prev => ({ ...prev, ...patch }));

  const next = () => setStep(s => Math.min(s + 1, TOTAL));
  const back = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapOnboardingFormData(formData)),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed');
      // If recommendations returned, surface them briefly before redirect
      if (json?.recommendations) {
        setRecommendations(json.recommendations);
        // Keep user on a small summary before redirecting — allow them to read the recommendation
        setTimeout(() => {
          router.push('/dashboard');
        }, 1800);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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
        {step === 3 && <StepGoalSelection {...common} onNext={next} onBack={back} />}
        {step === 4 && <GoalsStep     {...common} onNext={next} onBack={back} />}
        {step === 5 && (
          <>
            <ConfirmStep
              {...common}
              onNext={next}
              onBack={back}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              error={submitError}
            />
            {recommendations && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Recommended next course</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{recommendations.suggestedCourse?.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{recommendations.suggestedCourse?.summary}</div>
                {recommendations.firstLesson && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>First lesson</div>
                    <div style={{ fontSize: 13 }}>{recommendations.firstLesson.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{recommendations.firstLesson.description}</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
