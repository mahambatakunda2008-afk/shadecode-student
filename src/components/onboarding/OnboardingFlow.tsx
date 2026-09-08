'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from './OnboardingProgress';
import { WelcomeStep } from './steps/WelcomeStep';
import { AcademicContextStep } from './steps/AcademicContextStep';
import { SubjectsStep } from './steps/SubjectStep';
import { GoalsStep } from './steps/GoalsStep';
import { ConfirmStep } from './steps/ConfirmStep';
import { StepGoalSelection } from './steps/StepGoalSelection';
import { mapOnboardingFormData } from '@/lib/onboarding/mapFormData';
import { setOnboardingComplete } from '@/lib/onboarding';
import { createClient } from '@/lib/supabase/client';
import type { OnboardingFormData } from '@/types';

interface OnboardingRecommendations { recommendedSubjects?: string[]; suggestedCourse?: { title?: string; summary?: string }; firstLesson?: { title?: string; description?: string } | null; }
const STEP_LABELS = ['Path', 'Context', 'Subjects', 'Goal', 'Daily', 'Finish'] as const;
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
      if (!metadataName) return;
      setFormData(prev => prev.displayName ? prev : { ...prev, displayName: metadataName });
    };
    void loadName();
  }, []);

  const update = (patch: Partial<OnboardingFormData>) => setFormData(prev => ({ ...prev, ...patch }));
  const next = () => setStep(s => Math.min(s + 1, TOTAL));
  const back = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/onboarding/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mapOnboardingFormData(formData)) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed');
      setOnboardingComplete();
      if (json?.recommendations) {
        setRecommendations(json.recommendations);
        setTimeout(() => router.push(formData.studyLevel === 'primary' ? '/discovery' : '/dashboard'), 1800);
      } else router.push(formData.studyLevel === 'primary' ? '/discovery' : '/dashboard');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const common = { data: formData, onUpdate: update };
  return (
    <main style={{ minHeight: '100vh', width: '100%', boxSizing: 'border-box', padding: '40px 20px 64px', background: 'var(--background)', color: 'var(--foreground)' }}>
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: 'var(--brand-cyan)', fontSize: 12, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase' }}>Shadecode Student</p>
          <h1 style={{ fontSize: 28, lineHeight: 1.12, fontWeight: 800, marginTop: 7 }}>Let’s make this yours.</h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: 7, fontSize: 14, lineHeight: 1.5 }}>A few smart questions. Then we get out of your way.</p>
        </div>
        <OnboardingProgress currentStep={step} totalSteps={TOTAL} labels={STEP_LABELS} />
        <section key={step} style={{ borderRadius: 16, padding: 24, background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
          {step === 1 && <WelcomeStep {...common} onNext={next} />}
          {step === 2 && <AcademicContextStep {...common} onNext={next} onBack={back} />}
          {step === 3 && <SubjectsStep {...common} onNext={next} onBack={back} />}
          {step === 4 && <StepGoalSelection {...common} onNext={next} onBack={back} />}
          {step === 5 && <GoalsStep {...common} onNext={next} onBack={back} />}
          {step === 6 && <><ConfirmStep {...common} onNext={next} onBack={back} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={submitError} />{recommendations && <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'var(--muted)', border: '1px solid var(--card-border)' }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Your starting point</div>{recommendations.suggestedCourse?.title && <div style={{ fontSize: 14, fontWeight: 600 }}>{recommendations.suggestedCourse.title}</div>}{recommendations.firstLesson?.title && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>First up: {recommendations.firstLesson.title}</div>}</div>}</>}
        </section>
      </div>
    </main>
  );
}
