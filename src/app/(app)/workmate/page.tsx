"use client";

import { ArrowUpRight, CheckCircle2, FileCheck2, Sparkles, WandSparkles } from "lucide-react";
import CortexVerifyPanel from "@/components/cortex/CortexVerifyPanel";

const modes = [
  { icon: FileCheck2, label: "Verify", description: "Check your working" },
  { icon: WandSparkles, label: "Guide", description: "Get unstuck without shortcuts" },
  { icon: Sparkles, label: "Explain", description: "Understand the difficult bit" },
];

export default function WorkmatePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 pb-24 sm:p-7 sm:pb-28">
      <header className="relative overflow-hidden rounded-[2rem] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-28 -top-32 h-72 w-72 rounded-full bg-[var(--primary-glow)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 left-1/3 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--primary)] shadow-sm">
            <Sparkles size={13} /> Cortex Workbench
          </div>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">Workmate.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
                One workspace for bringing schoolwork to Cortex. Verify your reasoning, get unstuck, and understand what needs to change.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-300 lg:self-auto">
              <CheckCircle2 size={14} /> Built around your working
            </div>
          </div>
          <div className="mt-7 grid gap-2 sm:grid-cols-3">
            {modes.map(({ icon: Icon, label, description }, index) => (
              <div key={label} className={`rounded-2xl border p-4 ${index === 0 ? "border-[var(--primary)]/25 bg-[var(--primary-glow)]/30" : "border-[var(--card-border)] bg-[var(--surface)]"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><Icon size={16} /></span>
                    <span className="text-sm font-bold">{label}</span>
                  </div>
                  {index === 0 && <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">Active</span>}
                </div>
                <p className="mt-2 pl-10 text-xs text-[var(--muted-foreground)]">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" /> Subject-aware</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[var(--primary)]" /> Working-first</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-violet-500" /> Cortex-powered</span>
            <span className="ml-auto hidden items-center gap-1 font-semibold sm:inline-flex">Learn from the feedback <ArrowUpRight size={13} /></span>
          </div>
        </div>
      </header>

      <CortexVerifyPanel />
    </main>
  );
}
