"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, GraduationCap, Target } from "lucide-react";

const CONTEXT_KEY = "shadecode:learn:context:v1";

type LearnContext = {
  level: string;
  examBoard: string;
  goal: string;
};

const LEVELS = [
  "Primary school",
  "Secondary school",
  "IGCSE",
  "AS Level",
  "A Level",
  "University",
  "Polytechnic",
];

const BOARDS = [
  "General / no specific curriculum",
  "Cambridge",
  "ZIMSEC",
  "Other / school-specific",
];

const GOALS = [
  "Understand the concept",
  "Fix a weak area",
  "Prepare for an exam",
  "Practice exam questions",
  "Review quickly",
  "Deep mastery",
];

const DEFAULT_CONTEXT: LearnContext = {
  level: "",
  examBoard: "",
  goal: "Understand the concept",
};

function readContext(): LearnContext {
  try {
    const raw = localStorage.getItem(CONTEXT_KEY);
    if (!raw) return DEFAULT_CONTEXT;
    const saved = JSON.parse(raw) as Partial<LearnContext>;
    return {
      level: typeof saved.level === "string" ? saved.level : "",
      examBoard: typeof saved.examBoard === "string" ? saved.examBoard : "",
      goal: typeof saved.goal === "string" && GOALS.includes(saved.goal) ? saved.goal : DEFAULT_CONTEXT.goal,
    };
  } catch {
    return DEFAULT_CONTEXT;
  }
}

export function getSavedLearnContext(): LearnContext {
  if (typeof window === "undefined") return DEFAULT_CONTEXT;
  return readContext();
}

export default function LearnContextPanel() {
  const [context, setContext] = useState<LearnContext>(DEFAULT_CONTEXT);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setContext(readContext());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
    } catch {}
  }, [context]);

  const update = (key: keyof LearnContext, value: string) => {
    setContext(current => ({ ...current, [key]: value }));
  };

  return (
    <section className="border-b border-[var(--card-border)] bg-[var(--card)]" aria-label="Learning context">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          className="flex min-h-10 w-full items-center justify-between gap-3 text-left"
          aria-expanded={open}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--primary-glow)] text-[var(--primary)]">
              <GraduationCap className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">Learning context</span>
              <span className="block truncate text-xs text-[var(--muted-foreground)]">
                {context.level || "Choose your level"} · {context.examBoard || "Choose your curriculum"} · {context.goal}
              </span>
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="mt-3 grid gap-3 pb-1 md:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Education level</span>
              <span className="relative block">
                <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <select value={context.level} onChange={e => update("level", e.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-[var(--card-border)] bg-[var(--surface)] pl-9 pr-3 text-sm font-medium outline-none focus:border-[var(--primary)]">
                  <option value="">Choose level</option>
                  {LEVELS.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Curriculum / exam board</span>
              <span className="relative block">
                <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <select value={context.examBoard} onChange={e => update("examBoard", e.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-[var(--card-border)] bg-[var(--surface)] pl-9 pr-3 text-sm font-medium outline-none focus:border-[var(--primary)]">
                  <option value="">Choose curriculum</option>
                  {BOARDS.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Learning goal</span>
              <span className="relative block">
                <Target className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <select value={context.goal} onChange={e => update("goal", e.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-[var(--card-border)] bg-[var(--surface)] pl-9 pr-3 text-sm font-medium outline-none focus:border-[var(--primary)]">
                  {GOALS.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </span>
            </label>
          </div>
        )}
      </div>
    </section>
  );
}
