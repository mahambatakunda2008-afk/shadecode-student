"use client";

import { motion } from "framer-motion";
import type { LearningGoal } from "@/types/onboarding";

interface Props {
  selected: LearningGoal | null;
  onChange: (value: LearningGoal) => void;
  onNext: () => void;
  onBack: () => void;
}

const OPTIONS: {
  value: LearningGoal;
  label: string;
  description: string;
  icon: string;
  badge: string;
}[] = [
  {
    value: "exam_preparation",
    label: "Exam Preparation",
    description: "Targeted revision, past papers, timed practice",
    icon: "🎯",
    badge: "Most Popular",
  },
  {
    value: "skill_development",
    label: "Skill Development",
    description: "Build mastery in specific topics step by step",
    icon: "📈",
    badge: "",
  },
  {
    value: "career_building",
    label: "Career Building",
    description: "Industry-relevant knowledge and certifications",
    icon: "💼",
    badge: "",
  },
  {
    value: "exploration",
    label: "Exploration",
    description: "Follow curiosity, discover new subjects freely",
    icon: "🌍",
    badge: "",
  },
];

export function StepGoal({ selected, onChange, onNext, onBack }: Props) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 backdrop-blur-sm p-8 md:p-10">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-mono tracking-widest text-indigo-400 uppercase">
            Step 3 — Learning Goal
          </p>
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            What brings you here?
          </h2>
          <p className="text-sm text-zinc-500">
            Your goal shapes how Cortex prioritises your study sessions.
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPTIONS.map((option, i) => {
            const isSelected = selected === option.value;
            return (
              <motion.button
                key={option.value}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => onChange(option.value)}
                className={`relative flex flex-col gap-2 p-4 rounded-xl border text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                {option.badge && (
                  <span className="absolute top-3 right-3 text-[10px] font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-full">
                    {option.badge}
                  </span>
                )}
                <span className="text-2xl">{option.icon}</span>
                <span
                  className={`text-sm font-medium ${
                    isSelected ? "text-white" : "text-zinc-300"
                  }`}
                >
                  {option.label}
                </span>
                <span
                  className={`text-xs leading-relaxed ${
                    isSelected ? "text-indigo-300" : "text-zinc-600"
                  }`}
                >
                  {option.description}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onBack}
            className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          >
            ← Back
          </button>
          <button
            onClick={onNext}
            disabled={!selected}
            className="flex-[2] py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
