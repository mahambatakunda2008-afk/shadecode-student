"use client";

import { motion } from "framer-motion";
import type { OnboardingData, EducationLevel, LearningGoal } from "@/types/onboarding";

interface Props {
  data: OnboardingData;
  onNext: () => void;
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

const GOAL_MODE_DESCRIPTION: Record<LearningGoal, string> = {
  exam_preparation:
    "Cortex will prioritise past papers, timed practice, and rapid weak-area detection.",
  skill_development:
    "Cortex will build mastery progressively, reinforcing concepts before advancing.",
  career_building:
    "Cortex will surface industry-relevant modules and track practical skill gaps.",
  exploration:
    "Cortex will follow your curiosity, suggesting content based on what you engage with.",
};

export function StepExplanation({ data, onNext, onBack }: Props) {
  const educationLabel = data.education_level
    ? EDUCATION_LABELS[data.education_level]
    : "—";
  const goalLabel = data.learning_goal
    ? GOAL_LABELS[data.learning_goal]
    : "—";
  const modeDesc = data.learning_goal
    ? GOAL_MODE_DESCRIPTION[data.learning_goal]
    : "Cortex will adapt as you study.";

  const subjectCount = data.subject_interests.length;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 backdrop-blur-sm p-8 md:p-10">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-mono tracking-widest text-indigo-400 uppercase">
            Step 5 — How it works
          </p>
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            Here&apos;s how Shadecode adapts to you
          </h2>
          <p className="text-sm text-zinc-500">
            Your choices have already shaped your system. Here&apos;s what Cortex will do.
          </p>
        </div>

        {/* Profile summary card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col gap-3"
        >
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-wider">
            Your profile
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-600">Level</span>
              <span className="text-sm text-zinc-200 font-medium">
                {educationLabel}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-600">Goal</span>
              <span className="text-sm text-zinc-200 font-medium">
                {goalLabel}
              </span>
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <span className="text-xs text-zinc-600">Subjects</span>
              <span className="text-sm text-zinc-200 font-medium">
                {subjectCount > 0
                  ? `${subjectCount} subject${subjectCount === 1 ? "" : "s"} selected`
                  : "Cortex will suggest subjects for you"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* What happens next */}
        <div className="flex flex-col gap-3">
          {[
            {
              icon: "🔮",
              title: "Cortex activates your learning mode",
              body: modeDesc,
              delay: 0.15,
            },
            {
              icon: "📐",
              title: "Your difficulty is calibrated",
              body: `Content will start at the right level for ${educationLabel} and adjust as you progress.`,
              delay: 0.2,
            },
            {
              icon: "🎯",
              title: "Your revision queue is initialised",
              body:
                subjectCount > 0
                  ? `Your ${subjectCount} subjects are loaded into your personal revision queue.`
                  : "Cortex will build your queue based on your goal and what you study.",
              delay: 0.25,
            },
            {
              icon: "📊",
              title: "Tracking starts immediately",
              body: "Every session, streak, and result feeds back into your learning path in real time.",
              delay: 0.3,
            },
          ].map((item) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: item.delay }}
              className="flex items-start gap-3"
            >
              <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-zinc-200">
                  {item.title}
                </span>
                <span className="text-xs text-zinc-500 leading-relaxed">
                  {item.body}
                </span>
              </div>
            </motion.div>
          ))}
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
            className="flex-[2] py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            I&apos;m ready →
          </button>
        </div>
      </div>
    </div>
  );
}
