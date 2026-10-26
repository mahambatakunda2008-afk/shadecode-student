"use client";

import { useEffect, useState } from "react";
import { BookOpen, BrainCircuit, Check, Sparkles } from "lucide-react";
import { getLearningMode, setLearningMode, type LearningMode } from "@/lib/learningMode";

export function LearningModeCard() {
  const [mode, setMode] = useState<LearningMode>("classic");

  useEffect(() => {
    setMode(getLearningMode());
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<LearningMode>).detail;
      setMode(detail === "ai" ? "ai" : getLearningMode());
    };
    window.addEventListener("shadecode:learning-mode-change", sync);
    return () => window.removeEventListener("shadecode:learning-mode-change", sync);
  }, []);

  const choose = (next: LearningMode) => {
    setLearningMode(next);
    setMode(next);
  };

  return (
    <section className="ssc-card p-5 sm:p-6" aria-labelledby="learning-mode-heading">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]">
          <BrainCircuit size={21} aria-hidden="true" />
        </span>
        <div>
          <h2 id="learning-mode-heading" className="text-xl font-semibold">Choose your learning mode</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            You decide whether Shadecode uses generative AI. You can switch modes at any time.
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <button type="button" aria-pressed={mode === "classic"} onClick={() => choose("classic")}
          className="ssc-card-interactive flex min-h-36 flex-col items-start gap-3 p-4 text-left"
          style={{ borderColor: mode === "classic" ? "var(--primary)" : "var(--card-border)" }}>
          <span className="flex w-full items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold"><BookOpen size={19} aria-hidden="true" /> Classic</span>
            {mode === "classic" && <Check size={18} aria-hidden="true" className="text-[var(--primary)]" />}
          </span>
          <span className="text-sm leading-5 text-[var(--muted-foreground)]">
            Traditional study tools, saved lessons, curriculum resources, practice and past papers. No generative AI for lesson creation.
          </span>
          <span className="mt-auto rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold">AI generation off</span>
        </button>
        <button type="button" aria-pressed={mode === "ai"} onClick={() => choose("ai")}
          className="ssc-card-interactive flex min-h-36 flex-col items-start gap-3 p-4 text-left"
          style={{ borderColor: mode === "ai" ? "var(--primary)" : "var(--card-border)" }}>
          <span className="flex w-full items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold"><Sparkles size={19} aria-hidden="true" /> Cortex AI</span>
            {mode === "ai" && <Check size={18} aria-hidden="true" className="text-[var(--primary)]" />}
          </span>
          <span className="text-sm leading-5 text-[var(--muted-foreground)]">
            Opt in to AI-assisted lesson generation and adaptive explanations, with verified and saved resources still available.
          </span>
          <span className="mt-auto rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold">AI generation on</span>
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-sm text-[var(--muted-foreground)]">
        Current choice: <strong className="text-[var(--foreground)]">{mode === "ai" ? "Cortex AI" : "Classic"}</strong>.
        {" "}This preference is stored on this device for now.
      </p>
    </section>
  );
}
