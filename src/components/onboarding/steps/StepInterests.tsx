"use client";

import { motion } from "framer-motion";
import type { SubjectInterest } from "@/types/onboarding";

interface Props {
  selected: SubjectInterest[];
  onToggle: (value: SubjectInterest) => void;
  onNext: () => void;
  onBack: () => void;
}

const SUBJECTS: {
  value: SubjectInterest;
  label: string;
  icon: string;
  group: string;
}[] = [
  // Sciences
  { value: "mathematics", label: "Mathematics", icon: "∑", group: "Sciences" },
  { value: "physics", label: "Physics", icon: "⚛", group: "Sciences" },
  { value: "chemistry", label: "Chemistry", icon: "🧪", group: "Sciences" },
  { value: "biology", label: "Biology", icon: "🧬", group: "Sciences" },
  // Technology
  { value: "computer_science", label: "Computer Science", icon: "💻", group: "Technology" },
  { value: "coding", label: "Coding", icon: "⌨", group: "Technology" },
  // Business
  { value: "business", label: "Business", icon: "📊", group: "Business" },
  { value: "economics", label: "Economics", icon: "📉", group: "Business" },
  { value: "accounting", label: "Accounting", icon: "🧾", group: "Business" },
  // Humanities
  { value: "english", label: "English", icon: "✍", group: "Humanities" },
  { value: "history", label: "History", icon: "🏛", group: "Humanities" },
  { value: "geography", label: "Geography", icon: "🌍", group: "Humanities" },
  // Creative
  { value: "art", label: "Art & Design", icon: "🎨", group: "Creative" },
  { value: "music", label: "Music", icon: "🎵", group: "Creative" },
];

const MAX_SELECTIONS = 6;

export function StepInterests({ selected, onToggle, onNext, onBack }: Props) {
  const atMax = selected.length >= MAX_SELECTIONS;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 backdrop-blur-sm p-8 md:p-10">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-mono tracking-widest text-indigo-400 uppercase">
            Step 4 — Subjects & Interests
          </p>
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            What do you study?
          </h2>
          <p className="text-sm text-zinc-500">
            Pick up to {MAX_SELECTIONS} subjects. You can change these anytime.{" "}
            <span className="text-zinc-400 font-medium">
              ({selected.length}/{MAX_SELECTIONS} selected)
            </span>
          </p>
        </div>

        {/* Subject grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUBJECTS.map((subject, i) => {
            const isSelected = selected.includes(subject.value);
            const isDisabled = atMax && !isSelected;
            return (
              <motion.button
                key={subject.value}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => !isDisabled && onToggle(subject.value)}
                disabled={isDisabled}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-500/10 text-white"
                    : isDisabled
                    ? "border-zinc-800/50 bg-zinc-900/20 text-zinc-700 cursor-not-allowed"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <span
                  className={`text-base shrink-0 font-mono ${
                    isSelected ? "text-indigo-400" : ""
                  }`}
                >
                  {subject.icon}
                </span>
                <span className="text-xs font-medium leading-tight">
                  {subject.label}
                </span>
                {isSelected && (
                  <div className="ml-auto shrink-0 w-3.5 h-3.5 rounded-full bg-indigo-500 flex items-center justify-center">
                    <svg
                      className="w-2 h-2 text-white"
                      fill="none"
                      viewBox="0 0 12 12"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Skip hint */}
        {selected.length === 0 && (
          <p className="text-xs text-zinc-600 text-center -mt-2">
            No pressure — you can skip this and Cortex will suggest subjects based on your goal.
          </p>
        )}

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
            className="flex-[2] py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            {selected.length === 0 ? "Skip for now →" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}
