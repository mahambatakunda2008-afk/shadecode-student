"use client";

import { useMemo, useState } from "react";
import { Activity, GitBranch, Play, RotateCcw, Table2, Terminal, Zap } from "lucide-react";
import { executeCode } from "@/lib/code-lab/runtime";

type Tab = "editor" | "flowchart" | "trace" | "analysis";
type TraceRow = Record<string, string>;

const START = `// Find the largest of three numbers
INPUT A
INPUT B
INPUT C

Largest <- A
IF B > Largest THEN
    Largest <- B
END IF
IF C > Largest THEN
    Largest <- C
END IF

OUTPUT Largest`;

function analyse(code: string) {
  const lines = code.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const loops = lines.filter((line) => /^(FOR|WHILE|REPEAT)\b/i.test(line)).length;
  const nestedHint = /(?:FOR|WHILE|REPEAT)[\s\S]*(?:FOR|WHILE|REPEAT)/i.test(code);
  const hasInput = lines.some((line) => /^INPUT\b/i.test(line));
  const hasBranch = lines.some((line) => /^IF\b/i.test(line));
  const time = nestedHint ? "O(n²) or higher" : loops ? "O(n)" : "O(1)";
  return { lines: lines.length, loops, hasInput, hasBranch, time, space: /ARRAY|LIST|MATRIX/i.test(code) ? "O(n) estimated" : "O(1) estimated" };
}

function flowNodes(code: string) {
  const lines = code.split(/\r?\n/).map((line, index) => ({ line: line.trim(), number: index + 1 })).filter(({ line }) => line && !line.startsWith("//"));
  return lines.slice(0, 18).map(({ line, number }) => {
    const kind = /^(IF|WHILE|FOR|REPEAT)\b/i.test(line) ? "decision" : /^(INPUT|OUTPUT|PRINT)\b/i.test(line) ? "io" : "process";
    return { line, number, kind };
  });
}

function parseTrace(text: string): TraceRow[] {
  const marker = text.indexOf("TRACE TABLE");
  if (marker < 0) return [];
  const rows = text.slice(marker).split(/\r?\n/).filter((line) => line.trim().startsWith("|"));
  if (rows.length < 3) return [];
  const headers = rows[0].split("|").map((x) => x.trim()).filter(Boolean);
  return rows.slice(2).map((row) => row.split("|").map((x) => x.trim()).filter(Boolean)).map((cells) => Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? ""])));
}

export default function PseudocodeAlgorithmWorkbench() {
  const [code, setCode] = useState(START);
  const [inputs, setInputs] = useState("12\n7\n19");
  const [tab, setTab] = useState<Tab>("editor");
  const [output, setOutput] = useState("");
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const [testCases, setTestCases] = useState(1);
  const stats = useMemo(() => analyse(code), [code]);
  const nodes = useMemo(() => flowNodes(code), [code]);
  const trace = useMemo(() => parseTrace(output), [output]);

  async function run() {
    setRunning(true); setDiagnostics([]); setOutput("");
    try {
      const result = await executeCode({ id: crypto.randomUUID(), language: "pseudocode", code, entryFile: "main.pseudo", inputs: inputs.split(/\r?\n/).filter((x) => x.length > 0), timeoutMs: 5000 });
      const text = result.events.filter((event) => event.type === "stdout").map((event) => event.text).join("\n");
      setOutput(text || (result.exitCode === 0 ? "Algorithm completed with no output." : "Algorithm failed."));
      setDiagnostics(result.diagnostics.map((item) => `Line ${item.line ?? "?"}: ${item.message}`));
      setLastRun(result.durationMs); setTab(result.diagnostics.length ? "editor" : "trace");
    } catch (error) { setDiagnostics([error instanceof Error ? error.message : String(error)]); }
    finally { setRunning(false); }
  }

  function reset() { setCode(START); setInputs("12\n7\n19"); setOutput(""); setDiagnostics([]); setTab("editor"); }

  const tabs: Array<[Tab, string, typeof Terminal]> = [["editor", "Algorithm", Terminal], ["flowchart", "Flowchart", GitBranch], ["trace", "Trace table", Table2], ["analysis", "Analysis", Activity]];
  return <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f17] text-slate-200 shadow-xl">
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#0d121b] p-2">
      <div className="mr-2 flex items-center gap-2 px-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary)] text-white"><Zap className="h-4 w-4" /></div><div><div className="text-xs font-semibold">Algorithm Workbench</div><div className="text-[9px] text-slate-500">Pseudocode · Flowchart · Trace · Complexity</div></div></div>
      {tabs.map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] ${tab === id ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
      <div className="ml-auto flex gap-1"><button type="button" onClick={reset} className="rounded-lg p-2 text-slate-500 hover:bg-white/5" title="Reset"><RotateCcw className="h-3.5 w-3.5" /></button><button type="button" onClick={run} disabled={running} className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50"><Play className="h-3.5 w-3.5" />{running ? "Running" : "Run algorithm"}</button></div>
    </div>

    {tab === "editor" && <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 border-b border-white/10 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between border-b border-white/10 px-3 py-2"><span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">main.pseudo</span><span className="text-[9px] text-slate-600">{stats.lines} lines</span></div><textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} className="min-h-[440px] w-full resize-y bg-[#080b11] p-4 font-mono text-[13px] leading-6 text-slate-200 outline-none" /></div>
      <aside className="bg-[#0a0e15] p-4"><label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Test input</label><p className="mt-1 text-[10px] leading-4 text-slate-600">One INPUT value per line, consumed in order.</p><textarea value={inputs} onChange={(e) => setInputs(e.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-xs outline-none" /><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg border border-white/10 p-3"><div className="text-lg font-semibold">{stats.loops}</div><div className="text-[9px] text-slate-500">loop blocks</div></div><div className="rounded-lg border border-white/10 p-3"><div className="text-lg font-semibold">{stats.hasBranch ? "Yes" : "No"}</div><div className="text-[9px] text-slate-500">selection</div></div></div><div className="mt-3 rounded-lg border border-white/10 bg-black/10 p-3 text-[10px] leading-5 text-slate-500">Common Cambridge/ZIMSEC-style constructs are accepted, including SET/&lt;-, INPUT, OUTPUT, IF, FOR, WHILE and REPEAT.</div></aside>
    </div>}

    {tab === "flowchart" && <div className="overflow-auto bg-[#080b11] p-6"><div className="mx-auto flex max-w-xl flex-col items-center gap-2">{nodes.map((node, index) => <div key={`${node.number}-${index}`} className="flex w-full max-w-md flex-col items-center"><div className={`w-full border px-4 py-3 text-center text-xs ${node.kind === "decision" ? "rounded-xl border-amber-400/30 bg-amber-400/5" : node.kind === "io" ? "rounded-full border-sky-400/30 bg-sky-400/5" : "rounded-lg border-white/10 bg-white/[0.03]"}`}><span className="mr-2 text-[9px] text-slate-600">{node.number}</span>{node.line}</div>{index < nodes.length - 1 && <div className="h-5 w-px bg-white/15" />}</div>)}{nodes.length === 0 && <div className="py-16 text-sm text-slate-500">Write pseudocode to generate the flowchart.</div>}</div><p className="mx-auto mt-5 max-w-xl text-center text-[10px] text-slate-600">This first flowchart view is generated from the algorithm structure. A future version can allow direct node editing and round-trip conversion.</p></div>}

    {tab === "trace" && <div className="min-h-[440px] overflow-auto bg-[#080b11] p-4">{trace.length ? <table className="w-full border-collapse text-left text-[11px]"><thead><tr>{Object.keys(trace[0]).map((key) => <th key={key} className="border-b border-white/10 px-3 py-2 text-[9px] uppercase tracking-wider text-slate-500">{key}</th>)}</tr></thead><tbody>{trace.map((row, i) => <tr key={i} className="border-b border-white/5">{Object.values(row).map((value, j) => <td key={j} className="px-3 py-2 font-mono text-slate-300">{value}</td>)}</tr>)}</tbody></table> : <div className="grid min-h-[400px] place-items-center text-sm text-slate-600">Run the algorithm to generate a trace table.</div>}<div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[10px] text-slate-500">Trace rows capture the state after each executable statement. This makes loop and selection behaviour inspectable instead of hiding it in a terminal dump.</div></div>}

    {tab === "analysis" && <div className="grid min-h-[440px] gap-4 bg-[#080b11] p-5 sm:grid-cols-2"><div className="space-y-3"><div className="rounded-xl border border-white/10 p-4"><div className="text-[9px] uppercase tracking-widest text-slate-500">Estimated time complexity</div><div className="mt-2 text-2xl font-semibold">{stats.time}</div><p className="mt-2 text-[10px] leading-5 text-slate-500">Static guidance based on detected loop structure. It is an estimate, not a formal proof of asymptotic complexity.</p></div><div className="rounded-xl border border-white/10 p-4"><div className="text-[9px] uppercase tracking-widest text-slate-500">Estimated space</div><div className="mt-2 text-xl font-semibold">{stats.space}</div></div></div><div className="rounded-xl border border-white/10 p-4"><div className="text-[9px] uppercase tracking-widest text-slate-500">Execution evidence</div><div className="mt-3 space-y-2 text-xs"><div className="flex justify-between"><span className="text-slate-500">Inputs</span><span>{stats.hasInput ? "Detected" : "None"}</span></div><div className="flex justify-between"><span className="text-slate-500">Selection</span><span>{stats.hasBranch ? "Detected" : "None"}</span></div><div className="flex justify-between"><span className="text-slate-500">Test cases</span><span>{testCases}</span></div><div className="flex justify-between"><span className="text-slate-500">Last run</span><span>{lastRun === null ? "Not run" : `${lastRun} ms`}</span></div></div><button type="button" onClick={() => setTestCases((value) => value + 1)} className="mt-5 rounded-lg border border-white/10 px-3 py-2 text-[10px] text-slate-400 hover:bg-white/5">Record another test case</button></div></div>}

    {(output || diagnostics.length > 0) && <div className="border-t border-white/10 bg-[#0a0e15] p-3"><div className="mb-2 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-widest text-slate-500"><Terminal className="h-3 w-3" />Run output</div>{diagnostics.map((item, i) => <div key={i} className="mb-1 rounded bg-red-500/10 px-2 py-1 text-[10px] text-red-300">{item}</div>)}{output && <pre className="max-h-44 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-slate-400">{output}</pre>}</div>}
  </div>;
}
