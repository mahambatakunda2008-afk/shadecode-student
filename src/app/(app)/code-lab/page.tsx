"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Code2,
  Command,
  Play,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Terminal,
  TestTube2,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";
import { selectComputerScienceCurriculum } from "@/lib/academic/code-lab";

const STARTER_CODE = `// Start with the objective on the left.
// Run your code with Ctrl/Cmd + Enter.

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

type CurriculumIdentity = {
  boardId: string;
  qualificationId: string;
  level: string;
  syllabusId: string;
  syllabusVersion: string;
  subjectId: string;
  paperOrComponentId: string | null;
};

function storageKey(userId?: string) {
  return `shadecode:code-lab:${userId ?? "guest"}`;
}

function readField(item: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function normalizeIdentity(value: unknown): CurriculumIdentity | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const nested = [item.curriculum, item.catalog, item.metadata].find((entry) => entry && typeof entry === "object" && !Array.isArray(entry)) as Record<string, unknown> | undefined;
  const source = nested ? { ...item, ...nested } : item;
  const boardId = readField(source, "boardId", "board_id");
  const qualificationId = readField(source, "qualificationId", "qualification_id");
  const level = readField(source, "level", "educationLevel", "education_level");
  const syllabusId = readField(source, "syllabusId", "syllabus_id");
  const syllabusVersion = readField(source, "syllabusVersion", "syllabus_version", "version");
  const subjectId = readField(source, "subjectId", "subject_id");
  if (![boardId, qualificationId, level, syllabusId, syllabusVersion, subjectId].every(Boolean)) return null;
  return {
    boardId,
    qualificationId,
    level,
    syllabusId,
    syllabusVersion,
    subjectId,
    paperOrComponentId: readField(source, "paperOrComponentId", "paper_or_component_id") || null,
  };
}

function getCurriculumIdentity(subjects: unknown[], preferredSubject: unknown) {
  const candidates = [preferredSubject, ...subjects];
  for (const candidate of candidates) {
    const identity = normalizeIdentity(candidate);
    if (identity) return identity;
  }
  return null;
}

function objectiveText(objective: CurriculumObjective) {
  return `${objective.title} ${objective.description ?? ""} ${objective.topic ?? ""}`.toLowerCase();
}

function isCodeObjective(objective: CurriculumObjective) {
  const text = objectiveText(objective);
  return /(program|pseudo|algorithm|flow ?chart|function|procedure|subprogram|selection|repetition|iteration|loop|debug|test|code|programming|array|record|file handling|database|web|software|trace table|system development|construct|write a program)/.test(text);
}

function buildObjectiveTest(objective: CurriculumObjective): Pick<CodeObjective, "skill" | "test"> {
  const text = objectiveText(objective);
  if (/function|procedure|subprogram/.test(text)) {
    return { skill: "Subprograms", test: (code) => ({ passed: /(?:function\s+[A-Za-z_$][\w$]*\s*\(|=>)/.test(code), message: /(?:function\s+[A-Za-z_$][\w$]*\s*\(|=>)/.test(code) ? "A reusable function or arrow function is present." : "Build the solution as a reusable function or equivalent subprogram." }) };
  }
  if (/selection/.test(text)) {
    return { skill: "Selection", test: (code) => ({ passed: /\bif\s*\(/.test(code), message: /\bif\s*\(/.test(code) ? "A conditional decision is present." : "Use a conditional structure to make the required decision." }) };
  }
  if (/repetition|iteration|loop/.test(text)) {
    return { skill: "Iteration", test: (code) => ({ passed: /\b(for|while)\s*\(/.test(code), message: /\b(for|while)\s*\(/.test(code) ? "A repetition structure is present." : "Use a loop to repeat the required process." }) };
  }
  if (/array/.test(text)) {
    return { skill: "Arrays / data", test: (code) => ({ passed: /\[[^\]]*\]/.test(code), message: /\[[^\]]*\]/.test(code) ? "An array-like structure is present." : "Create and use an array-like data structure." }) };
  }
  if (/debug|test/.test(text)) {
    return { skill: "Testing / debugging", test: (_code, output) => ({ passed: output.length > 0, message: output.length > 0 ? "You have runtime evidence to inspect." : "Run the program, inspect the result, then revise it." }) };
  }
  if (/pseudo|flow ?chart|algorithm|trace/.test(text)) {
    return { skill: "Algorithmic thinking", test: (code) => ({ passed: code.trim().length >= 40, message: code.trim().length >= 40 ? "There is enough implementation to inspect." : "Translate the algorithm into a concrete implementation before checking it." }) };
  }
  return { skill: objective.topic || "Programming", test: (code, output) => ({ passed: code.trim().length >= 40 || output.length > 0, message: code.trim().length >= 40 || output.length > 0 ? "Your implementation is ready for inspection." : "Build a meaningful implementation, then run or inspect it." }) };
}

function toCodeObjective(objective: CurriculumObjective): CodeObjective {
  return { ...objective, ...buildObjectiveTest(objective) };
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

export default function CodeLabPage() {
  const { profile, user } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);

  const [curriculumIdentity, setCurriculumIdentity] = useState<CurriculumIdentity | null>(null);
  const [curriculumObjectives, setCurriculumObjectives] = useState<CodeObjective[]>([]);
  const [curriculumStatus, setCurriculumStatus] = useState<string | null>(null);
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [code, setCode] = useState(STARTER_CODE);
  const [saved, setSaved] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [tested, setTested] = useState(false);
  const [objectiveId, setObjectiveId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey(profile?.id));
      if (stored) setCode(stored);
    } catch {}
  }, [profile?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadCurriculum() {
      setCurriculumLoading(true);
      setCurriculumError(null);
      try {
        if (!user?.id) {
          if (!cancelled) setCurriculumLoading(false);
          return;
        }

        const subjectPool = Array.isArray(profile?.curriculum_subjects) ? profile.curriculum_subjects : [];
        const preferred = selectComputerScienceCurriculum(subjectPool);
        const identity = getCurriculumIdentity(subjectPool, preferred);

        if (cancelled) return;
        setCurriculumIdentity(identity);

        if (!identity) {
          setCurriculumError("Your academic profile does not currently expose a complete verified Computer Science curriculum identity. The workspace is still available, but curriculum objectives will appear when that identity is available.");
          setCurriculumLoading(false);
          return;
        }

        const { data: versions, error: versionError } = await supabase
          .from("curriculum_versions")
          .select("id, board_id, qualification_id, syllabus_id, syllabus_version, subject_id, status")
          .eq("syllabus_id", identity.syllabusId)
          .eq("subject_id", identity.subjectId)
          .neq("status", "archived")
          .order("created_at", { ascending: false })
          .limit(1);

        if (versionError) throw versionError;
        const version = versions?.[0];
        if (!version) {
          setCurriculumError("No current curriculum version is available for this academic identity yet.");
          setCurriculumLoading(false);
          return;
        }

        setCurriculumStatus(version.status);
        const { data: rows, error: objectiveError } = await supabase
          .from("curriculum_objectives")
          .select("id, objective_key, parent_key, topic, title, description, education_level, paper_component, status")
          .eq("curriculum_version_id", version.id)
          .neq("status", "archived")
          .order("objective_key", { ascending: true });

        if (objectiveError) throw objectiveError;
        const relevant = (rows ?? []).filter(isCodeObjective).map(toCodeObjective);
        if (!cancelled) {
          setCurriculumObjectives(relevant);
          setObjectiveId((current) => current && relevant.some((item) => item.id === current) ? current : relevant[0]?.id ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setCurriculumError(error instanceof Error ? error.message : "The curriculum could not be loaded.");
          setCurriculumObjectives([]);
        }
      } finally {
        if (!cancelled) setCurriculumLoading(false);
      }
    }

    void loadCurriculum();
    return () => { cancelled = true; };
  }, [profile?.curriculum_subjects, supabase, user?.id]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        runCode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const filteredObjectives = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return curriculumObjectives;
    return curriculumObjectives.filter((item) => `${item.title} ${item.topic ?? ""} ${item.description ?? ""} ${item.objective_key}`.toLowerCase().includes(needle));
  }, [curriculumObjectives, query]);

  const objective = useMemo(() => curriculumObjectives.find((item) => item.id === objectiveId) ?? null, [curriculumObjectives, objectiveId]);
  const verifiedCount = curriculumObjectives.filter((item) => item.status === "verified").length;
  const hasCurriculum = curriculumObjectives.length > 0;

  function saveCode() {
    try { window.localStorage.setItem(storageKey(profile?.id), code); } catch {}
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function resetCode() {
    setCode(STARTER_CODE);
    setOutput([]);
    setTested(false);
    try { window.localStorage.removeItem(storageKey(profile?.id)); } catch {}
  }

  function runCode() {
    if (running) return;
    setRunning(true);
    setOutput([]);
    setTested(false);
    const lines: string[] = [];
    const originalLog = console.log;
    try {
      console.log = (...args: unknown[]) => lines.push(args.map(String).join(" "));
      new Function(code)();
      setOutput(lines.length ? lines : ["Program finished without console output."]);
    } catch (error) {
      setOutput([`Runtime error: ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      console.log = originalLog;
      setRunning(false);
    }
  }

  function checkObjective() {
    if (!objective) return;
    const result = objective.test(code, output);
    setTested(true);
    setOutput((current) => [...current, `Objective check: ${result.message}`]);
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 md:px-7 md:py-6">
      <section className="overflow-hidden rounded-[28px] border border-[var(--card-border)] bg-[var(--surface)] shadow-sm">
        <div className="relative p-5 md:p-7">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[var(--primary)]/8 blur-3xl" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                <span className="inline-flex items-center gap-2"><Code2 className="h-4 w-4" /> Code Lab</span>
                <span className="h-1 w-1 rounded-full bg-[var(--muted-foreground)]/40" />
                <span className="text-[var(--muted-foreground)]">Build. Run. Understand.</span>
              </div>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl">Your programming workspace, tied to what you are actually studying.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)] md:text-base">Code Lab starts from your academic context and exposes the programming objectives available in the current curriculum. You build the solution, run it, inspect the evidence and check your work.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[470px]">
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--background)]/50 p-3"><div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Stage</div><div className="mt-1 truncate text-sm font-semibold">{experience.shortLabel}</div></div>
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--background)]/50 p-3"><div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Objectives</div><div className="mt-1 text-sm font-semibold">{formatCount(curriculumObjectives.length)}</div></div>
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--background)]/50 p-3"><div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Verified</div><div className="mt-1 text-sm font-semibold">{formatCount(verifiedCount)}</div></div>
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--background)]/50 p-3"><div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">State</div><div className="mt-1 text-sm font-semibold">{saved ? "Saved" : running ? "Running" : "Ready"}</div></div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-[var(--card-border)] bg-[var(--background)]/35 px-5 py-3 text-xs text-[var(--muted-foreground)] md:flex-row md:items-center md:justify-between md:px-7">
          <div className="flex min-w-0 items-center gap-2"><CircleDot className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" /><span className="truncate">{curriculumIdentity ? `${curriculumIdentity.boardId} · ${curriculumIdentity.qualificationId} · ${curriculumIdentity.syllabusVersion}` : "Academic context is still being resolved"}</span></div>
          <div className="shrink-0">{curriculumStatus ? `Curriculum source: ${curriculumStatus}` : "No exam-marking claims are made here"}</div>
        </div>
      </section>

      {curriculumError && (
        <section className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4 text-sm">
          <div className="flex gap-3"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" /><div><p className="font-semibold text-[var(--foreground)]">Curriculum context needs attention</p><p className="mt-1 leading-6 text-[var(--muted-foreground)]">{curriculumError}</p></div></div>
        </section>
      )}

      <section className="mt-5 grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-[26px] border border-[var(--card-border)] bg-[var(--surface)] p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><div className="flex items-center gap-2 text-sm font-bold"><BookOpen className="h-4 w-4 text-[var(--primary)]" /> Objective path</div><p className="mt-1 text-xs text-[var(--muted-foreground)]">Choose what you are practising.</p></div>
            <span className="rounded-full border border-[var(--card-border)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{curriculumLoading ? "Syncing" : hasCurriculum ? "Live" : "Workspace"}</span>
          </div>
          <div className="relative mb-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an objective…" className="h-10 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--primary)]" /></div>
          {curriculumLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--muted)]/50" />)}</div>
          ) : hasCurriculum ? (
            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {filteredObjectives.map((item, index) => {
                const active = item.id === objective?.id;
                return <button key={item.id} onClick={() => { setObjectiveId(item.id); setTested(false); }} className={`group w-full rounded-2xl border p-3 text-left transition ${active ? "border-[var(--primary)] bg-[var(--primary)]/8 shadow-sm" : "border-[var(--card-border)] hover:bg-[var(--background)]"}`}><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${active ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>{index + 1}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="block truncate text-sm font-semibold text-[var(--foreground)]">{item.title}</span>{item.status === "verified" && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />}</span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">{item.description || item.topic || "Curriculum objective"}</span><span className="mt-2 block truncate text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">{item.objective_key}</span></span><ChevronRight className={`mt-1 h-4 w-4 shrink-0 transition ${active ? "text-[var(--primary)]" : "opacity-30 group-hover:opacity-70"}`} /></div></button>;
              })}
              {!filteredObjectives.length && <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-5 text-center text-sm text-[var(--muted-foreground)]">No objectives match that search.</div>}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-5"><div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><Code2 className="h-4 w-4" /></div><p className="text-sm font-semibold">Workspace mode</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">The editor is ready. Once a complete verified Computer Science curriculum identity is available, this panel becomes your objective map.</p></div>
          )}
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="rounded-[26px] border border-[var(--card-border)] bg-[var(--surface)] p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--primary)]">Current objective</div><h2 className="text-2xl font-bold tracking-tight">{objective?.title ?? "Build something"}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">{objective?.description ?? "Use the workspace to experiment, run code and turn ideas into working programs."}</p></div>{objective && <div className="shrink-0 rounded-2xl border border-[var(--card-border)] px-3 py-2 text-xs"><div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Skill</div><div className="mt-1 font-semibold">{objective.skill}</div></div>}</div>
            <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[var(--background)]/60 p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--surface)] text-[var(--primary)]"><Sparkles className="h-4 w-4" /></div><div><p className="text-xs font-semibold">Tineo</p><p className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)]">Build the smallest version that demonstrates the idea. Then run it and inspect what actually happened.</p></div></div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#111315] text-white shadow-lg">
            <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10"><Code2 className="h-4 w-4" /></div><div><p className="text-sm font-semibold">JavaScript workspace</p><p className="text-[10px] text-white/45">Local browser execution · your code stays in this workspace</p></div></div><div className="flex flex-wrap gap-2"><button onClick={saveCode} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium transition hover:bg-white/5"><Save className="h-3.5 w-3.5" />{saved ? "Saved" : "Save"}</button><button onClick={resetCode} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium transition hover:bg-white/5"><RotateCcw className="h-3.5 w-3.5" />Reset</button><button onClick={runCode} disabled={running} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"><Play className="h-3.5 w-3.5" />{running ? "Running…" : "Run"}</button></div></div>
            <textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} aria-label="Code editor" className="min-h-[430px] w-full resize-y bg-transparent p-4 font-mono text-[13px] leading-6 text-white outline-none placeholder:text-white/25 md:min-h-[500px] md:p-5" />
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-white/40 md:px-5"><span>{code.split("\n").length} lines</span><span className="inline-flex items-center gap-1.5"><Command className="h-3 w-3" /> Ctrl/Cmd + Enter to run</span></div>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[26px] border border-[var(--card-border)] bg-[var(--surface)] p-4 md:p-5"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold"><Terminal className="h-4 w-4 text-[var(--primary)]" /> Output</div><span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Runtime</span></div><pre className="min-h-32 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-[var(--background)] p-3 font-mono text-xs leading-5 text-[var(--foreground)]">{output.length ? output.join("\n") : "Run your program to see evidence here."}</pre></div>
            <div className="rounded-[26px] border border-[var(--card-border)] bg-[var(--surface)] p-4 md:p-5"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold"><TestTube2 className="h-4 w-4 text-[var(--primary)]" /> Objective check</div><span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Practice</span></div><p className="text-sm leading-6 text-[var(--muted-foreground)]">{objective ? "A deterministic check looks for evidence that your implementation demonstrates the selected curriculum objective." : "Select a curriculum objective when one is available to enable objective-specific checking."}</p><button onClick={checkObjective} disabled={!objective} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-[var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"><CheckCircle2 className="h-4 w-4" />Check my work</button>{tested && <div className="mt-3 rounded-2xl border border-[var(--card-border)] p-3 text-xs text-[var(--muted-foreground)]">Check completed. Read the output panel for the evidence and feedback.</div>}</div>
          </section>
        </div>
      </section>
    </main>
  );
}
