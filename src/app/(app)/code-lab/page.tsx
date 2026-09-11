"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Code2, Play, RotateCcw, Save, Terminal } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

const STARTER_CODE = `// Code Lab starter\n// Write a program, then run it.\n\nfunction main() {\n  const message = "Hello, Shadecode!";\n  console.log(message);\n}\n\nmain();\n`;

const OBJECTIVES = [
  { id: "sequence", title: "Sequence", text: "Write instructions that execute in the correct order." },
  { id: "selection", title: "Selection", text: "Use conditions to make decisions in a program." },
  { id: "iteration", title: "Iteration", text: "Use loops to repeat a process correctly." },
  { id: "variables", title: "Variables & data", text: "Store, update and use values with appropriate data types." },
  { id: "functions", title: "Subprograms", text: "Break a solution into reusable procedures or functions." },
  { id: "testing", title: "Testing & debugging", text: "Use test cases and error information to improve a program." },
];

function storageKey(userId?: string) {
  return `shadecode:code-lab:${userId ?? "guest"}`;
}

export default function CodeLabPage() {
  const { profile } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const [code, setCode] = useState(STARTER_CODE);
  const [saved, setSaved] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [objectiveId, setObjectiveId] = useState("sequence");

  const objective = useMemo(() => OBJECTIVES.find((item) => item.id === objectiveId) ?? OBJECTIVES[0], [objectiveId]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey(profile?.id));
      if (stored) setCode(stored);
    } catch {}
  }, [profile?.id]);

  function saveCode() {
    try { window.localStorage.setItem(storageKey(profile?.id), code); } catch {}
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function resetCode() {
    setCode(STARTER_CODE);
    setOutput([]);
    try { window.localStorage.removeItem(storageKey(profile?.id)); } catch {}
  }

  function runCode() {
    setRunning(true);
    setOutput([]);
    const lines: string[] = [];
    const originalLog = console.log;
    try {
      console.log = (...args: unknown[]) => lines.push(args.map(String).join(" "));
      // JavaScript is deliberately the first local runtime. It keeps the first Code Lab slice usable without an AI/API call.
      // eslint-disable-next-line no-new-func
      new Function(code)();
      setOutput(lines.length ? lines : ["Program finished without console output."]);
    } catch (error) {
      setOutput([`Runtime error: ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      console.log = originalLog;
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5 md:px-8 md:py-7">
      <header className="flex flex-col gap-4 rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-5 shadow-sm md:flex-row md:items-end md:justify-between md:p-7">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]"><Code2 className="h-4 w-4" /> Code Lab</div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">Learn programming by building.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">A focused coding workspace connected to your academic level. Start with the objective, write the solution, run it and learn from what actually happens.</p>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] px-4 py-3 text-sm"><span className="block text-xs text-[var(--muted-foreground)]">Current learning context</span><strong className="text-[var(--foreground)]">{experience.label}</strong></div>
      </header>

      <section className="mt-5 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-[var(--primary)]" /><h2 className="text-sm font-bold text-[var(--foreground)]">Programming objectives</h2></div>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Choose what you are practising. These are the foundation layer for syllabus mapping, not a replacement for your exam board.</p>
          <div className="mt-4 space-y-2">
            {OBJECTIVES.map((item) => <button key={item.id} type="button" onClick={() => setObjectiveId(item.id)} className={`w-full rounded-xl border p-3 text-left transition ${objectiveId === item.id ? "border-[var(--primary)]/40 bg-[var(--primary-glow)]" : "border-[var(--card-border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"}`}><span className="text-sm font-semibold text-[var(--foreground)]">{item.title}</span><span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">{item.text}</span></button>)}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Objective</p><h2 className="text-sm font-bold text-[var(--foreground)]">{objective.title}</h2></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={resetCode} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 text-xs font-semibold text-[var(--muted-foreground)]"><RotateCcw className="h-3.5 w-3.5" /> Reset</button><button type="button" onClick={saveCode} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 text-xs font-semibold text-[var(--foreground)]"><Save className="h-3.5 w-3.5" /> {saved ? "Saved" : "Save"}</button><button type="button" disabled={running} onClick={runCode} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-[var(--primary-foreground)] disabled:opacity-60"><Play className="h-3.5 w-3.5" /> {running ? "Running..." : "Run"}</button></div>
          </div>
          <div className="grid min-h-[560px] lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 bg-[#111318] p-3"><label htmlFor="code-editor" className="sr-only">Code editor</label><textarea id="code-editor" value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} className="h-[520px] w-full resize-none border-0 bg-transparent p-3 font-mono text-[13px] leading-6 text-white outline-none" aria-label="Code editor" /></div>
            <div className="border-t border-[var(--card-border)] bg-[var(--surface-2)] p-4 lg:border-l lg:border-t-0"><div className="flex items-center gap-2"><Terminal className="h-4 w-4 text-[var(--primary)]" /><h2 className="text-sm font-bold text-[var(--foreground)]">Output</h2></div><div className="mt-3 min-h-40 overflow-auto rounded-xl border border-[var(--card-border)] bg-[#111318] p-3 font-mono text-xs leading-5 text-white">{output.length ? output.map((line, index) => <div key={`${index}-${line}`}>{line}</div>) : <span className="text-white/50">Run your program to see output.</span>}</div><div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3"><p className="text-xs font-semibold text-[var(--foreground)]">Runtime</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">JavaScript runs locally in this first Code Lab slice. No AI request is made just to execute code.</p></div><div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" /><p className="text-xs leading-5 text-[var(--muted-foreground)]">Next curriculum layers can map these objectives to the learner's exact exam board and syllabus.</p></div></div>
          </div>
        </section>
      </section>
    </main>
  );
}
