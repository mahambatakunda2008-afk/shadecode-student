"use client";

import { motion } from "framer-motion";
import type { OnboardingData, EducationLevel, LearningGoal } from "@/types/onboarding";

interface Props {
  data: OnboardingData;
  isSubmitting: boolean;
  error: string | null;
  onComplete: () => void;
  onBack: () => void;
}

const EDUCATION_LABELS: Record<EducationLevel, string> = {
  basic: "Basic / Primary",
  secondary: "Secondary / O-Level",
  tvet: "TVET / Polytechnic",
  university: "University / A-Level",
  self_learning: "Self-Learning",
};

const GOAL_LABELS: Record<LearningGoal, string> = {
  exam_preparation: "Exam Preparation",
  skill_development: "Skill Development",
  career_building: "Career Building",
  exploration: "Exploration",
};

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function StepFinish({ data, isSubmitting, error, onComplete, onBack }: Props) {
  const educationLabel = data.education_level
    ? EDUCATION_LABELS[data.education_level]
    : "—";
  const goalLabel = data.learning_goal ? GOAL_LABELS[data.learning_goal] : "—";
  const subjectCount = data.subject_interests.length;

  const summaryItems = [
    { label: "Education Level", value: educationLabel, icon: "🎓" },
    { label: "Learning Goal", value: goalLabel, icon: "🎯" },
    {
      label: "Subjects",
      value:
        subjectCount > 0
          ? `${subjectCount} subject${subjectCount === 1 ? "" : "s"}`
          : "Auto-suggested by Cortex",
      icon: "📚",
    },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 backdrop-blur-sm p-8 md:p-10">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          {/* Completion icon */}
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl">
            ✦
          </div>
          <div>
            <p className="text-xs font-mono tracking-widest text-indigo-400 uppercase mb-1">
              Almost there
            </p>
            <h2 className="text-2xl font-semibold text-white tracking-tight">
              Your system is ready to build
            </h2>
            <p className="text-sm text-zinc-500 mt-1.5">
              Review your setup and launch your learning path.
            </p>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden"
        >
          {summaryItems.map((item, i) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 px-4 py-3.5 ${
                i !== summaryItems.length - 1 ? "border-b border-zinc-800" : ""
              }`}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              <div className="flex items-center justify-between w-full gap-2">
                <span className="text-xs text-zinc-600">{item.label}</span>
                <span className="text-sm text-zinc-200 font-medium text-right">
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* What's created note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-start gap-2.5 text-xs text-zinc-600 bg-zinc-900/40 rounded-xl p-3 border border-zinc-800/50"
        >
          <span className="text-zinc-500 shrink-0">ℹ</span>
          <span>
            Clicking <strong className="text-zinc-400">Launch my dashboard</strong> will create your
            profile, initialise your Cortex learning path, and redirect you to your dashboard.
            You can update these preferences anytime in Settings.
          </span>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            {error} — please try again.
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          >
            ← Back
          </button>
          <button
            onClick={onComplete}
            disabled={isSubmitting || !data.education_level || !data.learning_goal}
            className="flex-[2] py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner />
                <span>Building your path…</span>
              </>
            ) : (
              "Launch my dashboard →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
