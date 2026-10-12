'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from './OnboardingProgress';
import { WelcomeStep } from './steps/WelcomeStep';
import { AcademicContextStep } from './steps/AcademicContextStep';
import { SubjectsStep } from './steps/SubjectStep';
import { StepGoalSelection } from './steps/StepGoalSelection';
import { ConfirmStep } from './steps/ConfirmStep';
import { BrandLockup } from '@/components/brand/BrandLockup';
import { mapOnboardingFormData } from '@/lib/onboarding/mapFormData';
import { setOnboardingComplete } from '@/lib/onboarding';
import { createClient } from '@/lib/supabase/client';
import type { OnboardingFormData } from '@/types';

interface OnboardingRecommendations { recommendedSubjects?: string[]; suggestedCourse?: { title?: string; summary?: string }; firstLesson?: { title?: string; description?: string } | null; }
const STEP_LABELS = ['Path', 'Setup', 'Learning', 'Direction', 'Ready'] as const;
const TOTAL = STEP_LABELS.length;
const DEFAULTS: Partial<OnboardingFormData> = { subjects: [], goals: [], dailyGoalMinutes: 30, studyStyle: 'flexible' };

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<OnboardingFormData>>(DEFAULTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<OnboardingRecommendations | null>(null);

  useEffect(() => {
    const loadName = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const metadataName = typeof data.user?.user_metadata?.full_name === 'string' ? data.user.user_metadata.full_name.trim() : '';
      if (metadataName) setFormData(prev => prev.displayName ? prev : { ...prev, displayName: metadataName });
    };
    void loadName();
  }, []);

  const update = (patch: Partial<OnboardingFormData>) => setFormData(prev => ({ ...prev, ...patch }));
  const next = () => setStep(s => Math.min(s + 1, TOTAL));
  const back = () => setStep(s => Math.max(s - 1, 1));
  const homeRoute = formData.studyLevel === 'primary' || formData.studyLevel === 'early-childhood' ? '/discovery' : '/dashboard';

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/onboarding/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mapOnboardingFormData(formData)) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to save your setup.');
      setOnboardingComplete();
      if (json?.recommendations) {
        setRecommendations(json.recommendations);
        setTimeout(() => router.push(homeRoute), 1600);
      } else router.push(homeRoute);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const common = { data: formData, onUpdate: update };
  return (
    <main className="dark ssc-onboarding-shell">
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header style={{ marginBottom: 28 }}>
          <div className="ssc-onboarding-brand"><BrandLockup /></div>
          <h1 style={{ fontSize: 'clamp(27px, 6vw, 36px)', lineHeight: 1.08, fontWeight: 750, letterSpacing: '-.035em', color: 'var(--foreground)' }}>Let&apos;s build your starting point.</h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: 9, fontSize: 14, lineHeight: 1.55, maxWidth: 430 }}>A few useful choices. No questionnaire marathon. Your answers shape what you see next.</p>
        </header>

        <OnboardingProgress currentStep={step} totalSteps={TOTAL} labels={STEP_LABELS} />

        <section key={step} className="ssc-onboarding-panel">
          {step === 1 && <WelcomeStep {...common} onNext={next} />}
          {step === 2 && <AcademicContextStep {...common} onNext={next} onBack={back} />}
          {step === 3 && <SubjectsStep {...common} onNext={next} onBack={back} />}
          {step === 4 && <StepGoalSelection {...common} onNext={next} onBack={back} />}
          {step === 5 && <><ConfirmStep {...common} onNext={next} onBack={back} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={submitError} />{recommendations && <div className="ssc-onboarding-recommendations"><div className="ssc-onboarding-recommendations__label">Your starting point</div>{recommendations.suggestedCourse?.title && <div className="ssc-onboarding-recommendations__title">{recommendations.suggestedCourse.title}</div>}{recommendations.firstLesson?.title && <div className="ssc-onboarding-recommendations__detail">First up: {recommendations.firstLesson.title}</div>}</div>}</>}
        </section>
      </div>
    </main>
  );
}
