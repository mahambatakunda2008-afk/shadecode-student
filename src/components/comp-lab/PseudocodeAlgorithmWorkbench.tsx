"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowDown, CheckCircle2, GitBranch, Play, RotateCcw, Table2, Terminal, TestTube2, XCircle, Zap } from "lucide-react";
import { executeCode } from "@/lib/code-lab/runtime";

type Tab = "editor" | "flowchart" | "trace" | "analysis" | "tests";
type TraceRow = Record<string, string>;
type TestResult = { id: number; input: string; output: string; passed: boolean; duration: number; diagnostics: string[] };

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
  let depth = 0;
  let maxDepth = 0;
  let loopCount = 0;
  let recursive = false;
  for (const line of lines) {
    if (/^(FOR|WHILE|REPEAT)\b/i.test(line)) { loopCount += 1; depth += 1; maxDepth = Math.max(maxDepth, depth); }
    if (/^(END\s*FOR|ENDFOR|END\s*WHILE|ENDWHILE|UNTIL\b)/i.test(line)) depth = Math.max(0, depth - 1);
    if (/^(CALL\s+|FUNCTION\s+|PROCEDURE\s+)/i.test(line) && /\b([A-Za-z_]\w*)\b/i.test(line)) recursive = true;
  }
  const arrayLike = /\[[^\]]*\]|\b(ARRAY|LIST|MATRIX|LENGTH)\b/i.test(code);
  const time = maxDepth >= 3 ? "O(n³) or higher" : maxDepth === 2 ? "O(n²)" : loopCount ? "O(n)" : recursive ? "O(log n) or O(n)" : "O(1)";
  return {
    lines: lines.length,
    loops: loopCount,
    maxDepth,
    hasInput: lines.some((line) => /^INPUT\b/i.test(line)),
    hasBranch: lines.some((line) => /^(IF|CASE)\b/i.test(line)),
    hasArrays: arrayLike,
    hasFunctions: lines.some((line) => /^(FUNCTION|PROCEDURE|CALL)\b/i.test(line)),
    time,
    space: arrayLike ? "O(n) estimated" : "O(1) estimated",
  };
}

function flowNodes(code: string) {
  const lines = code.split(/\r?\n/).map((line, index) => ({ line: line.trim(), number: index + 1 })).filter(({ line }) => line && !line.startsWith("//"));
  return lines.slice(0, 40).map(({ line, number }) => {
    const decision = /^(IF|WHILE|FOR|REPEAT|CASE)\b/i.test(line);
    const end = /^(END\s*(IF|WHILE|FOR|CASE)|ENDIF|ENDWHILE|ENDFOR|ENDCASE|UNTIL\b)/i.test(line);
    const io = /^(INPUT|OUTPUT|PRINT)\b/i.test(line);
    const terminal = /^(RETURN|END)$/i.test(line);
    return { line, number, kind: terminal ? "terminal" : end ? "end" : decision ? "decision" : io ? "io" : "process" } as const;
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

function splitTests(raw: string) {
  const groups = raw.split(/\n\s*\n/).map((group) => group.split(/\r?\n/).filter((x) => x.trim().length > 0));
  return groups.length ? groups : [[]];
}

export default function PseudocodeAlgorithmWorkbench() {
  const [code, setCode] = useState(START);
  const [inputs, setInputs] = useState("12\n7\n19\n\n5\n18\n11\n\n3\n3\n2");
  const [tab, setTab] = useState<Tab>("editor");
  const [output, setOutput] = useState("");
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const [tests, setTests] = useState<TestResult[]>([]);
  const stats = useMemo(() => analyse(code), [code]);
  const nodes = useMemo(() => flowNodes(code), [code]);
  const trace = useMemo(() => parseTrace(output), [output]);
  const testGroups = useMemo(() => splitTests(inputs), [inputs]);

  async function run() {
    setRunning(true); setDiagnostics([]); setOutput("");
    const started = performance.now();
    const results: TestResult[] = [];
    try {
      for (let index = 0; index < testGroups.length; index += 1) {
        const group = testGroups[index];
        const result = await executeCode({ id: crypto.randomUUID(), language: "pseudocode", code, entryFile: "main.pseudo", inputs: group, timeoutMs: 5000 });
        const text = result.events.filter((event) => event.type === "stdout").map((event) => event.text).join("\n");
        const errors = result.diagnostics.map((item) => `Line ${item.line ?? "?"}: ${item.message}`);
        results.push({ id: index + 1, input: group.join(" | "), output: text || (result.exitCode === 0 ? "No output" : "Failed"), passed: result.exitCode === 0 && result.diagnostics.length === 0, duration: result.durationMs, diagnostics: errors });
        if (index === 0) { setOutput(text || (result.exitCode === 0 ? "Algorithm completed with no output." : "Algorithm failed.")); setDiagnostics(errors); }
      }
      setTests(results); setLastRun(Math.round(performance.now() - started)); setTab(results.some((item) => !item.passed) ? "tests" : "trace");
    } catch (error) { setDiagnostics([error instanceof Error ? error.message : String(error)]); }
    finally { setRunning(false); }
  }

  function reset() { setCode(START); setInputs("12\n7\n19\n\n5\n18\n11\n\n3\n3\n2"); setOutput(""); setDiagnostics([]); setTests([]); setTab("editor"); }

  const tabs: Array<[Tab, string, typeof Terminal]> = [["editor", "Algorithm", Terminal], ["flowchart", "Flowchart", GitBranch], ["trace", "Trace table", Table2], ["analysis", "Analysis", Activity], ["tests", "Test cases", TestTube2]];
  return <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f17] text-slate-200 shadow-xl">
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#0d121b] p-2">
      <div className="mr-2 flex items-center gap-2 px-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary)] text-white"><Zap className="h-4 w-4" /></div><div><div className="text-xs font-semibold">Algorithm Workbench</div><div className="text-[9px] text-slate-500">Pseudocode · Flowchart · Trace · Tests · Complexity</div></div></div>
      {tabs.map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] ${tab === id ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
      <div className="ml-auto flex gap-1"><button type="button" onClick={reset} className="rounded-lg p-2 text-slate-500 hover:bg-white/5" title="Reset"><RotateCcw className="h-3.5 w-3.5" /></button><button type="button" onClick={run} disabled={running} className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50"><Play className="h-3.5 w-3.5" />{running ? "Running" : `Run ${testGroups.length} test${testGroups.length === 1 ? "" : "s"}`}</button></div>
    </div>

    {tab === "editor" && <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 border-b border-white/10 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between border-b border-white/10 px-3 py-2"><span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">main.pseudo</span><span className="text-[9px] text-slate-600">{stats.lines} lines</span></div><textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} className="min-h-[440px] w-full resize-y bg-[#080b11] p-4 font-mono text-[13px] leading-6 text-slate-200 outline-none" /></div>
      <aside className="bg-[#0a0e15] p-4"><label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Test inputs</label><p className="mt-1 text-[10px] leading-4 text-slate-600">One INPUT value per line. Separate test cases with a blank line.</p><textarea value={inputs} onChange={(e) => setInputs(e.target.value)} className="mt-2 min-h-36 w-full rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-xs leading-5 outline-none" /><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-lg border border-white/10 p-2"><div className="text-lg font-semibold">{testGroups.length}</div><div className="text-[9px] text-slate-500">test cases</div></div><div className="rounded-lg border border-white/10 p-2"><div className="text-lg font-semibold">{stats.loops}</div><div className="text-[9px] text-slate-500">loop blocks</div></div><div className="rounded-lg border border-white/10 p-2"><div className="text-lg font-semibold">{stats.maxDepth}</div><div className="text-[9px] text-slate-500">loop depth</div></div></div><div className="mt-3 rounded-lg border border-white/10 bg-black/10 p-3 text-[10px] leading-5 text-slate-500">Supports board-neutral algorithm practice plus common Cambridge/ZIMSEC-style constructs: SET/&lt;-, INPUT, OUTPUT, IF, CASE, FOR, WHILE, REPEAT, arrays, procedures and functions.</div></aside>
    </div>}

    {tab === "flowchart" && <div className="overflow-auto bg-[#080b11] p-6"><div className="mx-auto flex max-w-xl flex-col items-center">{nodes.map((node, index) => <div key={`${node.number}-${index}`} className="flex w-full flex-col items-center"><div className={`relative w-full max-w-md border px-4 py-3 text-center text-xs ${node.kind === "decision" ? "rotate-0 rounded-[22px] border-amber-400/30 bg-amber-400/5" : node.kind === "io" ? "rounded-full border-sky-400/30 bg-sky-400/5" : node.kind === "terminal" ? "rounded-full border-emerald-400/30 bg-emerald-400/5" : node.kind === "end" ? "rounded-lg border-white/5 bg-white/[0.015] text-slate-600" : "rounded-lg border-white/10 bg-white/[0.03]"}`}><span className="mr-2 text-[9px] text-slate-600">{node.number}</span>{node.line}{node.kind === "decision" && <span className="absolute -right-1 -top-1 rounded bg-amber-400/10 px-1.5 py-0.5 text-[8px] text-amber-300">decision / loop</span>}</div>{index < nodes.length - 1 && <><div className="h-4 w-px bg-white/15" /><ArrowDown className="h-3 w-3 -mt-1 text-white/20" /></>}</div>)}{nodes.length === 0 && <div className="py-16 text-sm text-slate-500">Write pseudocode to generate the flowchart.</div>}</div><div className="mx-auto mt-6 max-w-xl rounded-xl border border-white/10 bg-white/[0.02] p-4 text-[10px] leading-5 text-slate-500"><strong className="text-slate-300">Flowchart semantics:</strong> input/output statements are I/O nodes, decisions and loops are highlighted, terminal statements are end nodes, and closing statements are shown as structural markers. The source remains the canonical artifact so edits never silently diverge.</div></div>}

    {tab === "trace" && <div className="min-h-[440px] overflow-auto bg-[#080b11] p-4">{trace.length ? <><table className="w-full border-collapse text-left text-[11px]"><thead><tr>{Object.keys(trace[0]).map((key) => <th key={key} className="border-b border-white/10 px-3 py-2 text-[9px] uppercase tracking-wider text-slate-500">{key}</th>)}</tr></thead><tbody>{trace.map((row, i) => <tr key={i} className="border-b border-white/5">{Object.values(row).map((value, j) => <td key={j} className="px-3 py-2 font-mono text-slate-300">{value}</td>)}</tr>)}</tbody></table><div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[10px] text-slate-500">Trace rows capture state after each executable statement. Use them to inspect loop counters, selection branches and changing variables.</div></> : <div className="grid min-h-[400px] place-items-center text-sm text-slate-600">Run the algorithm to generate a trace table.</div>}</div>}

    {tab === "analysis" && <div className="grid min-h-[440px] gap-4 bg-[#080b11] p-5 sm:grid-cols-2"><div className="space-y-3"><div className="rounded-xl border border-white/10 p-4"><div className="text-[9px] uppercase tracking-widest text-slate-500">Estimated time complexity</div><div className="mt-2 text-2xl font-semibold">{stats.time}</div><p className="mt-2 text-[10px] leading-5 text-slate-500">Static educational guidance from detected control structure. It is not a formal proof.</p></div><div className="rounded-xl border border-white/10 p-4"><div className="text-[9px] uppercase tracking-widest text-slate-500">Estimated space</div><div className="mt-2 text-xl font-semibold">{stats.space}</div><p className="mt-2 text-[10px] text-slate-600">Arrays/lists and matrix-like constructs raise the estimate.</p></div></div><div className="rounded-xl border border-white/10 p-4"><div className="text-[9px] uppercase tracking-widest text-slate-500">Algorithm evidence</div><div className="mt-3 space-y-2 text-xs"><div className="flex justify-between"><span className="text-slate-500">Input</span><span>{stats.hasInput ? "Detected" : "None"}</span></div><div className="flex justify-between"><span className="text-slate-500">Selection</span><span>{stats.hasBranch ? "Detected" : "None"}</span></div><div className="flex justify-between"><span className="text-slate-500">Arrays / lists</span><span>{stats.hasArrays ? "Detected" : "None"}</span></div><div className="flex justify-between"><span className="text-slate-500">Procedures / functions</span><span>{stats.hasFunctions ? "Detected" : "None"}</span></div><div className="flex justify-between"><span className="text-slate-500">Maximum loop depth</span><span>{stats.maxDepth}</span></div><div className="flex justify-between"><span className="text-slate-500">Last run</span><span>{lastRun === null ? "Not run" : `${lastRun} ms`}</span></div></div></div></div>}

    {tab === "tests" && <div className="min-h-[440px] overflow-auto bg-[#080b11] p-5"><div className="mb-4 flex items-center justify-between"><div><div className="text-sm font-semibold">Test case results</div><div className="text-[10px] text-slate-600">Blank lines in the input panel define independent cases.</div></div>{tests.length > 0 && <div className="text-xs"><span className="text-emerald-400">{tests.filter((item) => item.passed).length} passed</span><span className="mx-2 text-slate-700">/</span><span className="text-red-400">{tests.filter((item) => !item.passed).length} failed</span></div>}</div>{tests.length ? <div className="space-y-2">{tests.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><div className="flex items-center gap-3"><div className={`grid h-7 w-7 place-items-center rounded-full ${item.passed ? "bg-emerald-500/10" : "bg-red-500/10"}`}>{item.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}</div><div className="min-w-0 flex-1"><div className="text-xs font-semibold">Case {item.id}</div><div className="truncate font-mono text-[10px] text-slate-600">Input: {item.input || "none"}</div></div><span className="text-[10px] text-slate-600">{item.duration} ms</span></div><div className="mt-3 rounded-lg bg-black/20 p-3 font-mono text-[10px] text-slate-300">{item.output}</div>{item.diagnostics.map((message) => <div key={message} className="mt-2 rounded bg-red-500/10 px-2 py-1 text-[10px] text-red-300">{message}</div>)}</div>)}</div> : <div className="grid min-h-[340px] place-items-center text-sm text-slate-600">Run the algorithm to evaluate your test cases.</div>}</div>}

    {(output || diagnostics.length > 0) && <div className="border-t border-white/10 bg-[#0a0e15] p-3"><div className="mb-2 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-widest text-slate-500"><Terminal className="h-3 w-3" />First test output</div>{diagnostics.map((item, i) => <div key={i} className="mb-1 rounded bg-red-500/10 px-2 py-1 text-[10px] text-red-300">{item}</div>)}{output && <pre className="max-h-44 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-slate-400">{output}</pre>}</div>}
  </div>;
}
