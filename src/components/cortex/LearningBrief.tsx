"use client";

import { useMemo } from "react";
import { BookOpen, Brain, GraduationCap, Target } from "lucide-react";
import { resolveLearningIntent, buildIntentInstruction } from "@/lib/cortex/learningIntent";

type Mode = "guided" | "standard" | "challenge";

const LEVELS = [
  ["", "Choose education level"],
  ["Primary", "Primary school"],
  ["Secondary", "Secondary school"],
  ["IGCSE", "Cambridge IGCSE"],
  ["AS Level", "Cambridge AS Level"],
  ["A Level", "Cambridge A Level"],
  ["University", "University"],
  ["Polytechnic", "Polytechnic"],
] as const;

const BOARDS: Record<string, string[]> = {
  "": ["General / no exam board"],
  Primary: ["General / no exam board", "ZIMSEC"],
  Secondary: ["General / no exam board", "ZIMSEC"],
  IGCSE: ["Cambridge IGCSE", "ZIMSEC / equivalent", "General / no exam board"],
  "AS Level": ["Cambridge International", "ZIMSEC / equivalent", "General / no exam board"],
  "A Level": ["Cambridge International", "ZIMSEC / equivalent", "General / no exam board"],
  University: ["University / course-specific", "General / no exam board"],
  Polytechnic: ["Polytechnic / course-specific", "General / no exam board"],
};

const GOALS = [
  ["", "Choose a goal"],
  ["Understand it", "Build a clear understanding"],
  ["Fix a weak area", "Target misconceptions and gaps"],
  ["Prepare for an exam", "Focus on exam-ready understanding"],
  ["Practice questions", "Learn through progressively harder questions"],
  ["Review quickly", "Compress the essentials"],
  ["Deep mastery", "Go beyond recall into rigorous reasoning"],
] as const;

interface LearningBriefProps {
  subject: string;
  onSubjectChange: (value: string) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  level: string;
  onLevelChange: (value: string) => void;
  examBoard: string;
  onExamBoardChange: (value: string) => void;
  goal: string;
  onGoalChange: (value: string) => void;
  mode: Mode;
  onModeChange: (value: Mode) => void;
  subjects: Array<{ id: string; name: string }>;
  examples: string[];
  disabled?: boolean;
  onSubmit: () => void;
}

export default function LearningBrief({
  subject, onSubjectChange, prompt, onPromptChange, level, onLevelChange,
  examBoard, onExamBoardChange, goal, onGoalChange, mode, onModeChange,
  subjects, examples, disabled, onSubmit,
}: LearningBriefProps) {
  const intent = useMemo(() => resolveLearningIntent(prompt, goal), [prompt, goal]);
  const intentLabel = intent.intent === "exam-prep" ? "Exam preparation" : intent.intent === "guided-solve" ? "Guided problem solving" : intent.intent === "from-scratch" ? "From the foundations" : intent.intent === "deep-dive" ? "Deep dive" : intent.intent === "remediate" ? "Fixing a weak area" : intent.intent === "practice" ? "Active practice" : intent.intent === "review" ? "High-yield review" : "Direct learning";
  const boardOptions = BOARDS[level] ?? BOARDS[""];
  const tooShort = prompt.trim().length > 0 && prompt.trim().length < 4;
  const canGenerate = Boolean(subject && prompt.trim().length >= 4) && !disabled;

  return (
    <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Brain className="h-5 w-5" /></div>
          <div>
            <h2 className="text-xl font-bold">Build your learning brief</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--muted-foreground)]">Give Cortex the exact thing you want. The context changes how it teaches, not what you asked for.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 lg:min-w-[260px]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--primary)]"><Target className="h-3.5 w-3.5" /> Cortex will teach this as</div>
          <p className="mt-1 text-sm font-bold">{intentLabel}</p>
          <p className="mt-1 text-xs leading-4 text-[var(--muted-foreground)]">{buildIntentInstruction(intent).split(".")[0]}.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block"><span className="mb-2 block text-sm font-semibold">Subject</span><select value={subject} onChange={e => onSubjectChange(e.target.value)} disabled={disabled} className="min-h-12 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-[15px] outline-none focus:border-[var(--primary)]"><option value="">Choose a subject</option>{subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></label>
        <label className="block"><span className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><GraduationCap className="h-4 w-4 text-[var(--primary)]" /> Education level</span><select value={level} onChange={e => onLevelChange(e.target.value)} disabled={disabled} className="min-h-12 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-[15px] outline-none focus:border-[var(--primary)]">{LEVELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Curriculum / exam board</span><select value={examBoard} onChange={e => onExamBoardChange(e.target.value)} disabled={disabled} className="min-h-12 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-[15px] outline-none focus:border-[var(--primary)]">{boardOptions.map(board => <option key={board} value={board}>{board}</option>)}</select></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Learning goal</span><select value={goal} onChange={e => onGoalChange(e.target.value)} disabled={disabled} className="min-h-12 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-[15px] outline-none focus:border-[var(--primary)]">{GOALS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-semibold">What do you actually want Cortex to teach?</label>
        <textarea value={prompt} onChange={e => onPromptChange(e.target.value)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canGenerate) onSubmit(); }} disabled={disabled} rows={5} maxLength={500} placeholder="Example: Explain moments from first principles, then show me how to use the principle of moments in an exam question." className="w-full resize-y rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 text-[15px] leading-6 outline-none focus:border-[var(--primary)] disabled:opacity-60" aria-describedby="learning-prompt-help" />
        <div id="learning-prompt-help" className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]"><span>Be specific. You can ask for an explanation, questions, a walkthrough, revision, or deeper reasoning.</span><span className="tabular-nums">{prompt.length}/500</span></div>
        {tooShort && <p className="mt-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-medium text-[var(--muted-foreground)]">Give Cortex a little more to work with. Try “Explain Pythagoras” instead of a one-letter shorthand.</p>}
      </div>

      <div className="mt-5"><p className="mb-2 text-sm font-semibold">How should it teach?</p><div className="grid gap-2 sm:grid-cols-3">{([['guided','Guided','First principles, small steps, checks'],['standard','Standard','Clear explanation + application'],['challenge','Challenge','Harder reasoning, traps + exam pressure']] as const).map(([value,label,description]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => onModeChange(value)} disabled={disabled} className={`rounded-xl border p-3 text-left transition ${mode === value ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)] bg-[var(--surface)]"} disabled:opacity-60`}><span className="text-sm font-bold">{label}</span><span className="mt-1 block text-sm leading-5 text-[var(--muted-foreground)]">{description}</span></button>)}</div></div>

      <div className="mt-5"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4 text-[var(--primary)]" /> Start from an example</div><div className="flex flex-wrap gap-2">{examples.map(example => <button key={example} type="button" onClick={() => onPromptChange(example)} disabled={disabled} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium transition hover:border-[var(--primary)] hover:bg-[var(--primary-glow)] disabled:opacity-60">{example}</button>)}</div></div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm leading-5 text-[var(--muted-foreground)]">{subject || "Choose a subject"} {level && `· ${level}`} {examBoard && `· ${examBoard}`} {goal && `· ${goal}`}</p><button type="button" onClick={onSubmit} disabled={!canGenerate} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-[15px] font-bold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50">Generate this lesson</button></div>
    </section>
  );
}
