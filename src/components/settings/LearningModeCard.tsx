"use client";

import { useEffect, useState } from "react";
import { BrainCircuit } from "lucide-react";
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
          <BrainCircuit size={22} aria-hidden="true" />
        </span>
        <div>
          <h2 id="learning-mode-heading" className="text-xl font-semibold">Choose your learning mode</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Choose whether new lessons can be generated with generative AI. You can switch modes at any time.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{mode === "ai" ? "Cortex AI is on" : "Classic mode is on"}</p>
          <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">
            {mode === "ai" ? "New lessons may use AI generation." : "New lessons use available saved or verified resources, without generative AI."}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          <span className={`text-sm font-semibold ${mode === "classic" ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>Classic</span>
          <button
            type="button"
            role="switch"
            aria-label="Enable Cortex AI"
            aria-checked={mode === "ai"}
            onClick={() => choose(mode === "ai" ? "classic" : "ai")}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${mode === "ai" ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--card-border)] bg-[var(--surface)]"}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${mode === "ai" ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className={`text-sm font-semibold ${mode === "ai" ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>Cortex AI</span>
        </div>
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-sm text-[var(--muted-foreground)]">
        Current choice: <strong className="text-[var(--foreground)]">{mode === "ai" ? "Cortex AI" : "Classic"}</strong>.
        {" "}This preference is stored on this device for now and currently controls lesson generation.
      </p>
    </section>
  );
}
