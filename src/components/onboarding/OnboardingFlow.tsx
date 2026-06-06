"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type {
  OnboardingData,
  OnboardingStep,
  EducationLevel,
  LearningGoal,
  SubjectInterest,
} from "@/types/onboarding";

// ─── Step components ──────────────────────────────────────────────────────────

import { StepWelcome } from "./steps/StepWelcome";
import { StepEducation } from "./steps/StepEducation";
import { StepGoal } from "./steps/StepGoal";
import { StepInterests } from "./steps/StepInterests";
import { StepExplanation } from "./steps/StepExplanation";
import { StepFinish } from "./steps/StepFinish";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

const STEP_LABELS: Record<OnboardingStep, string> = {
  1: "Welcome",
  2: "Education",
  3: "Goal",
  4: "Interests",
  5: "How it works",
  6: "Finishing up",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingFlow() {
  const router = useRouter();

  const [step, setStep] = useState<OnboardingStep>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [data, setData] = useState<OnboardingData>({
    education_level: null,
    learning_goal: null,
    subject_interests: [],
  });

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS) as OnboardingStep);
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1) as OnboardingStep);
  }, []);

  const setEducation = useCallback((value: EducationLevel) => {
    setData((d) => ({ ...d, education_level: value }));
  }, []);

  const setGoal = useCallback((value: LearningGoal) => {
    setData((d) => ({ ...d, learning_goal: value }));
  }, []);

  const toggleInterest = useCallback((value: SubjectInterest) => {
    setData((d) => {
      const current = d.subject_interests;
      return {
        ...d,
        subject_interests: current.includes(value)
          ? current.filter((i) => i !== value)
          : [...current, value],
      };
    });
  }, []);

  const handleComplete = useCallback(async () => {
    if (!data.education_level || !data.learning_goal) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Something went wrong");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save your profile"
      );
      setIsSubmitting(false);
    }
  }, [data, router]);

  // ─── Animation variants ─────────────────────────────────────────────────────

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
    }),
  };

  // ─── Step rendering ─────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepWelcome onNext={goNext} />;
      case 2:
        return (
          <StepEducation
            selected={data.education_level}
            onChange={setEducation}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 3:
        return (
          <StepGoal
            selected={data.learning_goal}
            onChange={setGoal}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 4:
        return (
          <StepInterests
            selected={data.subject_interests}
            onToggle={toggleInterest}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 5:
        return (
          <StepExplanation
            data={data}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 6:
        return (
          <StepFinish
            data={data}
            isSubmitting={isSubmitting}
            error={submitError}
            onComplete={handleComplete}
            onBack={goBack}
          />
        );
      default:
        return null;
    }
  };

  // ─── Progress bar ───────────────────────────────────────────────────────────

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress header */}
      <div className="mb-8">
        {/* Step labels */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase">
            Step {step} of {TOTAL_STEPS}
          </span>
          <span className="text-xs text-zinc-500">
            {STEP_LABELS[step]}
          </span>
        </div>

        {/* Progress track */}
        <div className="h-px bg-zinc-800 w-full rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Step dots */}
        <div className="flex justify-between mt-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`w-1 h-1 rounded-full transition-colors duration-300 ${
                s <= step ? "bg-indigo-500" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
