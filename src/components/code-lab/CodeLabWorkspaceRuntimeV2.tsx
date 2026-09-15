"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { CheckCircle2, Command, FileCode2, GitBranch, Play, Plus, Save, Search, Settings2, Sparkles, X } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";
import { selectComputerScienceCurriculum } from "@/lib/academic/code-lab";
import { CodeLabEditor } from "./CodeLabEditor";
import { executeCode, type RuntimeDiagnostic, type RuntimeLanguage } from "@/lib/code-lab/runtime";
import { buildObjectiveEvidenceChecks, evaluateObjectiveEvidence, type ObjectiveEvidenceResult } from "@/lib/code-lab/objective-evidence";

type Objective = { id: string; objective_key: string; title: string; description: string | null; topic: string | null };
type WorkspaceFile = { path: string; content: string; language: string; dirty?: boolean };
type Panel = "terminal" | "problems" | "tests" | "output";

const STORAGE_PREFIX = "shadecode:comp-lab:";
const START = `function main() {\n  const message = "Hello, Shadecode!";\n  console.log(message);\n}\n\nmain();\n`;
const initialFiles = (): WorkspaceFile[] => [
  { path: "main.js", content: START, language: "javascript" },
  { path: "utils.js", content: "export function greet(name) {\n  return `Hello, ${name}!`;\n}\n", language: "javascript" },
  { path: "README.md", content: "# Comp Lab\n\nBuild from the selected curriculum objective.\n", language: "markdown" },
];

function languageFor(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "py") return "python";
  if (ext === "java") return "java";
  if (ext === "cs") return "csharp";
  if (ext === "vb") return "vbnet";
  if (ext === "c") return "c";
  if (["cpp", "cc", "cxx", "hpp"].includes(ext ?? "")) return "cpp";
  if (ext === "sql") return "sql";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "css") return "css";
  if (ext === "json") return "json";
  if (ext === "md") return "markdown";
  return "javascript";
}

const RUNTIME_LANGUAGES: RuntimeLanguage[] = ["javascript", "typescript", "python", "csharp", "vbnet", "sql", "java", "c", "cpp", "kotlin", "php", "rust", "go", "pseudocode"];
function isRuntimeLanguage(language: string): language is RuntimeLanguage { return RUNTIME_LANGUAGES.includes(language as RuntimeLanguage); }
function isProgrammingObjective(o: Objective) {
  return /(program|algorithm|function|procedure|selection|loop|iteration|debug|test|code|array|record|database|web|software|object-oriented|oop)/.test(`${o.title} ${o.description ?? ""} ${o.topic ?? ""}`.toLowerCase());
}

export default function CodeLabWorkspaceRuntimeV2() {
  const { profile } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const db = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);
  const storageKey = `${STORAGE_PREFIX}${profile?.id ?? "guest"}`;
  const [files, setFiles] = useState<WorkspaceFile[]>(initialFiles);
  const [active, setActive] = useState("main.js");
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<Panel>("terminal");
  const [output, setOutput] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<RuntimeDiagnostic[]>([]);
  const [evidence, setEvidence] = useState<ObjectiveEvidenceResult[]>([]);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [compactTabs, setCompactTabs] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteInput = useRef<HTMLInputElement>(null);

  const current = files.find((file) => file.path === active) ?? files[0];
  const objective = objectives.find((item) => item.id === selectedObjective) ?? null;
  const visibleObjectives = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? objectives.filter((item) => `${item.objective_key} ${item.title} ${item.topic ?? ""}`.toLowerCase().includes(needle)) : objectives;
  }, [objectives, query]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const savedState = JSON.parse(raw) as Partial<{ files: WorkspaceFile[]; active: string; compactTabs: boolean }>;
      if (Array.isArray(savedState.files) && savedState.files.length) setFiles(savedState.files);
      if (savedState.active) setActive(savedState.active);
      if (typeof savedState.compactTabs === "boolean") setCompactTabs(savedState.compactTabs);
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadObjectives() {
      try {
        const pool = Array.isArray(profile?.curriculum_subjects) ? profile.curriculum_subjects : [];
        const selected = selectComputerScienceCurriculum(pool) as Record<string, unknown> | null;
        const nested = (selected?.curriculum && typeof selected.curriculum === "object" ? selected.curriculum : selected) as Record<string, unknown> | null;
        const syllabusId = String(nested?.syllabusId ?? nested?.syllabus_id ?? "");
        const subjectId = String(nested?.subjectId ?? nested?.subject_id ?? "");
        if (!syllabusId || !subjectId) return;
        const { data: versions } = await db.from("curriculum_versions").select("id").eq("syllabus_id", syllabusId).eq("subject_id", subjectId).neq("status", "archived").order("created_at", { ascending: false }).limit(1);
        const versionId = versions?.[0]?.id;
        if (!versionId) return;
        const { data } = await db.from("curriculum_objectives").select("id,objective_key,title,description,topic").eq("curriculum_version_id", versionId).neq("status", "archived").order("objective_key");
        if (!cancelled) {
          const list = (data ?? []).filter(isProgrammingObjective) as Objective[];
          setObjectives(list);
          setSelectedObjective((value) => value ?? list[0]?.id ?? null);
        }
      } catch {}
    }
    void loadObjectives();
    return () => { cancelled = true; };
  }, [db, profile?.curriculum_subjects]);

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ files: files.map((file) => ({ ...file, dirty: false })), active, compactTabs }));
      setFiles((items) => items.map((file) => ({ ...file, dirty: false })));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
    } catch {}
  }
  function updateCurrent(value: string) { setFiles((items) => items.map((file) => file.path === active ? { ...file, content: value, dirty: true } : file)); }
  function closeFile(path: string) {
    if (files.length === 1) return;
    const index = files.findIndex((file) => file.path === path);
    const remaining = files.filter((file) => file.path !== path);
    setFiles(remaining);
    if (path === active) setActive(remaining[Math.max(0, index - 1)]?.path ?? remaining[0].path);
  }
  function addFile() {
    const path = newFileName.trim().replace(/^\/+/, "");
    if (!path) return;
    if (!files.some((file) => file.path === path)) setFiles((items) => [...items, { path, content: "", language: languageFor(path), dirty: true }]);
    setActive(path); setNewFileName(""); setNewFileOpen(false);
  }

  async function run() {
    const language = current?.language ?? "";
    if (!current || !isRuntimeLanguage(language)) {
      setPanel("terminal");
      setOutput([`${language || "This"} is an artifact/editor language here, not an executable runtime. Comp Lab will not pretend otherwise.`]);
      return;
    }
    setRunning(true); setPanel("terminal"); setOutput([]); setDiagnostics([]);
    try {
      const result = await executeCode({ id: crypto.randomUUID(), language, code: current.content, files: files.map(({ path, content }) => ({ path, content })), entryFile: current.path, timeoutMs: 5000 });
      const found = result.events.flatMap((event) => event.type === "diagnostic" ? [event.diagnostic] : []);
      const captured = result.events.flatMap((event) => event.type === "stdout" ? [event.text] : event.type === "stderr" ? [event.text] : event.type === "error" ? [event.message] : []);
      setDiagnostics(found); setOutput(captured.length ? captured : [result.exitCode === 0 ? `Process exited successfully in ${result.durationMs}ms.` : "Process failed."]); if (found.length) setPanel("problems");
    } catch (error) { setOutput([error instanceof Error ? error.message : String(error)]); } finally { setRunning(false); }
  }
  function checkWork() {
    if (!objective) return;
    const results = evaluateObjectiveEvidence(buildObjectiveEvidenceChecks(objective), files.map(({ path, content }) => ({ path, content })));
    setEvidence(results); setPanel("tests"); setOutput([`${results.filter((item) => item.status === "passed").length}/${results.length} evidence checks passed.`, "These are deterministic learning checks, not official examination marks."]);
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(true); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); persist(); }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  });

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-[#080b11] text-slate-200">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f17] shadow-2xl lg:min-h-[calc(100vh-7rem)]">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-[#0d121b] px-3">
          <div className="flex min-w-0 items-center gap-2 font-semibold"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-white"><FileCode2 className="h-4 w-4" /></div><span className="hidden sm:inline">Comp Lab</span></div>
          <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex"><GitBranch className="h-3.5 w-3.5" />main · {experience.shortLabel}</div>
          <div className="ml-auto flex items-center gap-1">{saved && <span className="mr-1 hidden text-[10px] text-emerald-400 sm:inline">Saved locally</span>}<button type="button" onClick={() => setPaletteOpen(true)} title="Command palette" className="hidden rounded-lg p-2 text-slate-400 hover:bg-white/5 sm:block"><Command className="h-4 w-4" /></button><button type="button" onClick={() => setCompactTabs((value) => !value)} title="Tab density" className="hidden rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:block"><Settings2 className="h-4 w-4" /></button><button type="button" onClick={persist} title="Save workspace" className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><Save className="h-4 w-4" /></button><button type="button" onClick={run} disabled={running} className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"><Play className="h-3.5 w-3.5" />{running ? "Running" : "Run"}</button></div>
        </header>

        <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 bg-[#0a0e15] px-2 py-1.5 lg:hidden">
          <button type="button" onClick={() => setNewFileOpen(true)} className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-[10px] text-slate-300"><Plus className="h-3 w-3" />File</button>
          <select value={active} onChange={(event) => setActive(event.target.value)} className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-[10px] text-slate-300 outline-none">{files.map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}</select>
          <select value={selectedObjective ?? ""} onChange={(event) => setSelectedObjective(event.target.value || null)} className="max-w-[42%] rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-[10px] text-slate-300 outline-none"><option value="">Objective</option>{visibleObjectives.map((item) => <option key={item.id} value={item.id}>{item.objective_key} · {item.title}</option>)}</select>
          <button type="button" onClick={checkWork} disabled={!objective} className="shrink-0 rounded-md border border-white/10 px-2.5 py-1.5 text-[10px] text-slate-300 disabled:opacity-40">Check</button>
        </div>

        <div data-comp-lab-grid className="grid min-h-0 flex-1 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
          <aside className="hidden min-h-0 border-r border-white/10 bg-[#0a0e15] lg:block">
            <div className="flex h-10 items-center justify-between border-b border-white/10 px-3"><span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Explorer</span><button type="button" onClick={() => setNewFileOpen(true)}><Plus className="h-3.5 w-3.5 text-slate-500" /></button></div>
            <div className="p-2">{files.map((file) => <div key={file.path} className={`group flex items-center gap-2 rounded-md px-2 py-2 text-xs ${active === file.path ? "bg-white/10 text-white" : "text-slate-400"}`}><button type="button" onClick={() => setActive(file.path)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><FileCode2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{file.path}</span>{file.dirty && <span className="text-amber-400">●</span>}</button>{files.length > 1 && <button type="button" onClick={() => closeFile(file.path)} className="hidden group-hover:block"><X className="h-3 w-3" /></button>}</div>)}</div>
            <div className="border-t border-white/10 p-3"><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500"><Search className="h-3 w-3" />Objectives</div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search objectives" className="mb-2 w-full rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-xs outline-none"/><div className="max-h-72 space-y-1 overflow-auto">{visibleObjectives.map((item) => <button key={item.id} type="button" onClick={() => setSelectedObjective(item.id)} className={`w-full rounded-md px-2 py-2 text-left ${selectedObjective === item.id ? "bg-[var(--primary)]/15 text-white" : "text-slate-400 hover:bg-white/5"}`}><div className="text-[9px] text-slate-500">{item.objective_key}</div><div className="text-[11px] leading-4">{item.title}</div></button>)}</div></div>
          </aside>

          <main data-comp-lab-main className="min-w-0 bg-[#080b11]">
            <div className="flex h-10 items-center overflow-x-auto border-b border-white/10 bg-[#0b0f17]">{files.map((file) => <button key={file.path} type="button" onClick={() => setActive(file.path)} className={`group flex h-full shrink-0 items-center gap-2 border-r border-white/10 px-3 text-xs ${compactTabs ? "max-w-32" : "max-w-48"} ${active === file.path ? "bg-[#080b11] text-white" : "text-slate-500"}`}><FileCode2 className="h-3.5 w-3.5" /><span className="truncate">{file.path}</span>{file.dirty && <span className="text-amber-400">●</span>}<span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); closeFile(file.path); }} className="ml-1 rounded p-0.5 text-slate-600 hover:text-slate-200"><X className="h-3 w-3" /></span></button>)}<button type="button" onClick={() => setNewFileOpen(true)} className="ml-1 rounded p-2 text-slate-500"><Plus className="h-3.5 w-3.5" /></button></div>
            <div className="min-h-0"><CodeLabEditor value={current?.content ?? ""} language={current?.language ?? "javascript"} onChange={updateCurrent} onSave={persist} /></div>
            <div data-comp-lab-bottom className="border-t border-white/10 bg-[#0b0f17]"><div className="flex h-9 items-center gap-1 px-2">{(["terminal", "problems", "tests", "output"] as Panel[]).map((item) => <button key={item} type="button" onClick={() => setPanel(item)} className={`rounded px-2 py-1 text-[10px] uppercase tracking-wider ${panel === item ? "bg-white/10 text-white" : "text-slate-500"}`}>{item}{item === "problems" && diagnostics.length ? ` ${diagnostics.length}` : ""}{item === "tests" && evidence.length ? ` ${evidence.filter((x) => x.status === "passed").length}/${evidence.length}` : ""}</button>)}</div><div className="max-h-48 min-h-24 overflow-auto border-t border-white/10 p-3 font-mono text-[11px]">{panel === "problems" ? (diagnostics.length ? diagnostics.map((d, i) => <div key={i} className="mb-1 text-red-300">{d.message}{d.line ? ` (line ${d.line})` : ""}</div>) : <span className="text-slate-600">No problems detected.</span>) : panel === "tests" ? (evidence.length ? evidence.map((item) => <div key={item.id} className="mb-2 flex gap-2"><span className={item.status === "passed" ? "text-emerald-400" : "text-amber-400"}>{item.status === "passed" ? "✓" : "!"}</span><div><div className="text-slate-200">{item.name}</div><div className="text-slate-500">{item.status === "passed" ? item.detail : item.message}</div></div></div>) : <span className="text-slate-600">Select an objective and use Check work.</span>) : output.length ? output.map((line, i) => <div key={i} className="mb-1 whitespace-pre-wrap text-slate-300">{line}</div>) : <span className="text-slate-600">Run the current file to see output.</span>}</div></div>
          </main>

          <aside className="hidden min-h-0 border-l border-white/10 bg-[#0a0e15] lg:flex lg:flex-col"><div className="flex h-10 items-center gap-2 border-b border-white/10 px-3"><Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" /><span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Learning Companion</span></div><div className="flex-1 overflow-auto p-4"><div className="mb-4 rounded-xl border border-white/10 bg-white/[0.02] p-3"><div className="mb-1 text-[9px] uppercase tracking-widest text-slate-600">Current objective</div><div className="text-sm font-semibold text-slate-200">{objective?.title ?? "Choose an objective"}</div>{objective?.objective_key && <div className="mt-1 text-[10px] text-slate-500">{objective.objective_key}</div>}<div className="mt-2 text-xs leading-5 text-slate-500">{objective?.description ?? "Comp Lab connects your project to the curriculum so practice has a target."}</div></div><button type="button" onClick={checkWork} disabled={!objective} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" />Check work</button><div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[10px] leading-4 text-slate-600">Evidence signals are learning checks, not official examination marks.</div></div></aside>
        </div>
      </div>

      {newFileOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"><div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#101621] p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold">Create file</span><button type="button" onClick={() => setNewFileOpen(false)}><X className="h-4 w-4 text-slate-500" /></button></div><input autoFocus value={newFileName} onChange={(event) => setNewFileName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addFile(); }} placeholder="src/main.js" className="mb-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"/><button type="button" onClick={addFile} className="w-full rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white">Create</button></div></div>}
      {paletteOpen && <div className="fixed inset-0 z-50 bg-black/60 p-4" onMouseDown={() => setPaletteOpen(false)}><div className="mx-auto mt-24 w-full max-w-lg rounded-xl border border-white/10 bg-[#101621] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><input ref={paletteInput} autoFocus placeholder="Command palette" className="w-full border-b border-white/10 bg-transparent px-4 py-3 text-sm outline-none"/><button type="button" onClick={() => { run(); setPaletteOpen(false); }} className="w-full px-4 py-3 text-left text-xs text-slate-300 hover:bg-white/5">Run current file</button><button type="button" onClick={() => { persist(); setPaletteOpen(false); }} className="w-full px-4 py-3 text-left text-xs text-slate-300 hover:bg-white/5">Save workspace</button></div></div>}
    </div>
  );
}
