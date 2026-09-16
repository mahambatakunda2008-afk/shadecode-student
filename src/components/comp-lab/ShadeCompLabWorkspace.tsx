"use client";

import { useMemo, useState } from "react";
import { Braces, Play, RotateCcw, ShieldCheck, Terminal, Workflow, Bug, ChevronRight } from "lucide-react";
import { executeCode, type RuntimeResult } from "@/lib/code-lab/runtime";
import ShadeInspector from "./ShadeInspector";

const STARTER = `show "Hello from Shade"

let total = sum([10, 20, 30])
show total

if total > 50
  show "The total is greater than 50"
else
  show "The total is 50 or less"
end`;
function id() { return `shade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

type ExecutionPlan = { capabilityPolicy?: { requested: number; allowed: number; blocked: number }; privacy?: string; deterministic?: boolean };
type IRInstruction = { id: number; op: string; args: string[]; line: number };

export default function ShadeCompLabWorkspace() {
  const [code, setCode] = useState(STARTER);
  const [result, setResult] = useState<RuntimeResult | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const stdout = useMemo(() => result?.events.filter(e => e.type === "stdout").map(e => e.type === "stdout" ? e.text : "") ?? [], [result]);
  const lines = useMemo(() => code.split("\n"), [code]);
  const semantic = result?.metadata?.semantic as { symbols?: unknown[]; capabilities?: string[]; concepts?: unknown[] } | undefined;
  const project = result?.metadata?.project as { manifest?: { artifacts?: unknown[]; entry?: string; runtime?: { version?: string } } } | undefined;
  const ir = result?.metadata?.ir as { instructions?: IRInstruction[] } | undefined;
  const plan = result?.metadata?.executionPlan as ExecutionPlan | undefined;
  const selectedInstructions = useMemo(() => {
    if (selectedLine == null) return [];
    return ir?.instructions?.filter(instruction => instruction.line === selectedLine) ?? [];
  }, [ir, selectedLine]);

  async function run() {
    setRunning(true);
    try { setResult(await executeCode({ id: id(), language: "shade", code, entryFile: "main.shade", timeoutMs: 5000 })); } finally { setRunning(false); }
  }
  function reset() { setCode(STARTER); setResult(null); setSelectedLine(null); }

  return <div className="mx-auto grid min-h-[760px] w-full max-w-[1700px] gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,520px)]">
    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface)]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[var(--card-border)] px-3 py-2"><div className="flex min-w-0 flex-1 items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary-glow)] text-[var(--primary)]"><Braces className="h-4 w-4" /></div><div><p className="text-xs font-semibold text-[var(--foreground)]">main.shade</p><p className="text-[10px] text-[var(--muted-foreground)]">Shade design-core runtime</p></div></div><button type="button" onClick={run} disabled={running} className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Play className="h-3.5 w-3.5" />{running ? "Running…" : "Run Shade"}</button><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]"><RotateCcw className="h-3.5 w-3.5" />Reset</button></header>
      <div className="grid min-h-0 flex-1 lg:grid-rows-[minmax(0,1fr)_180px]"><div className="relative min-h-[460px] bg-[#0b0f16]"><textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false} aria-label="Shade source editor" className="h-full min-h-[460px] w-full resize-none bg-transparent p-5 font-mono text-sm leading-6 text-slate-100 outline-none"/><div className="pointer-events-none absolute right-3 top-3 rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-[9px] text-slate-500">Source ↔ IR mapping is available after Run</div></div><div className="overflow-auto border-t border-[var(--card-border)] bg-[#080b11] p-4 font-mono text-xs text-slate-300"><div className="mb-2 flex items-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-wider text-slate-500"><Terminal className="h-3.5 w-3.5"/>Output</div>{stdout.length ? stdout.map((line,i) => <div key={`${line}-${i}`} className="whitespace-pre-wrap">{line}</div>) : <span className="text-slate-600">Run the program to see stdout.</span>}</div></div>
    </section>
    <aside className="space-y-3"><section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><div className="flex items-center gap-2"><Workflow className="h-4 w-4 text-[var(--primary)]"/><h2 className="text-sm font-semibold text-[var(--foreground)]">Runtime summary</h2></div><div className="mt-3 grid grid-cols-2 gap-2"><Metric label="Symbols" value={semantic?.symbols?.length ?? 0}/><Metric label="Concepts" value={semantic?.concepts?.length ?? 0}/><Metric label="Capabilities" value={semantic?.capabilities?.length ?? 0}/><Metric label="IR instructions" value={ir?.instructions?.length ?? 0}/></div></section><section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><div className="flex items-center gap-2"><Bug className="h-4 w-4 text-[var(--primary)]"/><h2 className="text-sm font-semibold text-[var(--foreground)]">Source debugger</h2></div><p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Select a source line to inspect the IR generated from that statement, including nested expressions.</p><div className="mt-3 max-h-52 space-y-1 overflow-auto rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)] p-1">{lines.map((source, index) => { const line = index + 1; const count = ir?.instructions?.filter(instruction => instruction.line === line).length ?? 0; return <button key={line} type="button" onClick={() => setSelectedLine(line)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-[10px] ${selectedLine === line ? "bg-[var(--primary-glow)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--surface)]"}`}><span className="w-5 text-right text-[9px] opacity-50">{line}</span><ChevronRight className="h-3 w-3 opacity-50"/><span className="min-w-0 flex-1 truncate">{source || " "}</span><span className="rounded bg-black/10 px-1.5 py-0.5 text-[9px]">{count} IR</span></button>; })}</div>{selectedLine != null && <div className="mt-3 rounded-xl border border-[var(--card-border)] bg-[#080b11] p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Line {selectedLine}</span><span className="text-[9px] text-slate-600">{selectedInstructions.length} instruction{selectedInstructions.length === 1 ? "" : "s"}</span></div>{selectedInstructions.length ? <div className="space-y-1">{selectedInstructions.map(instruction => <div key={instruction.id} className="rounded-lg bg-slate-900 px-2 py-1.5 font-mono text-[10px] text-slate-300"><span className="mr-2 text-slate-600">#{instruction.id}</span><span className="text-[var(--primary)]">{instruction.op}</span>{instruction.args.length ? <span className="text-slate-500"> {instruction.args.join(" ")}</span> : null}</div>)}</div> : <p className="text-[10px] text-slate-600">No runtime IR was generated for this line.</p>}</div>}</section><section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--primary)]"/><h2 className="text-sm font-semibold text-[var(--foreground)]">Capability policy</h2></div><p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Requirements are resolved separately from permissions.</p><div className="mt-3 grid grid-cols-3 gap-2"><Metric label="Requested" value={plan?.capabilityPolicy?.requested ?? 0}/><Metric label="Allowed" value={plan?.capabilityPolicy?.allowed ?? 0}/><Metric label="Blocked" value={plan?.capabilityPolicy?.blocked ?? 0}/></div><dl className="mt-3 space-y-2 text-xs"><Row label="Privacy" value={plan?.privacy ?? "local"}/><Row label="Deterministic" value={plan?.deterministic === false ? "no" : "yes"}/></dl></section><section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--primary)]"/><h2 className="text-sm font-semibold text-[var(--foreground)]">Project contract</h2></div><dl className="mt-3 space-y-2 text-xs"><Row label="Entry" value={project?.manifest?.entry ?? "main.shade"}/><Row label="Shade version" value={project?.manifest?.runtime?.version ?? "0.1.0-design-core"}/><Row label="Artifacts" value={String(project?.manifest?.artifacts?.length ?? 0)}/></dl></section>{result && <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><h2 className="text-sm font-semibold text-[var(--foreground)]">Execution</h2><div className="mt-3 space-y-2 text-xs"><Row label="Status" value={result.exitCode === 0 ? "completed" : "failed"}/><Row label="Exit code" value={String(result.exitCode)}/><Row label="Duration" value={`${Math.round(result.durationMs)} ms`}/><Row label="Diagnostics" value={String(result.diagnostics.length)}/></div>{result.diagnostics.length > 0 && <div className="mt-3 space-y-2">{result.diagnostics.map((d,i) => <div key={`${d.message}-${i}`} className="rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-xs text-red-600">{d.message}</div>)}</div>}</section>}<ShadeInspector result={result}/></aside>
  </div>;
}
function Metric({label,value}:{label:string;value:number}) { return <div className="rounded-xl bg-[var(--surface-muted)] p-3"><p className="text-[10px] text-[var(--muted-foreground)]">{label}</p><p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{value}</p></div>; }
function Row({label,value}:{label:string;value:string}) { return <div className="flex items-center justify-between gap-3"><dt className="text-[var(--muted-foreground)]">{label}</dt><dd className="font-medium text-[var(--foreground)]">{value}</dd></div>; }
