"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Code2,
  Play,
  RotateCcw,
  Save,
  Terminal,
  TestTube2,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

const STARTER_CODE = `// Code Lab starter
// Write a program, then run it.

function main() {
  const message = "Hello, Shadecode!";
  console.log(message);
}

main();
`;

type Objective = {
  id: string;
  title: string;
  description: string;
  skill: string;
  test: (code: string, output: string[]) => { passed: boolean; message: string };
};

const FOUNDATION_OBJECTIVES: Objective[] = [
  {
    id: "sequence",
    title: "Sequence",
    description: "Write instructions that execute in the correct order.",
    skill: "Program flow",
    test: (code, output) => ({
      passed: code.includes("console.log") && output.length > 0,
      message: code.includes("console.log") ? "Your program has an observable sequence." : "Add at least one output statement so the sequence can be checked.",
    }),
  },
  {
    id: "selection",
    title: "Selection",
    description: "Use conditions to make decisions in a program.",
    skill: "if / else",
    test: (code) => ({
      passed: /\bif\s*\(/.test(code),
      message: /\bif\s*\(/.test(code) ? "A conditional structure is present." : "Try an if statement and make the program choose between outcomes.",
    }),
  },
  {
    id: "iteration",
    title: "Iteration",
    description: "Use loops to repeat a process correctly.",
    skill: "for / while",
    test: (code) => ({
      passed: /\b(for|while)\s*\(/.test(code),
      message: /\b(for|while)\s*\(/.test(code) ? "A loop is present." : "Try a for or while loop and repeat a task deliberately.",
    }),
  },
  {
    id: "variables",
    title: "Variables & data",
    description: "Store, update and use values with appropriate data types.",
    skill: "Variables",
    test: (code) => ({
      passed: /\b(const|let|var)\s+[A-Za-z_$][\w$]*/.test(code),
      message: /\b(const|let|var)\s+[A-Za-z_$][\w$]*/.test(code) ? "Your code declares a variable." : "Declare a value with const or let, then use it.",
    }),
  },
  {
    id: "functions",
    title: "Subprograms",
    description: "Break a solution into reusable procedures or functions.",
    skill: "Functions",
    test: (code) => ({
      passed: /function\s+[A-Za-z_$][\w$]*\s*\(/.test(code),
      message: /function\s+[A-Za-z_$][\w$]*\s*\(/.test(code) ? "A named function is present." : "Create a named function and call it from your program.",
    }),
  },
  {
    id: "testing",
    title: "Testing & debugging",
    description: "Use test cases and error information to improve a program.",
    skill: "Debugging",
    test: (code, output) => ({
      passed: output.length > 0 && !/console\.error/.test(code),
      message: output.length > 0 ? "The program produced output you can inspect." : "Run the program first, then inspect its output and errors.",
    }),
  },
];

const ZIMSEC_O_LEVEL_CS_OBJECTIVES = [
  "Problem solving and algorithm design",
  "Pseudocode and flowcharts",
  "Variables, constants and data types",
  "Selection",
  "Iteration",
  "Arrays and data structures",
  "Subprograms",
  "Testing and debugging",
  "File handling and data processing",
  "Programming project / practical application",
];

const CAMBRIDGE_9618_OBJECTIVES = [
  "Algorithm design and problem solving",
  "Data types and data structures",
  "Programming constructs",
  "Procedures and functions",
  "Validation and verification",
  "Testing and debugging",
  "File and data handling",
  "Abstract data structures",
  "Object-oriented concepts",
  "Computational thinking",
];

function storageKey(userId?: string) {
  return `shadecode:code-lab:${userId ?? "guest"}`;
}

function getCurriculumContext(profile: Record<string, unknown> | null | undefined) {
  const board = String(profile?.curriculum_board ?? profile?.curriculumBoard ?? "").trim();
  const qualification = String(profile?.curriculum_qualification ?? profile?.curriculumQualification ?? "").trim();
  const syllabus = String(profile?.syllabus_code ?? profile?.syllabusCode ?? "").trim();
  const subject = String(profile?.curriculum_subject ?? profile?.subject ?? "").trim();
  const normalized = `${board} ${qualification} ${syllabus} ${subject}`.toLowerCase();
  const isZimsec = normalized.includes("zimsec");
  const isCambridge = normalized.includes("cambridge") || normalized.includes("9618");
  const isComputerScience = normalized.includes("computer") || normalized.includes("computing") || normalized.includes("9618") || normalized.includes("computing");
  const syllabusObjectives = isComputerScience && isZimsec
    ? ZIMSEC_O_LEVEL_CS_OBJECTIVES
    : isComputerScience && isCambridge
      ? CAMBRIDGE_9618_OBJECTIVES
      : [];

  return {
    board: board || "Not set",
    qualification: qualification || "Not set",
    syllabus: syllabus || "Not set",
    subject: subject || "Computer Science",
    syllabusObjectives,
    configured: Boolean(board || qualification || syllabus),
  };
}

export default function CodeLabPage() {
  const { profile } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const curriculum = useMemo(() => getCurriculumContext(profile as unknown as Record<string, unknown> | null), [profile]);
  const [code, setCode] = useState(STARTER_CODE);
  const [saved, setSaved] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [tested, setTested] = useState(false);
  const [objectiveId, setObjectiveId] = useState("sequence");

  const objective = useMemo(
    () => FOUNDATION_OBJECTIVES.find((item) => item.id === objectiveId) ?? FOUNDATION_OBJECTIVES[0],
    [objectiveId],
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey(profile?.id));
      if (stored) setCode(stored);
    } catch {
      // Local persistence is optional.
    }
  }, [profile?.id]);

  function saveCode() {
    try {
      window.localStorage.setItem(storageKey(profile?.id), code);
    } catch {
      // Local persistence is optional.
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function resetCode() {
    setCode(STARTER_CODE);
    setOutput([]);
    setTested(false);
    try {
      window.localStorage.removeItem(storageKey(profile?.id));
    } catch {
      // Local persistence is optional.
    }
  }

  function runCode() {
    setRunning(true);
    setOutput([]);
    setTested(false);
    const lines: string[] = [];
    const originalLog = console.log;
    try {
      console.log = (...args: unknown[]) => lines.push(args.map(String).join(" "));
      // JavaScript is the first local runtime. Execution itself does not call AI or an external API.
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

  function testObjective() {
    const result = objective.test(code, output);
    setTested(true);
    setOutput((current) => [...current, `Objective check: ${result.message}`]);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5 md:px-8 md:py-7">
      <header className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
              <Code2 className="h-4 w-4" /> Code Lab
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">Learn programming by building.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              Start from the learning objective, write the solution, run it, test it and improve it. AI is not required just to execute or assess the basic task.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
            <span className="block text-xs text-[var(--muted-foreground)]">Learning context</span>
            <strong className="text-[var(--foreground)]">{experience.label}</strong>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Board", curriculum.board],
            ["Qualification", curriculum.qualification],
            ["Syllabus", curriculum.syllabus],
            ["Subject", curriculum.subject],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</span>
              <span className="mt-1 block truncate text-sm font-semibold text-[var(--foreground)]">{value}</span>
            </div>
          ))}
        </div>

        {!curriculum.configured && (
          <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
            Your curriculum identity is not fully configured yet. The workspace uses general programming objectives for now. Once a board, qualification and syllabus are available on the learner profile, Code Lab can map practice to that curriculum instead of guessing.
          </div>
        )}
      </header>

      <section className="mt-5 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-sm font-bold text-[var(--foreground)]">Objectives</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
            Practice is objective-first. The generic list is only a fallback until the exact syllabus is configured.
          </p>

          {curriculum.syllabusObjectives.length > 0 && (
            <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Syllabus map detected</p>
              <p className="mt-1 text-xs leading-5 text-[var(--foreground)]">{curriculum.syllabusObjectives.length} curriculum objectives available for this context.</p>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {FOUNDATION_OBJECTIVES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setObjectiveId(item.id); setTested(false); }}
                className={`w-full rounded-xl border p-3 text-left transition ${objectiveId === item.id ? "border-[var(--primary)]/40 bg-[var(--primary-glow)]" : "border-[var(--card-border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">{item.title}</span>
                  {objectiveId === item.id && <ChevronRight className="h-4 w-4 text-[var(--primary)]" />}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">{item.description}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Current objective</p>
              <h2 className="text-sm font-bold text-[var(--foreground)]">{objective.title}</h2>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Skill: {objective.skill}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={resetCode} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 text-xs font-semibold text-[var(--muted-foreground)]">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
              <button type="button" onClick={saveCode} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 text-xs font-semibold text-[var(--foreground)]">
                <Save className="h-3.5 w-3.5" /> {saved ? "Saved" : "Save"}
              </button>
              <button type="button" onClick={testObjective} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 text-xs font-semibold text-[var(--foreground)]">
                <TestTube2 className="h-3.5 w-3.5" /> Test objective
              </button>
              <button type="button" disabled={running} onClick={runCode} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-[var(--primary-foreground)] disabled:opacity-60">
                <Play className="h-3.5 w-3.5" /> {running ? "Running..." : "Run"}
              </button>
            </div>
          </div>

          <div className="grid min-h-[560px] lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 bg-[#111318] p-3">
              <label htmlFor="code-editor" className="sr-only">Code editor</label>
              <textarea
                id="code-editor"
                value={code}
                onChange={(event) => { setCode(event.target.value); setTested(false); }}
                spellCheck={false}
                className="h-[520px] w-full resize-none border-0 bg-transparent p-3 font-mono text-[13px] leading-6 text-white outline-none"
                aria-label="Code editor"
              />
            </div>

            <div className="border-t border-[var(--card-border)] bg-[var(--surface-2)] p-4 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[var(--primary)]" />
                <h2 className="text-sm font-bold text-[var(--foreground)]">Output</h2>
              </div>
              <div className="mt-3 min-h-40 overflow-auto rounded-xl border border-[var(--card-border)] bg-[#111318] p-3 font-mono text-xs leading-5 text-white">
                {output.length ? output.map((line, index) => <div key={`${index}-${line}`}>{line}</div>) : <span className="text-white/50">Run your program to see output.</span>}
              </div>

              <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3">
                <p className="text-xs font-semibold text-[var(--foreground)]">Objective check</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                  {tested ? "Checked using local deterministic rules. This is a lightweight practice check, not an exam mark." : "Run your code, then test whether it demonstrates the selected objective."}
                </p>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                  Execution and basic checks stay local. Curriculum-aware marking can be added as a separate layer without making AI a requirement for Code Lab.
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
