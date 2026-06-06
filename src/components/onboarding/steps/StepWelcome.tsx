"use client";

import { motion } from "framer-motion";

interface Props {
  onNext: () => void;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function StepWelcome({ onNext }: Props) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 backdrop-blur-sm p-8 md:p-10">
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-6"
      >
        {/* Icon */}
        <motion.div variants={fadeUp}>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-3xl select-none">
            ◈
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div variants={fadeUp} className="flex flex-col gap-2">
          <p className="text-xs font-mono tracking-widest text-indigo-400 uppercase">
            Welcome to Shadecode Student
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-white leading-tight tracking-tight">
            Your personalised<br />
            <span className="text-indigo-400">adaptive learning system</span>
          </h1>
        </motion.div>

        {/* Value props */}
        <motion.div variants={fadeUp} className="flex flex-col gap-3">
          {[
            {
              icon: "🔮",
              text: "Cortex AI adapts to how you study, not how you think you should.",
            },
            {
              icon: "📐",
              text: "Built around your level, your goals, your subjects.",
            },
            {
              icon: "🎯",
              text: "Takes 60 seconds to set up. Pays off in every exam you sit.",
            },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-start gap-3 text-zinc-400 text-sm leading-relaxed"
            >
              <span className="text-base mt-0.5 shrink-0">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </motion.div>

        {/* Divider */}
        <motion.div variants={fadeUp}>
          <div className="h-px bg-zinc-800" />
        </motion.div>

        {/* CTA */}
        <motion.div variants={fadeUp}>
          <button
            onClick={onNext}
            className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Let&apos;s get started →
          </button>
          <p className="text-center text-xs text-zinc-600 mt-3">
            Takes about 60 seconds
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
