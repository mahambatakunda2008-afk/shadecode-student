"use client";

import { motion } from "framer-motion";
import type { EducationLevel } from "@/types/onboarding";

interface Props {
  selected: EducationLevel | null;
  onChange: (value: EducationLevel) => void;
  onNext: () => void;
  onBack: () => void;
}

const OPTIONS: {
  value: EducationLevel;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "basic",
    label: "Basic / Primary",
    description: "Foundation level, ages 10–14",
    icon: "📚",
  },
  {
    value: "secondary",
    label: "Secondary / O-Level",
    description: "GCSE, O-Level, Form 1–4",
    icon: "🏫",
  },
  {
    value: "tvet",
    label: "TVET / Polytechnic",
    description: "Vocational, technical, diploma",
    icon: "🔧",
  },
  {
    value: "university",
    label: "University / A-Level",
    description: "Degree level, AS/A-Level",
    icon: "🎓",
  },
  {
    value: "self_learning",
    label: "Self-Learning",
    description: "Learning at your own pace",
    icon: "🧠",
  },
];

export function StepEducation({ selected, onChange, onNext, onBack }: Props) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 backdrop-blur-sm p-8 md:p-10">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-mono tracking-widest text-indigo-400 uppercase">
            Step 2 — Education Level
          </p>
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            What level are you studying at?
          </h2>
          <p className="text-sm text-zinc-500">
            This helps Shadecode calibrate the right difficulty and content for you.
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2">
          {OPTIONS.map((option, i) => {
            const isSelected = selected === option.value;
            return (
              <motion.button
                key={option.value}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => onChange(option.value)}
                className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-500/10 text-white"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <span className="text-xl shrink-0">{option.icon}</span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium leading-none">
                    {option.label}
                  </span>
                  <span
                    className={`text-xs leading-none ${
                      isSelected ? "text-indigo-300" : "text-zinc-600"
                    }`}
                  >
                    {option.description}
                  </span>
                </div>
                <div className="ml-auto shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-colors ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-zinc-700"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-full h-full rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </div>
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
