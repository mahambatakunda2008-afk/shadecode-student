"use client";

import { AlertTriangle, ArrowDownLeft, Boxes, CircleDot, GitBranch, Network, Unlink2 } from "lucide-react";
import { buildProjectGraph, type ProjectGraph, type ProjectGraphLanguage } from "@/lib/code-lab/project-graph";

export type ProjectGraphPanelProps = {
  files: Array<{ path: string; content: string }>;
  activePath?: string;
  language?: ProjectGraphLanguage;
  onOpenFile?: (path: string) => void;
};

function label(graph: ProjectGraph) {
  const fileCount = graph.nodes.length;
  const edgeCount = graph.edges.length;
  return `${fileCount} ${fileCount === 1 ? "file" : "files"} · ${edgeCount} ${edgeCount === 1 ? "dependency" : "dependencies"}`;
}

export function ProjectGraphPanel({ files, activePath, language, onOpenFile }: ProjectGraphPanelProps) {
  const graph = buildProjectGraph(files, language ?? "unknown");
  const active = graph.nodes.find((node) => node.path === activePath);

  return (
    <section className="flex min-h-0 flex-col border-t border-white/10 bg-[#0a0e15]" aria-label="Project graph">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/10 px-3">
        <Network className="h-3.5 w-3.5 text-[var(--primary)]" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Project Graph</span>
        <span className="ml-auto text-[9px] text-slate-600">{label(graph)}</span>
      </div>
      <div className="grid min-h-0 gap-2 overflow-auto p-3 text-[10px] md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
          <div className="mb-2 flex items-center gap-2 font-semibold text-slate-300"><CircleDot className="h-3 w-3" />Entrypoints</div>
          {graph.entrypoints.length ? graph.entrypoints.map((path) => <button key={path} type="button" onClick={() => onOpenFile?.(path)} className="block w-full truncate rounded px-1 py-1 text-left font-mono text-slate-500 hover:bg-white/5 hover:text-slate-200">{path}</button>) : <div className="text-slate-600">No isolated entrypoint detected.</div>}
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
          <div className="mb-2 flex items-center gap-2 font-semibold text-slate-300"><GitBranch className="h-3 w-3" />Active file</div>
          {active ? <><div className="truncate font-mono text-slate-200">{active.path}</div><div className="mt-2 text-slate-600">Depends on {active.imports.length} file{active.imports.length === 1 ? "" : "s"}.</div>{active.imports.map((path) => <button key={path} type="button" onClick={() => onOpenFile?.(path)} className="mt-1 flex w-full items-center gap-1 truncate text-left font-mono text-slate-500 hover:text-slate-200"><ArrowDownLeft className="h-3 w-3 shrink-0" />{path}</button>)}</> : <div className="text-slate-600">Select a file.</div>}
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
          <div className="mb-2 flex items-center gap-2 font-semibold text-slate-300"><AlertTriangle className="h-3 w-3" />Graph health</div>
          <div className="flex items-center gap-2 text-slate-500"><Boxes className="h-3 w-3" />{graph.nodes.filter((node) => node.unresolvedImports.length === 0).length}/{graph.nodes.length} files resolve local imports</div>
          {graph.nodes.filter((node) => node.unresolvedImports.length).map((node) => <button key={node.path} type="button" onClick={() => onOpenFile?.(node.path)} className="mt-2 flex w-full items-center gap-1 truncate text-left font-mono text-amber-400/80 hover:text-amber-300"><Unlink2 className="h-3 w-3 shrink-0" />{node.path} · {node.unresolvedImports[0]}</button>)}
          {graph.cycles.length > 0 && <div className="mt-2 text-red-400/90">{graph.cycles.length} circular dependency path{graph.cycles.length === 1 ? "" : "s"} detected.</div>}
          {!graph.nodes.some((node) => node.unresolvedImports.length) && graph.cycles.length === 0 && <div className="mt-2 text-emerald-400/80">No local graph problems detected.</div>}
        </div>
      </div>
    </section>
  );
}
