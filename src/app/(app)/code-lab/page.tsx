"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { BookOpen, CheckCircle2, ChevronRight, Code2, Play, RotateCcw, Save, Terminal, TestTube2 } from "lucide-react";
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
  { id: "foundation.sequence", objective_key: "foundation.sequence", parent_key: null, topic: "Program flow", title: "Sequence", description: "Write instructions that execute in the correct order.", education_level: null, paper_component: null, status: "draft", skill: "Program flow", test: (code, output) => ({ passed: code.includes("console.log") && output.length > 0, message: code.includes("console.log") ? "Your program has an observable sequence." : "Add output so the sequence can be checked." }) },
  { id: "foundation.selection", objective_key: "foundation.selection", parent_key: null, topic: "Selection", title: "Selection", description: "Use conditions to make decisions in a program.", education_level: null, paper_component: null, status: "draft", skill: "if / else", test: (code) => ({ passed: /\bif\s*\(/.test(code), message: /\bif\s*\(/.test(code) ? "A conditional structure is present." : "Use an if statement to make a decision." }) },
  { id: "foundation.iteration", objective_key: "foundation.iteration", parent_key: null, topic: "Iteration", title: "Iteration", description: "Use loops to repeat a process correctly.", education_level: null, paper_component: null, status: "draft", skill: "for / while", test: (code) => ({ passed: /\b(for|while)\s*\(/.test(code), message: /\b(for|while)\s*\(/.test(code) ? "A loop is present." : "Use a for or while loop." }) },
  { id: "foundation.variables", objective_key: "foundation.variables", parent_key: null, topic: "Variables", title: "Variables and data", description: "Store, update and use values.", education_level: null, paper_component: null, status: "draft", skill: "Variables", test: (code) => ({ passed: /\b(const|let|var)\s+[A-Za-z_$][\w$]*/.test(code), message: /\b(const|let|var)\s+[A-Za-z_$][\w$]*/.test(code) ? "A variable is declared." : "Declare and use a variable." }) },
  { id: "foundation.functions", objective_key: "foundation.functions", parent_key: null, topic: "Subprograms", title: "Functions and subprograms", description: "Break a solution into reusable functions.", education_level: null, paper_component: null, status: "draft", skill: "Functions", test: (code) => ({ passed: /function\s+[A-Za-z_$][\w$]*\s*\(/.test(code), message: /function\s+[A-Za-z_$][\w$]*\s*\(/.test(code) ? "A named function is present." : "Create a named function." }) },
  { id: "foundation.testing", objective_key: "foundation.testing", parent_key: null, topic: "Testing and debugging", title: "Testing and debugging", description: "Use test cases and error information to improve a program.", education_level: null, paper_component: null, status: "draft", skill: "Debugging", test: (_code, output) => ({ passed: output.length > 0, message: output.length > 0 ? "The program produced output you can inspect." : "Run the program first, then inspect its output." }) },
];

function storageKey(userId?: string) { return `shadecode:code-lab:${userId ?? "guest"}`; }

function normalizeIdentity(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const fields = ["boardId", "qualificationId", "level", "syllabusId", "syllabusVersion", "subjectId"];
  if (fields.some((field) => !String(item[field] ?? "").trim())) return null;
  return { boardId: String(item.boardId).trim(), qualificationId: String(item.qualificationId).trim(), level: String(item.level).trim(), syllabusId: String(item.syllabusId).trim(), syllabusVersion: String(item.syllabusVersion).trim(), subjectId: String(item.subjectId).trim(), paperOrComponentId: String(item.paperOrComponentId ?? "").trim() || null };
}

function isCodeLabRelevant(objective: CurriculumObjective) {
  const text = `${objective.title} ${objective.description ?? ""} ${objective.topic ?? ""}`.toLowerCase();
  return /(program|pseudo|algorithm|flow chart|flowchart|function|procedure|selection|repetition|iteration|debug|test|code|software solution|computer solution|array|database|website|web development|user interface|trace table|develop a program|construct.*pseudo|system development)/.test(text);
}

function buildObjectiveTest(objective: CurriculumObjective): Pick<CodeObjective, "skill" | "test"> {
  const text = `${objective.title} ${objective.description ?? ""} ${objective.topic ?? ""}`.toLowerCase();
  if (/function|procedure|subprogram/.test(text)) return { skill: "Functions / subprograms", test: (code) => ({ passed: /function\s+[A-Za-z_$][\w$]*\s*\(/.test(code), message: /function\s+[A-Za-z_$][\w$]*\s*\(/.test(code) ? "A named function is present." : "Create a named function or equivalent subprogram." }) };
  if (/selection/.test(text)) return { skill: "Selection", test: (code) => ({ passed: /\bif\s*\(/.test(code), message: /\bif\s*\(/.test(code) ? "A conditional structure is present." : "Use a conditional structure to make a decision." }) };
  if (/repetition|iteration|loop/.test(text)) return { skill: "Iteration", test: (code) => ({ passed: /\b(for|while)\s*\(/.test(code), message: /\b(for|while)\s*\(/.test(code) ? "A loop is present." : "Use a loop to repeat a process." }) };
  if (/debug|test/.test(text)) return { skill: "Testing and debugging", test: (_code, output) => ({ passed: output.length > 0, message: output.length > 0 ? "The program produced output you can inspect." : "Run the program first, then inspect the output." }) };
  if (/array/.test(text)) return { skill: "Arrays / data", test: (code) => ({ passed: /\[[^\]]*\]/.test(code), message: /\[[^\]]*\]/.test(code) ? "An array-like structure is present." : "Create and use an array." }) };
  if (/pseudo|flowchart|algorithm|trace/.test(text)) return { skill: "Algorithm design", test: (code) => ({ passed: code.trim().length >= 40, message: code.trim().length >= 40 ? "There is an implementation to inspect." : "Write the algorithm or implementation first." }) };
  if (/database|website|web development|user interface/.test(text)) return { skill: "Applied programming", test: (code) => ({ passed: code.trim().length >= 40, message: code.trim().length >= 40 ? "Your implementation is ready for practical review." : "Build a small working implementation first." }) };
  return { skill: objective.topic || "Programming", test: (code, output) => ({ passed: code.trim().length >= 40 || output.length > 0, message: code.trim().length >= 40 || output.length > 0 ? "Your implementation is ready for inspection." : "Write and run a meaningful implementation first." }) };
}

function toCodeObjective(objective: CurriculumObjective): CodeObjective { const built = buildObjectiveTest(objective); return { ...objective, ...built }; }

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

  useEffect(() => { try { const stored = window.localStorage.getItem(storageKey(profile?.id)); if (stored) setCode(stored); } catch {} }, [profile?.id]);

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
        const { data: versions } = await supabase.from("curriculum_versions").select("id, board_id, qualification_id, syllabus_id, syllabus_version, subject_id, status").eq("syllabus_id", identity.syllabusId).eq("subject_id", identity.subjectId).neq("status", "archived").order("created_at", { ascending: false }).limit(1);
        const version = versions?.[0];
        if (!version) return;
        setCurriculumStatus(version.status);
        const { data: rows } = await supabase.from("curriculum_objectives").select("id, objective_key, parent_key, topic, title, description, education_level, paper_component, status").eq("curriculum_version_id", version.id).neq("status", "archived").order("objective_key", { ascending: true });
        const relevant = (rows ?? []).filter(isCodeLabRelevant).map(toCodeObjective);
        if (!cancelled) { setCurriculumObjectives(relevant); if (relevant.length > 0) setObjectiveId(relevant[0].id); }
      } catch { if (!cancelled) setCurriculumObjectives([]); } finally { if (!cancelled) setCurriculumLoading(false); }
    }
    void loadCurriculum();
    return () => { cancelled = true; };
  }, [supabase, user?.id]);

  const objectives = curriculumObjectives.length > 0 ? curriculumObjectives : FOUNDATION_OBJECTIVES;
  const objective = useMemo(() => objectives.find((item) => item.id === objectiveId) ?? objectives[0], [objectives, objectiveId]);
  const usingCurriculum = curriculumObjectives.length > 0;

  function saveCode() { try { window.localStorage.setItem(storageKey(profile?.id), code); } catch {} setSaved(true); window.setTimeout(() => setSaved(false), 1600); }
  function resetCode() { setCode(STARTER_CODE); setOutput([]); setTested(false); try { window.localStorage.removeItem(storageKey(profile?.id)); } catch {} }
  function runCode() {
    setRunning(true); setOutput([]); setTested(false); const lines: string[] = []; const originalLog = console.log;
    try { console.log = (...args: unknown[]) => lines.push(args.map(String).join(" ")); new Function(code)(); setOutput(lines.length ? lines : ["Program finished without console output."]); }
    catch (error) { setOutput([`Runtime error: ${error instanceof Error ? error.message : String(error)}`]); }
    finally { console.log = originalLog; setRunning(false); }
  }
  function testObjective() { if (!objective) return; const result = objective.test(code, output); setTested(true); setOutput((current) => [...current, `Objective check: ${result.message}`]); }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5 md:px-8 md:py-7">
      <header className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]"><Code2 className="h-4 w-4" /> Code Lab</div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">Learn programming by building.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">A practical programming workspace that follows your academic context first, then turns curriculum objectives into build-and-test tasks.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-[var(--card-border)] px-3 py-1.5">{experience.label}</span>
            {curriculumIdentity && <span className="rounded-full border border-[var(--card-border)] px-3 py-1.5">{curriculumIdentity.boardId} · {curriculumIdentity.syllabusId}</span>}
            {usingCurriculum && <span className="rounded-full border border-[var(--card-border)] px-3 py-1.5">{curriculumObjectives.length} objectives</span>}
          </div>
        </div>
      </header>

      <section className="mt-5 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4" /> Objective path</div><span className="text-xs text-[var(--muted-foreground)]">{curriculumLoading ? "Loading…" : usingCurriculum ? "Curriculum" : "Foundation"}</span></div>
          {curriculumStatus && <div className="mb-3 rounded-2xl border border-[var(--card-border)] p-3 text-xs text-[var(--muted-foreground)]">Source status: <strong className="text-[var(--foreground)]">{curriculumStatus}</strong>. Code Lab will not label draft content as verified exam marking.</div>}
          <div className="space-y-2">
            {objectives.map((item, index) => {
              const active = item.id === objective?.id;
              return <button key={item.id} onClick={() => { setObjectiveId(item.id); setTested(false); }} className={`w-full rounded-2xl border p-3 text-left transition ${active ? "border-[var(--primary)] bg-[var(--primary)]/8" : "border-[var(--card-border)] hover:bg-[var(--muted)]/30"}`}><div className="flex items-start gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">{index + 1}</span><span className="min-w-0"><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">{item.description || item.topic || item.skill}</span><span className="mt-2 block text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">{item.objective_key} · {item.status}</span></span><ChevronRight className="ml-auto mt-1 h-4 w-4 shrink-0 opacity-50" /></div></button>;
            })}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">Current objective</div><h2 className="mt-1 text-xl font-bold">{objective?.title}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{objective?.description || objective?.topic}</p></div><span className="rounded-full border border-[var(--card-border)] px-3 py-1.5 text-xs">{objective?.skill}</span></div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[#111] text-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3"><div className="flex items-center gap-2 text-sm font-semibold"><Code2 className="h-4 w-4" /> JavaScript workspace</div><div className="flex gap-2"><button onClick={saveCode} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/5"><Save className="h-3.5 w-3.5" /> {saved ? "Saved" : "Save"}</button><button onClick={resetCode} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/5"><RotateCcw className="h-3.5 w-3.5" /> Reset</button><button onClick={runCode} disabled={running} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"><Play className="h-3.5 w-3.5" /> {running ? "Running…" : "Run"}</button></div></div>
            <textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} className="min-h-[420px] w-full resize-y bg-transparent p-4 font-mono text-sm leading-6 outline-none" aria-label="Code editor" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-4 md:p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><Terminal className="h-4 w-4" /> Output</div><pre className="min-h-28 whitespace-pre-wrap rounded-2xl bg-[var(--muted)]/40 p-3 font-mono text-xs leading-5 text-[var(--foreground)]">{output.length ? output.join("\n") : "Run your program to see output here."}</pre></div>
            <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-4 md:p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><TestTube2 className="h-4 w-4" /> Objective check</div><p className="text-sm leading-6 text-[var(--muted-foreground)]">This is a deterministic practice check, not official exam marking. It verifies whether your current implementation demonstrates the selected objective.</p><button onClick={testObjective} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--muted)]/30"><CheckCircle2 className="h-4 w-4" /> Check objective</button>{tested && <div className="mt-3 rounded-2xl border border-[var(--card-border)] p-3 text-sm">Check completed. Read the output panel for the deterministic feedback.</div>}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
