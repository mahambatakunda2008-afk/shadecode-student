"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, Target } from "lucide-react";

const CONTEXT_KEY = "shadecode:learn:context:v1";

const LEVELS = [
  ["Primary", "Primary school"],
  ["Secondary", "Secondary school"],
  ["IGCSE", "Cambridge IGCSE"],
  ["AS Level", "Cambridge AS Level"],
  ["A Level", "Cambridge A Level"],
  ["University", "University"],
  ["Polytechnic", "Polytechnic"],
] as const;

const BOARDS: Record<string, string[]> = {
  Primary: ["General / no exam board", "ZIMSEC"],
  Secondary: ["General / no exam board", "ZIMSEC"],
  IGCSE: ["Cambridge IGCSE", "ZIMSEC / equivalent", "General / no exam board"],
  "AS Level": ["Cambridge International", "ZIMSEC / equivalent", "General / no exam board"],
  "A Level": ["Cambridge International", "ZIMSEC / equivalent", "General / no exam board"],
  University: ["University / course-specific", "General / no exam board"],
  Polytechnic: ["Polytechnic / course-specific", "General / no exam board"],
};

const GOALS = [
  ["Understand it", "Build a clear understanding from first principles"],
  ["Fix a weak area", "Target misconceptions and gaps"],
  ["Prepare for an exam", "Focus on exam-ready understanding and application"],
  ["Practice questions", "Learn through worked and progressively harder questions"],
  ["Review quickly", "Compress the essentials without skipping the logic"],
  ["Deep mastery", "Go beyond recall into rigorous reasoning and connections"],
] as const;

type Context = { level: string; examBoard: string; goal: string };

const DEFAULT_CONTEXT: Context = { level: "AS Level", examBoard: "Cambridge International", goal: "Understand it" };

export default function CortexLearningContext() {
  const [context, setContext] = useState<Context>(DEFAULT_CONTEXT);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONTEXT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<Context>;
      setContext({
        level: typeof saved.level === "string" && saved.level ? saved.level : DEFAULT_CONTEXT.level,
        examBoard: typeof saved.examBoard === "string" && saved.examBoard ? saved.examBoard : DEFAULT_CONTEXT.examBoard,
        goal: typeof saved.goal === "string" && saved.goal ? saved.goal : DEFAULT_CONTEXT.goal,
      });
    } catch {}
  }, []);

  const boardOptions = useMemo(() => BOARDS[context.level] ?? ["General / no exam board"], [context.level]);

  function update(patch: Partial<Context>) {
    const next = { ...context, ...patch };
    if (patch.level && !boardOptions.includes(next.examBoard)) next.examBoard = BOARDS[patch.level]?.[0] ?? "General / no exam board";
    setContext(next);
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("shadecode:learn:context-changed"));
  }

  if (typeof window === "undefined" || window.location.pathname !== "/learn") return null;

  return (
    <aside className="fixed bottom-5 left-4 z-[9998] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-[var(--card-border)] bg-[var(--card)]/95 p-4 shadow-xl backdrop-blur" aria-label="Cortex learning context">
      <button type="button" onClick={() => setOpen(value => !value)} className="flex w-full items-center gap-3 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><GraduationCap className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Learning context</span>
          <span className="mt-0.5 block truncate text-xs text-[var(--muted-foreground)]">{LEVELS.find(([value]) => value === context.level)?.[1] ?? context.level} · {context.examBoard} · {context.goal}</span>
        </span>
        <span className="text-xs font-semibold text-[var(--primary)]">{open ? "Hide" : "Edit"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-[var(--card-border)] pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Education level</span><select value={context.level} onChange={e => update({ level: e.target.value })} className="min-h-10 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)]">{LEVELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]"><BookOpen className="mr-1 inline h-3.5 w-3.5" />Curriculum / board</span><select value={context.examBoard} onChange={e => update({ examBoard: e.target.value })} className="min-h-10 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)]">{boardOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label>
          </div>
          <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]"><Target className="mr-1 inline h-3.5 w-3.5" />Learning goal</span><select value={context.goal} onChange={e => update({ goal: e.target.value })} className="min-h-10 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)]">{GOALS.map(([value, label]) => <option key={value} value={value}>{value} · {label}</option>)}</select></label>
          <p className="text-xs leading-5 text-[var(--muted-foreground)]">Cortex uses this context with your exact request. It never replaces what you typed.</p>
        </div>
      )}
    </aside>
  );
}
