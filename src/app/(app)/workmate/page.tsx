"use client";

import { CheckCircle2, FileCheck2, Sparkles, WandSparkles } from "lucide-react";
import { ShadecodeFeatureIcon } from "@/components/brand/ShadecodeFeatureIcon";
import CortexVerifyPanel from "@/components/cortex/CortexVerifyPanel";

const modes = [
  { icon: FileCheck2, label: "Verify", description: "Check your working" },
  { icon: WandSparkles, label: "Guide", description: "Get unstuck without shortcuts" },
  { icon: Sparkles, label: "Explain", description: "Understand the difficult bit" },
];

export default function WorkmatePage() {
  return (
    <main className="ssc-page max-w-6xl">
      <header className="ssc-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
            <ShadecodeFeatureIcon feature="math-checker" size="sm" />
            <span>Math Checker</span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--primary-glow)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)]">
            <CheckCircle2 size={14} aria-hidden="true" /> Built around your working
          </span>
        </div>

        <div className="mt-4">
          <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Understand the steps, not just the answer.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
            Bring your working to Cortex. Check the reasoning, get unstuck, and see exactly what needs to change.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Math Checker modes">
          {modes.map(({ icon: Icon, label, description }, index) => (
            <span
              key={label}
              title={description}
              className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${index === 0
                ? "border-[var(--primary)]/30 bg-[var(--primary-glow)] text-[var(--primary)]"
                : "border-[var(--card-border)] bg-[var(--surface-2)] text-[var(--muted-foreground)]"}`}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
              <span className="hidden font-normal sm:inline">· {description}</span>
            </span>
          ))}
        </div>
      </header>

      <CortexVerifyPanel />
    </main>
  );
}
