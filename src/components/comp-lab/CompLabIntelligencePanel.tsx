"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDot, Play, RefreshCw, Unlink2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { useUser } from "@/contexts/UserContext";
import { selectComputerScienceCurriculum } from "@/lib/academic/code-lab";
import { buildProjectGraph } from "@/lib/code-lab/project-graph";
import { buildObjectiveEvidenceChecks, evaluateObjectiveEvidence, type ObjectiveEvidenceResult } from "@/lib/code-lab/objective-evidence";
import { buildObjectiveTests } from "@/lib/code-lab/objective-tests";
import { runCodeLabTests, type CodeLabTestRun } from "@/lib/code-lab/testing";

type Objective = { id: string; objective_key: string; title: string; description: string | null; topic: string | null };
type WorkspaceFile = { path: string; content: string; language?: string };

const STORAGE_PREFIX = "shadecode:comp-lab:";

function sourceLanguage(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "py") return "python";
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "java") return "java";
  if (ext === "cs") return "csharp";
  if (ext === "vb") return "vbnet";
  if (ext === "c") return "c";
  if (["cpp", "cc", "cxx", "hpp"].includes(ext ?? "")) return "cpp";
  if (ext === "sql") return "sql";
  return "javascript";
}

function isProgrammingObjective(item: Objective) {
  return /(program|algorithm|function|procedure|selection|loop|iteration|debug|test|code|array|record|database|web|software|object-oriented|oop)/i.test(`${item.title} ${item.description ?? ""} ${item.topic ?? ""}`);
}

export default function CompLabIntelligencePanel() {
  const { profile } = useUser();
  const db = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);
  const storageKey = `${STORAGE_PREFIX}${profile?.id ?? "guest"}`;
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [active, setActive] = useState("");
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [evidence, setEvidence] = useState<ObjectiveEvidenceResult[]>([]);
  const [runtimeTests, setRuntimeTests] = useState<CodeLabTestRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const objective = objectives.find((item) => item.id === selectedId) ?? null;
  const graph = useMemo(() => buildProjectGraph(files.map(({ path, content }) => ({ path, content }))), [files]);

  function loadWorkspace() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) { setFiles([]); return; }
      const saved = JSON.parse(raw) as { files?: WorkspaceFile[]; active?: string };
      const next = Array.isArray(saved.files) ? saved.files.filter((file) => file && typeof file.path === "string" && typeof file.content === "string") : [];
      setFiles(next);
      setActive(typeof saved.active === "string" ? saved.active : next[0]?.path ?? "");
    } catch { setError("The saved workspace could not be inspected."); }
  }

  useEffect(() => { loadWorkspace(); }, [storageKey]);

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
        const { data: versions, error: versionError } = await db.from("curriculum_versions").select("id").eq("syllabus_id", syllabusId).eq("subject_id", subjectId).neq("status", "archived").order("created_at", { ascending: false }).limit(1);
        if (versionError) throw versionError;
        const versionId = versions?.[0]?.id;
        if (!versionId) return;
        const { data, error: objectiveError } = await db.from("curriculum_objectives").select("id,objective_key,title,description,topic").eq("curriculum_version_id", versionId).neq("status", "archived").order("objective_key");
        if (objectiveError) throw objectiveError;
        if (!cancelled) {
          const list = (data ?? []).filter(isProgrammingObjective) as Objective[];
          setObjectives(list);
          setSelectedId((current) => current || list[0]?.id || "");
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Curriculum intelligence could not load.");
      }
    }
    void loadObjectives();
    return () => { cancelled = true; };
  }, [db, profile?.curriculum_subjects]);

  function checkStructure() {
    if (!objective) return;
    setEvidence(evaluateObjectiveEvidence(buildObjectiveEvidenceChecks(objective), files.map(({ path, content }) => ({ path, content }))));
    setRuntimeTests(null);
  }

  async function runObjectiveTests() {
    if (!objective || !files.length) return;
    const entry = active || graph.entrypoints[0] || files[0].path;
    setBusy(true);
    setError(null);
    try {
      const language = sourceLanguage(entry) as Parameters<typeof runCodeLabTests>[0]["language"];
      const tests = buildObjectiveTests(objective);
      setRuntimeTests(await runCodeLabTests({ language, files: files.map(({ path, content }) => ({ path, content })), entryFile: entry, tests }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const graphProblems = graph.nodes.filter((node) => node.unresolvedImports.length).length + graph.cycles.length;
  const evidencePassed = evidence.filter((item) => item.status === "passed").length;

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[#0b0f17] text-slate-200" aria-label="Comp Lab workspace intelligence">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Workspace intelligence</div><div className="text-sm font-semibold">Graph · Evidence · Tests</div></div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={loadWorkspace} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200" title="Refresh workspace snapshot"><RefreshCw className="h-3.5 w-3.5" /></button>
          <span className={`rounded-full px-2 py-1 text-[10px] ${graphProblems ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"}`}>{graphProblems ? `${graphProblems} graph issue${graphProblems === 1 ? "" : "s"}` : "Graph healthy"}</span>
        </div>
      </div>

      <div className="grid gap-px bg-white/10 lg:grid-cols-3">
        <div className="bg-[#0a0e15] p-4">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500"><CircleDot className="h-3.5 w-3.5" />Project graph</div>
          <div className="mb-2 text-xs text-slate-400">{graph.nodes.length} files · {graph.edges.length} dependencies · {graph.entrypoints.length} entrypoints</div>
          <div className="space-y-1">{graph.entrypoints.slice(0, 4).map((path) => <button key={path} type="button" onClick={() => setActive(path)} className={`block w-full truncate rounded px-2 py-1 text-left font-mono text-[10px] ${active === path ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"}`}>{path}</button>)}</div>
          {graph.nodes.filter((node) => node.unresolvedImports.length).slice(0, 3).map((node) => <div key={node.path} className="mt-2 flex gap-1 text-[10px] text-amber-300"><Unlink2 className="h-3 w-3 shrink-0" />{node.path}: {node.unresolvedImports[0]}</div>)}
          {graph.cycles.length > 0 && <div className="mt-2 flex gap-1 text-[10px] text-red-300"><AlertTriangle className="h-3 w-3 shrink-0" />{graph.cycles.length} circular dependency path detected.</div>}
        </div>

        <div className="bg-[#0a0e15] p-4">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Objective evidence</div>
          <select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setEvidence([]); setRuntimeTests(null); }} className="mb-2 w-full rounded-lg border border-white/10 bg-[#101621] px-2 py-2 text-xs text-slate-200 outline-none">
            <option value="">Select curriculum objective</option>
            {objectives.map((item) => <option key={item.id} value={item.id}>{item.objective_key} · {item.title}</option>)}
          </select>
          <div className="mb-3 min-h-10 text-[10px] leading-4 text-slate-500">{objective?.description ?? "Select an objective to inspect the learner's source against curriculum evidence."}</div>
          <button type="button" disabled={!objective || !files.length} onClick={checkStructure} className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-40">Check source evidence</button>
          {evidence.length > 0 && <div className="mt-3 space-y-2">{evidence.map((item) => <div key={item.id} className="flex gap-2 text-[10px]"><span className={item.status === "passed" ? "text-emerald-400" : item.status === "failed" ? "text-amber-300" : "text-red-300"}>{item.status === "passed" ? "✓" : "!"}</span><span className="text-slate-400">{item.name}</span></div>)}<div className="text-[10px] text-slate-600">{evidencePassed}/{evidence.length} structural checks passed.</div></div>}
        </div>

        <div className="bg-[#0a0e15] p-4">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Executable tests</div>
          <div className="mb-3 text-[10px] leading-4 text-slate-600">Runtime tests execute only when a real provider exists. Structural evidence and runtime execution remain separate signals.</div>
          <button type="button" disabled={!objective || !files.length || busy} onClick={() => void runObjectiveTests()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Play className="h-3.5 w-3.5" />{busy ? "Running tests…" : "Run objective tests"}</button>
          {runtimeTests && <div className="mt-3 space-y-2"><div className="flex items-center justify-between text-[10px] text-slate-500"><span>{runtimeTests.passed} passed · {runtimeTests.failed} failed · {runtimeTests.errors} errors</span><span>{runtimeTests.durationMs}ms</span></div>{runtimeTests.results.map((result) => <div key={result.id} className="flex gap-2 text-[10px]"><CheckCircle2 className={`h-3 w-3 shrink-0 ${result.status === "passed" ? "text-emerald-400" : "text-amber-300"}`} /><span className="text-slate-400">{result.name}: {result.message}</span></div>)}</div>}
        </div>
      </div>

      {error && <div className="border-t border-white/10 px-4 py-2 text-[10px] text-amber-300">{error}</div>}
      <div className="border-t border-white/10 px-4 py-2 text-[9px] leading-4 text-slate-600">Evidence is deterministic learning feedback, not official ZIMSEC, Cambridge, university, or professional marking.</div>
    </section>
  );
}
