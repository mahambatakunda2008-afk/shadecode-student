"use client";

import { Sparkles } from "lucide-react";
import CortexVerifyPanel from "@/components/cortex/CortexVerifyPanel";

export default function WorkmatePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-5 sm:p-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">CORTEX WORKBENCH</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Workmate</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">Bring any schoolwork here. Workmate can check your work, identify mistakes, explain difficult steps, and provide guided help across subjects.</p>
      </header>
      <div className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary-glow)]/30 p-5">
        <Sparkles className="mb-3 text-[var(--primary)]" size={22} />
        <h2 className="font-bold">Check, solve, explain, or learn</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Cortex Verify is the checking and guided-help engine underneath Workmate. Subject-specific capabilities can plug into this shared workspace without creating separate student-facing tools.</p>
      </div>
      <CortexVerifyPanel />
    </div>
  );
}
