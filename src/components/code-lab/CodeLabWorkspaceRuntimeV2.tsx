"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { CheckCircle2, ChevronDown, Command, FileCode2, FolderPlus, GitBranch, Play, Plus, RotateCcw, Save, Search, Settings2, Sparkles, Terminal, X } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";
import { selectComputerScienceCurriculum } from "@/lib/academic/code-lab";
import { CodeLabEditor } from "./CodeLabEditor";
import { executeCode, type RuntimeDiagnostic } from "@/lib/code-lab/runtime";

type Objective = { id: string; objective_key: string; title: string; description: string | null; topic: string | null };
type WorkspaceFile = { path: string; content: string; language: string; dirty?: boolean };
type Panel = "terminal" | "problems" | "tests" | "output";
type CommandId = "run" | "save" | "new" | "close" | "reset" | "compact";

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

function objectiveText(o: Objective) {
  return `${o.title} ${o.description ?? ""} ${o.topic ?? ""}`.toLowerCase();
}

function isProgrammingObjective(o: Objective) {
  return /(program|algorithm|function|procedure|selection|loop|iteration|debug|test|code|array|record|database|web|software|object-oriented|oop)/.test(objectiveText(o));
}

function diagnosticText(d: RuntimeDiagnostic) {
  return `${d.message}${d.line ? ` (line ${d.line}${d.column ? `:${d.column}` : ""})` : ""}`;
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
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [compactTabs, setCompactTabs] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [dragPath, setDragPath] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileExplorer, setMobileExplorer] = useState(false);
  const paletteInput = useRef<HTMLInputElement>(null);

  const current = files.find((file) => file.path === active) ?? files[0];
  const objective = objectives.find((item) => item.id === selectedObjective) ?? null;
  const code = current?.content ?? "";
  const visibleObjectives = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? objectives.filter((item) => `${item.objective_key} ${item.title} ${item.topic ?? ""}`.toLowerCase().includes(needle))
      : objectives;
  }, [objectives, query]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const savedState = JSON.parse(raw) as Partial<{ files: WorkspaceFile[]; active: string; compactTabs: boolean }>;
      if (Array.isArray(savedState.files) && savedState.files.length) setFiles(savedState.files);
      if (savedState.active) setActive(savedState.active);
      if (typeof savedState.compactTabs === "boolean") setCompactTabs(savedState.compactTabs);
    } catch {
      // Ignore corrupt local workspace state.
    }
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
        if (!syllabusId || !subjectId) {
          setError("Academic curriculum identity is not available yet. Comp Lab remains usable.");
          return;
        }
        const { data: versions, error: versionError } = await db.from("curriculum_versions").select("id").eq("syllabus_id", syllabusId).eq("subject_id", subjectId).neq("status", "archived").order("created_at", { ascending: false }).limit(1);
        if (versionError) throw versionError;
        const versionId = versions?.[0]?.id;
        if (!versionId) {
          setError("No current curriculum version is available yet.");
          return;
        }
        const { data, error: objectiveError } = await db.from("curriculum_objectives").select("id,objective_key,title,description,topic").eq("curriculum_version_id", versionId).neq("status", "archived").order("objective_key");
        if (objectiveError) throw objectiveError;
        if (!cancelled) {
          const list = (data ?? []).filter(isProgrammingObjective) as Objective[];
          setObjectives(list);
          setSelectedObjective((current) => current ?? list[0]?.id ?? null);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Curriculum could not be loaded.");
      }
    }
    void loadObjectives();
    return () => { cancelled = true; };
  }, [db, profile?.curriculum_subjects]);

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ files: files.map((file) => ({ ...file, dirty: false })), active, compactTabs }));
      setFiles((currentFiles) => currentFiles.map((file) => ({ ...file, dirty: false })));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
    } catch {
      setError("The workspace could not be saved locally on this device.");
    }
  }

  function resetWorkspace() {
    setFiles(initialFiles());
    setActive("main.js");
    setOutput([]);
    setDiagnostics([]);
    setPanel("terminal");
  }

  function updateCurrent(value: string) {
    setFiles((currentFiles) => currentFiles.map((file) => file.path === active ? { ...file, content: value, dirty: true } : file));
  }

  function closeFile(path: string) {
    if (files.length === 1) return;
    const index = files.findIndex((file) => file.path === path);
    const remaining = files.filter((file) => file.path !== path);
    setFiles(remaining);
    if (path === active) setActive(remaining[Math.max(0, index - 1)]?.path ?? remaining[0].path);
  }

  function moveTab(from: string, to: string) {
    if (from === to) return;
    setFiles((currentFiles) => {
      const fromIndex = currentFiles.findIndex((file) => file.path === from);
      const toIndex = currentFiles.findIndex((file) => file.path === to);
      if (fromIndex < 0 || toIndex < 0) return currentFiles;
      const next = [...currentFiles];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }

  function addFile() {
    const path = newFileName.trim().replace(/^\/+/, "");
    if (!path) return;
    const existing = files.find((file) => file.path === path);
    if (existing) setActive(existing.path);
    else {
      setFiles((currentFiles) => [...currentFiles, { path, content: "", language: languageFor(path), dirty: true }]);
      setActive(path);
    }
    setNewFileName("");
    setNewFileOpen(false);
  }

  async function run() {
    if (!current || current.language !== "javascript") {
      setPanel("terminal");
      setOutput([`${current?.language ?? "This"} runtime is not connected to the browser executor yet. Comp Lab will not pretend it is.`]);
      return;
    }
    setRunning(true);
    setPanel("terminal");
    setOutput([]);
    setDiagnostics([]);
    try {
      const result = await executeCode({ id: crypto.randomUUID(), language: "javascript", code, files: files.map((file) => ({ path: file.path, content: file.content })), entryFile: current.path, timeoutMs: 5000 });
      const foundDiagnostics = result.events.flatMap((event) => event.type === "diagnostic" ? [event.diagnostic] : []);
      const captured = result.events.flatMap((event) => event.type === "stdout" ? [event.text] : event.type === "stderr" ? [event.text] : event.type === "error" ? [event.message] : []);
      setDiagnostics(foundDiagnostics);
      setOutput(captured.length ? captured : [result.exitCode === 0 ? `Process exited successfully in ${result.durationMs}ms.` : "Process failed."]);
      if (foundDiagnostics.length) setPanel("problems");
    } catch (cause) {
      setOutput([cause instanceof Error ? cause.message : String(cause)]);
    } finally {
      setRunning(false);
    }
  }

  function checkWork() {
    if (!objective) {
      setPanel("tests");
      setOutput(["Select a curriculum objective first."]);
      return;
    }
    const text = objectiveText(objective);
    let evidence = code.trim().length >= 40;
    if (/function|procedure/.test(text)) evidence = /function\s+\w+\s*\(|=>/.test(code);
    else if (/selection/.test(text)) evidence = /\bif\s*\(/.test(code);
    else if (/loop|iteration|repetition/.test(text)) evidence = /\b(for|while)\s*\(/.test(code);
    setPanel("tests");
    setOutput([evidence ? "Evidence found for this objective." : "More evidence is needed for this objective.", "This is a learning check, not an official examination mark."]);
  }

  const commands: Array<{ id: CommandId; label: string; run: () => void }> = [
    { id: "run", label: "Run current file", run },
    { id: "save", label: "Save workspace", run: persist },
    { id: "new", label: "Create file", run: () => setNewFileOpen(true) },
    { id: "close", label: "Close current tab", run: () => current && closeFile(current.path) },
    { id: "reset", label: "Reset workspace", run: resetWorkspace },
    { id: "compact", label: "Toggle compact tabs", run: () => setCompactTabs((value) => !value) },
  ];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === "Escape") setPaletteOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (paletteOpen) window.setTimeout(() => paletteInput.current?.focus(), 0);
  }, [paletteOpen]);

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-[#080b11] text-slate-200">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f17] shadow-2xl lg:min-h-[calc(100vh-7rem)]">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-[#0d121b] px-3">
          <div className="flex min-w-0 items-center gap-2 font-semibold"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-white"><FileCode2 className="h-4 w-4" /></div><span className="hidden sm:inline">Comp Lab</span></div>
          <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex"><GitBranch className="h-3.5 w-3.5" />main · {experience.shortLabel}</div>
          <div className="ml-auto flex items-center gap-1">
            {saved && <span className="mr-1 hidden text-[10px] text-emerald-400 sm:inline">Saved locally</span>}
            <button type="button" onClick={() => setPaletteOpen(true)} title="Command palette" className="hidden rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200 sm:block"><Command className="h-4 w-4" /></button>
            <button type="button" onClick={() => setCompactTabs((value) => !value)} title="Toggle tab density" className="hidden rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200 lg:block"><Settings2 className="h-4 w-4" /></button>
            <button type="button" onClick={() => setMobileExplorer((value) => !value)} className="rounded-lg px-2 py-1.5 text-[10px] text-slate-400 hover:bg-white/5 lg:hidden">Explorer</button>
            <button type="button" onClick={persist} title="Save workspace" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200"><Save className="h-4 w-4" /></button>
            <button type="button" onClick={resetWorkspace} title="Reset workspace" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200"><RotateCcw className="h-4 w-4" /></button>
            <button type="button" onClick={run} disabled={running} className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"><Play className="h-3.5 w-3.5 fill-current" />{running ? "Running" : "Run"}</button>
          </div>
        </header>

        {mobileExplorer && <div className="border-b border-white/10 bg-[#0d121b] p-3 lg:hidden"><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Files & objectives</span><button onClick={() => setMobileExplorer(false)}><X className="h-4 w-4" /></button></div><div className="flex gap-2 overflow-x-auto pb-2">{files.map((file) => <button key={file.path} onClick={() => { setActive(file.path); setMobileExplorer(false); }} className={`shrink-0 rounded-lg border px-3 py-2 text-xs ${active === file.path ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-white/10"}`}>{file.path}{file.dirty ? " •" : ""}</button>)}</div><div className="flex gap-2 overflow-x-auto">{visibleObjectives.slice(0, 12).map((item) => <button key={item.id} onClick={() => { setSelectedObjective(item.id); setMobileExplorer(false); }} className={`shrink-0 rounded-lg border px-3 py-2 text-left text-xs ${selectedObjective === item.id ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-white/10"}`}>{item.objective_key} · {item.title}</button>)}</div></div>}

        <div className="grid min-h-0 flex-1 lg:grid-cols-[270px_minmax(0,1fr)_310px]">
          <aside className="hidden min-h-0 border-r border-white/10 bg-[#0d121b] lg:flex lg:flex-col">
            <div className="border-b border-white/10 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500"><span>Explorer</span><button onClick={() => setNewFileOpen(true)} title="New file"><Plus className="h-4 w-4" /></button></div>
              {files.map((file) => <div key={file.path} className={`group mb-1 flex items-center rounded-lg ${active === file.path ? "bg-white/[.06]" : "hover:bg-white/[.035]"}`}><button onClick={() => setActive(file.path)} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-sm"><FileCode2 className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{file.path}{file.dirty ? " •" : ""}</span></button><button onClick={() => closeFile(file.path)} className="mr-1 rounded p-1 opacity-0 group-hover:opacity-100" title="Close file"><X className="h-3 w-3" /></button></div>)}
            </div>
            <div className="min-h-0 flex-1">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500"><span>Objectives</span><span>{objectives.length}</span></div>
              <div className="border-b border-white/10 p-2"><div className="flex items-center gap-2 rounded-lg bg-white/[.035] px-2 py-2"><Search className="h-3.5 w-3.5 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search objectives" className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></div></div>
              {error && <div className="m-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] leading-4 text-amber-300">{error}</div>}
              <div className="h-[calc(100%-90px)] overflow-auto p-2">{visibleObjectives.map((item) => <button key={item.id} onClick={() => setSelectedObjective(item.id)} className={`mb-1 w-full rounded-xl p-3 text-left ${selectedObjective === item.id ? "bg-[var(--primary)]/15" : "hover:bg-white/[.035]"}`}><div className="font-mono text-[10px] text-slate-500">{item.objective_key}</div><div className="mt-1 text-xs">{item.title}</div><div className="mt-1 truncate text-[10px] text-slate-600">{item.topic ?? ""}</div></button>)}</div>
            </div>
          </aside>

          <section className="grid min-h-0 grid-rows-[42px_minmax(0,1fr)_190px]">
            <div className="flex min-w-0 items-stretch overflow-x-auto border-b border-white/10 bg-[#0a0e15] px-1 scrollbar-thin">
              {files.map((file) => <div key={file.path} draggable onDragStart={() => setDragPath(file.path)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragPath) moveTab(dragPath, file.path); setDragPath(null); }} className={`group flex shrink-0 items-center border-r border-white/10 ${compactTabs ? "min-w-[105px] max-w-[180px]" : "min-w-[145px] max-w-[260px]"} ${active === file.path ? "bg-[#0b0f17] text-slate-200" : "text-slate-500"}`}><button onClick={() => setActive(file.path)} className="flex min-w-0 flex-1 items-center gap-2 px-3 text-xs"><FileCode2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{file.path}</span>{file.dirty && <span className="text-[var(--primary)]">●</span>}</button><button onClick={() => closeFile(file.path)} className="mr-1 rounded p-1 opacity-0 transition group-hover:opacity-100 focus:opacity-100" title="Close tab"><X className="h-3 w-3" /></button></div>)}
              <button onClick={() => setNewFileOpen(true)} className="m-1 grid h-8 w-8 shrink-0 place-items-center rounded hover:bg-white/5" title="New file"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0"><CodeLabEditor key={active} value={code} language={current?.language ?? "javascript"} onChange={updateCurrent} onRun={run} onSave={persist} /></div>
            <div className="min-h-0 border-t border-white/10 bg-[#080b11]">
              <div className="flex h-9 items-center gap-5 overflow-x-auto border-b border-white/10 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{(["terminal", "problems", "tests", "output"] as Panel[]).map((item) => <button key={item} onClick={() => setPanel(item)} className={`h-full shrink-0 border-b-2 ${panel === item ? "border-[var(--primary)] text-slate-200" : "border-transparent"}`}>{item}{item === "problems" && diagnostics.length ? ` (${diagnostics.length})` : ""}</button>)}</div>
              <div className="h-[calc(100%-36px)] overflow-auto p-3 font-mono text-xs">
                {panel === "terminal" && (output.length ? output.map((line, index) => <div key={`${line}-${index}`} className="mb-1 text-slate-300">› {line}</div>) : <span className="text-slate-600">Run your program to see output here.</span>)}
                {panel === "problems" && (diagnostics.length ? diagnostics.map((item, index) => <div key={`${item.message}-${index}`} className="mb-2 text-red-300">{diagnosticText(item)}</div>) : <span className="text-slate-600">No runtime diagnostics.</span>)}
                {panel === "tests" && <div className="space-y-3"><button onClick={checkWork} className="rounded-lg border border-white/10 bg-white/[.035] px-3 py-2 text-xs text-slate-300 hover:bg-white/[.06]">Check selected objective</button><div className="text-slate-400">{output[0] ?? "Use the objective check as learning evidence, not official exam marking."}</div></div>}
                {panel === "output" && <pre className="whitespace-pre-wrap text-slate-400">{output.join("\n") || "No captured output."}</pre>}
              </div>
            </div>
          </section>

          <aside className="hidden min-h-0 border-l border-white/10 bg-[#0d121b] xl:flex xl:flex-col">
            <div className="border-b border-white/10 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-[var(--primary)]" />Coding companion</div><p className="mt-2 text-xs leading-5 text-slate-500">Workspace-aware assistance can use the current file, objective and execution evidence.</p></div>
            <div className="min-h-0 flex-1 overflow-auto p-4"><div className="rounded-2xl border border-white/10 p-4"><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Current objective</div>{objective ? <><div className="mt-2 font-mono text-[10px] text-[var(--primary)]">{objective.objective_key}</div><h3 className="mt-2 text-sm font-semibold text-slate-200">{objective.title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{objective.description ?? "No objective description is available."}</p><div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500"><CheckCircle2 className="h-3.5 w-3.5" />Learning evidence, not official marking</div></> : <p className="mt-2 text-xs text-slate-600">Choose an objective from Explorer.</p>}</div><button onClick={checkWork} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-xs text-slate-300 hover:bg-white/[.06]"><Terminal className="h-3.5 w-3.5" />Check my work</button><button onClick={() => setPaletteOpen(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-500 hover:text-slate-200"><Command className="h-3.5 w-3.5" />Command palette</button></div>
          </aside>
        </div>
      </div>

      {newFileOpen && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4" onMouseDown={() => setNewFileOpen(false)}><form onSubmit={(event) => { event.preventDefault(); addFile(); }} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d121b] p-5 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Create file</h2><p className="mt-1 text-xs text-slate-500">Use folders too, for example src/main.js</p></div><FolderPlus className="h-5 w-5 text-slate-500" /></div><input autoFocus value={newFileName} onChange={(event) => setNewFileName(event.target.value)} placeholder="src/main.js" className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-[var(--primary)]" /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setNewFileOpen(false)} className="rounded-lg px-3 py-2 text-xs text-slate-500">Cancel</button><button type="submit" className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white">Create</button></div></form></div>}

      {paletteOpen && <div className="fixed inset-0 z-[90] bg-black/60 p-4" onMouseDown={() => setPaletteOpen(false)}><div className="mx-auto mt-[12vh] w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d121b] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center gap-2 border-b border-white/10 px-4"><Command className="h-4 w-4 text-slate-500" /><input ref={paletteInput} placeholder="Type a command…" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" onKeyDown={(event) => { if (event.key === "Escape") setPaletteOpen(false); }} /></div><div className="p-2">{commands.map((command) => <button key={command.id} onClick={() => { command.run(); setPaletteOpen(false); }} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm hover:bg-white/[.05]"><span>{command.label}</span><ChevronDown className="h-3.5 w-3.5 rotate-[-90deg] text-slate-600" /></button>)}</div></div></div>}
    </div>
  );
}
