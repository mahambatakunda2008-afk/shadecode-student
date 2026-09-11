"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
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

type CurriculumObjective = {
  id: string;
  objective_key: string;
  parent_key: string | null;
  topic: string | null;
  title: string;
  description: string | null;
  education_level: string | null;
  paper_component: string | null;
  status: "draft" | "verified" | "archived";
};

type CodeObjective = CurriculumObjective & {
  skill: string;
  test: (code: string, output: string[]) => { passed: boolean; message: string };
};

const FOUNDATION_OBJECTIVES: CodeObjective[] = [
  {
    id: "foundation-sequence",
    objective_key: "foundation.sequence",
    parent_key: null,
    topic: "Program flow",
    title: "Sequence",
    description: "Write instructions that execute in the correct order.",
    education_level: null,
    paper_component: null,
    status: "draft",
    skill: "Program flow",
    test: (code, output) => ({
      passed: code.includes("console.log") && output.length > 0,
      message: code.includes("console.log") ? "Your program has an observable sequence." : "Add at least one output statement so the sequence can be checked.",
    }),
  },
  {
    id: "foundation-selection",
    objective_key: "foundation.selection",
    parent_key: null,
    topic: "Selection",
    title: "Selection",
    description: "Use conditions to make decisions in a program.",
    education_level: null,
    paper_component: null,
    status: "draft",
    skill: "if / else",
    test: (code) => ({
      passed: /\bif\s*\(/.test(code),
      message: /\bif\s*\(/.test(code) ? "A conditional structure is present." : "Try an if statement and make the program choose between outcomes.",
    }),
  },
  {
    id: "foundation-iteration",
    objective_key: "foundation.iteration",
    parent_key: null,
    topic: "Iteration",
    title: "Iteration",
    description: "Use loops to repeat a process correctly.",
    education_level: null,
    paper_component: null,
    status: "draft",
    skill: "for / while",
    test: (code) => ({
      passed: /\b(for|while)\s*\(/.test(code),
      message: /\b(for|while)\s*\(/.test(code) ? "A loop is present." : "Try a for or while loop and repeat a task deliberately.",
    }),
  },
  {
    id: "foundation-variables",
    objective_key: "foundation.variables",
    parent_key: null,
    topic: "Variables",
    title: "Variables and data",
    description: "Store, update and use values with appropriate data types.",
    education_level: null,
    paper_component: null,
    status: "draft",
    skill: "Variables",
    test: (code) => ({
      passed: /\b(const|let|var)\s+[A-Za-z_$][\w$]*/.test(code),
      message: /\b(const|let|var)\s+[A-Za-z_$][\w$]*/.test(code) ? "Your code declares a variable." : "Declare a value with const or let, then use it.",
    }),
  },
  {
    id: "foundation-functions",
    objective_key: "foundation.functions",
    parent_key: null,
    topic: "Subprograms",
    title: "Functions and subprograms",
    description: "Break a solution into reusable procedures or functions.",
    education_level: null,
    paper_component: null,
    status: "draft",
    skill: "Functions",
    test: (code) => ({
      passed: /function\s+[A-Za-z_$][\w$]*\s*\(/.test(code),
      message: /function\s+[A-Za-z_$][\w$]*\s*\(/.test(code) ? "A named function is present." : "Create a named function and call it from your program.",
    }),
  },
  {
    id: "foundation-testing",
    objective_key: "foundation.testing",
    parent_key: null,
    topic: "Testing and debugging",
    title: "Testing and debugging",
    description: "Use test cases and error information to improve a program.",
    education_level: null,
    paper_component: null,
    status: "draft",
    skill: "Debugging",
    test: (code, output) => ({
      passed: output.length > 0 && !/console\.error/.test(code),
      message: output.length > 0 ? "The program produced output you can inspect." : "Run the program first, then inspect its output and errors.",
    }),
  },
];

function storageKey(userId?: string) {
  return `shadecode:code-lab:${userId ?? "guest"}`;
}

function normalizeIdentity(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const boardId = String(item.boardId ?? "").trim();
  const qualificationId = String(item.qualificationId ?? "").trim();
  const level = String(item.level ?? "").trim();
  const syllabusId = String(item.syllabusId ?? "").trim();
  const syllabusVersion = String(item.syllabusVersion ?? "").trim();
  const subjectId = String(item.subjectId ?? "").trim();
  if (!boardId || !qualificationId || !level || !syllabusId || !syllabusVersion || !subjectId) return null;
  return { boardId, qualificationId, level, syllabusId, syllabusVersion, subjectId, paperOrComponentId: String(item.paperOrComponentId ?? "").trim() || null };
}

function isCodeLabRelevant(objective: CurriculumObjective) {
  const text = `${objective.title} ${objective.description ?? ""} ${objective.topic ?? ""}`.toLowerCase();
  return /(program|pseudo|algorithm|flow chart|flowchart|function|procedure|selection|repetition|iteration|debug|test|code|software solution|computer solution|array|database|website|web development|user interface|trace table|develop a program|construct.*pseudo|system development)/.test(text);
}

function buildObjectiveTest(objective: CurriculumObjective): Pick<CodeObjective, "skill" | "test"> {
  const text = `${objective.title} ${objective.description ?? ""}`.toLowerCase();
  if (/function|procedure|subprogram/.test(text)) return { skill: "Functions / subprograms", test: (code) => ({ passed: /function\s+[A-Za-z_$][\w$]*\s*\(/.test(code), message: /function\s+[A-Za-z_$][\w$]*\s*\(/.test(code) ? "A named function is present." : "Create a named function or equivalent subprogram." }) };
  if (/selection/.test(text)) return { skill: "Selection", test: (code) => ({ passed: /\bif\s*\(/.test(code), message: /\bif\s*\(/.test(code) ? "A conditional structure is present." : "Use a conditional structure to make a decision." }) };
  if (/repetition|iteration|loop/.test(text)) return { skill: "Iteration", test: (code) => ({ passed: /\b(for|while)\s*\(/.test(code), message: /\b(for|while)\s*\(/.test(code) ? "A loop is present." : "Use a loop to repeat a process." }) };
  if (/debug|test/.test(text)) return { skill: "Testing and debugging", test: (_code, output) => ({ passed: output.length > 0, message: output.length > 0 ? "The program produced output you can inspect." : "Run the program first, then inspect the output and errors." }) };
  if (/array/.test(text)) return { skill: "Arrays / data", test: (code) => ({ passed: /\[[^\]]*\]/.test(code), message: /\[[^\]]*\]/.test(code) ? "An array-like structure is present." : "Create and use an array in your solution." }) };
  if (/pseudo|flowchart|algorithm|trace/.test(text)) return { skill: "Algorithm design", test: (code) => ({ passed: code.trim().length >= 40, message: code.trim().length >= 40 ? "There is enough implementation to inspect against the objective." : "Write the algorithm or implementation before testing it." }) };
  if (/database|website|web development|user interface/.test(text)) return { skill: "Applied programming", test: (code) => ({ passed: code.trim().length >= 40, message: code.trim().length >= 40 ? "Your implementation is ready for a deeper practical review." : "Build a small working implementation first." }) };
  return { skill: objective.topic || "Programming", test: (code, output) => ({ passed: code.trim().length >= 40 || output.length > 0, message: code.trim().length >= 40 || output.length > 0 ? "Your implementation is ready for inspection." : "Write and run a meaningful implementation first." }) };
}

function toCodeObjective(objective: CurriculumObjective): CodeObjective {
  return { ...objective, skill: buildObjectiveTest(objective).skill, test: buildObjectiveTest(objective).test };
}

export default function CodeLabPage() {
  const { profile, user } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);
  const [curriculumIdentity, setCurriculumIdentity] = useState<ReturnType<typeof normalizeIdentity> | null>(null);
  const [curriculumObjectives, setCurriculumObjectives] = useState<CodeObjective[]>([]);
  const [curriculumStatus, setCurriculumStatus] = useState<string | null>(null);
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [code, setCode] = useState(STARTER_CODE);
  const [saved, setSaved] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [tested, setTested] = useState(false);
  const [objectiveId, setObjectiveId] = useState(FOUNDATION_OBJECTIVES[0].id);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey(profile?.id));
      if (stored) setCode(stored);
    } catch {
      // Local persistence is optional.
    }
  }, [profile?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadCurriculum() {
      if (!user?.id) return;
      setCurriculumLoading(true);
      try {
        const { data: profileRow } = await supabase.from("profiles").select("curriculum_subjects").eq("id", user.id).maybeSingle();
        const identities = Array.isArray(profileRow?.curriculum_subjects) ? profileRow.curriculum_subjects.map(normalizeIdentity).filter(Boolean) : [];
        const identity = identities[0] ?? null;
        if (cancelled) return;
        setCurriculumIdentity(identity);
        if (!identity) return;

        const { data: versions } = await supabase
          .from("curriculum_versions")
          .select("id, board_id, qualification_id, syllabus_id, syllabus_version, subject_id, status")
          .eq("syllabus_id", identity.syllabusId)
          .eq("subject_id", identity.subjectId)
          .neq("status", "archived")
          .order("created_at", { ascending: false })
          .limit(1);
        const version = versions?.[0];
        if (!version) return;
        setCurriculumStatus(version.status);

        let query = supabase
          .from("curriculum_objectives")
          .select("id, objective_key, parent_key, topic, title, description, education_level, paper_component, status")
          .eq("curriculum_version_id", version.id)
          .neq("status", "archived")
          .order("objective_key", { ascending: true });
        if (identity.level) query = query.eq("education_level", identity.level);
        const { data: rows } = await query;
        const relevant = (rows ?? []).filter(isCodeLabRelevant).map(toCodeObjective);
        if (!cancelled) {
          setCurriculumObjectives(relevant);
          if (relevant.length > 0) setObjectiveId(relevant[0].id);
        }
      } catch {
        if (!cancelled) setCurriculumObjectives([]);
      } finally {
        if (!cancelled) setCurriculumLoading(false);
      }
    }
    void loadCurriculum();
    return () => { cancelled = true; };
  }, [supabase, user?.id]);

  const objectives = curriculumObjectives.length > 0 ? curriculumObjectives : FOUNDATION_OBJECTIVES;
  const objective = useMemo(() => objectives.find((item) => item.id === objectiveId) ?? objectives[0], [objectives, objectiveId]);
  const usingCurriculum = curriculumObjectives.length > 0;

  function saveCode() {
    try { window.localStorage.setItem(storageKey(profile?.id), code); } catch { /* Local persistence is optional. */ }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function resetCode() {
    setCode(STARTER_CODE);
    setOutput([]);
    setTested(false);
    try { window.localStorage.removeItem(storageKey(profile?.id)); } catch { /* Local persistence is optional. */ }
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
    if (!objective) return;
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
              Start from the learner's actual curriculum objective, write the solution, run it, test it and improve it. AI is not required just to execute or perform the basic local check.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
            <span className="block text-xs text-[var(--muted-foreground)]">Learning context</span>
            <strong className="text-[var(--foreground)]">{experience.label}</strong>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Board", curriculumIdentity?.boardId ?? profile?.curriculum_board ?? "Not set"],
            ["Qualification", curriculumIdentity?.qualificationId ?? profile?.qualification ?? "Not set"],
            ["Syllabus", curriculumIdentity?.syllabusId ?? profile?.syllabus_code ?? "Not set"],
            ["Subject", curriculumIdentity?.subjectId ?? "Computer Science"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</span>
              <span className="mt-1 block truncate text-sm font-semibold text-[var(--foreground)]">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span className="rounded-full border border-[var(--card-border)] px-3 py-1.5">{usingCurriculum ? `${curriculumObjectives.length} syllabus objectives loaded` : curriculumLoading ? "Loading curriculum..." : "General programming objectives"}</span>
          {curriculumStatus && <span className="rounded-full border border-[var(--card-border)] px-3 py-1.5">Source status: {curriculumStatus}</span>}
        </div>

        {!curriculumIdentity && !curriculumLoading && (
          <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
            No complete curriculum identity is available for this learner yet. Code Lab stays usable, but it will not infer a board or syllabus from a subject name alone.
          </div>
        )}
      </header>

      <section className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-sm font-bold text-[var(--foreground)]">Objectives</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
            {usingCurriculum ? "These objectives come from the learner's stored syllabus identity and curriculum records. Code Lab filters the curriculum to objectives that can be practised through programming." : "The generic list is a fallback only. Once an exact curriculum identity is available, Code Lab uses curriculum records instead."}
          </p>

          <div className="mt-4 space-y-2">
            {objectives.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setObjectiveId(item.id); setTested(false); }}
                className={`w-full rounded-xl border p-3 text-left transition ${objective?.id === item.id ? "border-[var(--primary)]/40 bg-[var(--primary-glow)]" : "border-[var(--card-border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span>
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{item.objective_key}</span>
                    <span className="mt-1 block text-sm font-semibold text-[var(--foreground)]">{item.title}</span>
                  </span>
                  {objective?.id === item.id && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--primary)]" />}
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
              <h2 className="text-sm font-bold text-[var(--foreground)]">{objective?.title ?? "Programming practice"}</h2>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{objective?.objective_key} · {objective?.skill}</p>
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
                  Execution and basic checks stay local. Curriculum-aware marking remains a separate layer, so AI is not a requirement for Code Lab.
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
