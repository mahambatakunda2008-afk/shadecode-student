'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from './OnboardingProgress';
import { WelcomeStep } from './steps/WelcomeStep';
import { AcademicContextStep } from './steps/AcademicContextStep';
import { SubjectsStep } from './steps/SubjectStep';
import { StepGoalSelection } from './steps/StepGoalSelection';
import { ConfirmStep } from './steps/ConfirmStep';
import { mapOnboardingFormData } from '@/lib/onboarding/mapFormData';
import { setOnboardingComplete } from '@/lib/onboarding';
import { createClient } from '@/lib/supabase/client';
import type { OnboardingFormData } from '@/types';

interface OnboardingRecommendations { recommendedSubjects?: string[]; suggestedCourse?: { title?: string; summary?: string }; firstLesson?: { title?: string; description?: string } | null; }
const STEP_LABELS = ['Path', 'Setup', 'Subjects', 'Goals', 'Ready'] as const;
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
        setTimeout(() => router.push(formData.studyLevel === 'primary' ? '/discovery' : '/dashboard'), 1600);
      } else router.push(formData.studyLevel === 'primary' ? '/discovery' : '/dashboard');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const common = { data: formData, onUpdate: update };
  return (
    <main style={{ minHeight: '100vh', width: '100%', padding: 'clamp(24px, 5vw, 56px) 18px 64px', background: 'radial-gradient(circle at 15% 0%, rgba(0,168,255,.13), transparent 30rem), radial-gradient(circle at 90% 18%, rgba(122,60,255,.08), transparent 24rem), #06111C', color: '#F5F7FA', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 520, margin: '0 auto' }}>
        <header style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 22 }}>
            <div style={{ width: 9, height: 9, borderRadius: 999, background: 'linear-gradient(135deg,#22D3EE,#245BFF)', boxShadow: '0 0 18px rgba(34,211,238,.45)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#AAB2BF' }}>Shadecode Student</span>
          </div>
          <h1 style={{ fontSize: 'clamp(27px, 6vw, 36px)', lineHeight: 1.08, fontWeight: 750, letterSpacing: '-.035em', color: '#F5F7FA' }}>Let&apos;s build your starting point.</h1>
          <p style={{ color: '#AAB2BF', marginTop: 9, fontSize: 14, lineHeight: 1.55, maxWidth: 430 }}>A few useful choices. No questionnaire marathon. Your answers shape what you see next.</p>
        </header>

        <OnboardingProgress currentStep={step} totalSteps={TOTAL} labels={STEP_LABELS} />

        <section key={step} style={{ borderRadius: 20, padding: 'clamp(20px, 5vw, 28px)', background: 'rgba(11,23,36,.92)', border: '1px solid rgba(255,255,255,.10)', boxShadow: '0 24px 70px rgba(0,0,0,.28)', backdropFilter: 'blur(16px)' }}>
          {step === 1 && <WelcomeStep {...common} onNext={next} />}
          {step === 2 && <AcademicContextStep {...common} onNext={next} onBack={back} />}
          {step === 3 && <SubjectsStep {...common} onNext={next} onBack={back} />}
          {step === 4 && <StepGoalSelection {...common} onNext={next} onBack={back} />}
          {step === 5 && <><ConfirmStep {...common} onNext={next} onBack={back} onSubmit={handleSubmit} isSubmitting={isSubmitting} error={submitError} />{recommendations && <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: 'rgba(34,211,238,.07)', border: '1px solid rgba(34,211,238,.18)' }}><div style={{ fontSize: 12, fontWeight: 700, color: '#67E8F9', marginBottom: 5 }}>Your starting point</div>{recommendations.suggestedCourse?.title && <div style={{ fontSize: 14, fontWeight: 650, color: '#F5F7FA' }}>{recommendations.suggestedCourse.title}</div>}{recommendations.firstLesson?.title && <div style={{ marginTop: 6, fontSize: 12, color: '#AAB2BF' }}>First up: {recommendations.firstLesson.title}</div>}</div>}</>}
        </section>
      </div>
    </main>
  );
}
