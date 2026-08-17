"use client";

import Link from "next/link";
import { Calculator, Sparkles } from "lucide-react";
import CortexVerifyPanel from "@/components/cortex/CortexVerifyPanel";

export default function MathCortexPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-5 sm:p-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">CORTEX WORKBENCH</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Math + Cortex</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">One place to check mathematical working, understand mistakes, and get guided help from Cortex.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/math-checker" className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 transition hover:border-[var(--primary)] hover:bg-[var(--surface-2)]">
          <Calculator className="mb-3 text-[var(--primary)]" size={22} />
          <h2 className="font-bold">Math Checker</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Upload handwritten working and get step-by-step analysis.</p>
          <span className="mt-3 inline-block text-xs font-bold text-[var(--primary)]">Open Math Checker →</span>
        </Link>
        <div className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary-glow)]/30 p-5">
          <Sparkles className="mb-3 text-[var(--primary)]" size={22} />
          <h2 className="font-bold">Cortex Verify</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Check your work or ask Cortex for a hint, method, or full solution.</p>
        </div>
      </div>

      <CortexVerifyPanel />
    </div>
  );
}
