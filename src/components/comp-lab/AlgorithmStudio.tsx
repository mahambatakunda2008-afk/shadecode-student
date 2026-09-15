"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Check, Circle, Download, GitBranch, Play, Plus, RotateCcw, Save, Square, Trash2, Triangle, Upload, Workflow, X } from "lucide-react";
import { executeCode } from "@/lib/code-lab/runtime";

type NodeKind = "start" | "end" | "process" | "input" | "output" | "decision";
type FlowNode = { id: string; kind: NodeKind; text: string; x: number; y: number };
type TestCase = { id: string; input: string; expected: string };

type StudioState = { code: string; nodes: FlowNode[]; tests: TestCase[] };

const starter = `// Write your own algorithm here. There is no required exercise.\n// Use board-friendly pseudocode: INPUT, OUTPUT, IF, ELSE, FOR, WHILE, REPEAT, CASE.\n\nINPUT Number\nIF Number MOD 2 = 0 THEN\n    OUTPUT "Even"\nELSE\n    OUTPUT "Odd"\nEND IF`;

const kindLabel: Record<NodeKind, string> = { start: "Start", end: "End", process: "Process", input: "Input / Output", output: "Output", decision: "Decision" };
const kindIcon: Record<NodeKind, typeof Circle> = { start: Circle, end: Square, process: Square, input: ArrowDown, output: ArrowDown, decision: Triangle };

function uid(prefix = "node") { return `${prefix}-${crypto.randomUUID()}`; }

function inferKind(line: string, index: number, total: number): NodeKind {
  const s = line.trim().toUpperCase();
  if (index === 0) return "start";
  if (index === total - 1 || /^(RETURN|END)$/i.test(s)) return "end";
  if (/^(IF|WHILE|FOR|REPEAT|CASE)\b/i.test(s)) return "decision";
  if (/^(INPUT|OUTPUT|PRINT)\b/i.test(s)) return s.startsWith("INPUT") ? "input" : "output";
  return "process";
}

function nodesFromCode(code: string): FlowNode[] {
  const lines = code.split(/\r?\n/).map(x => x.replace(/\/\/.*$/, "").trim()).filter(Boolean).slice(0, 60);
  if (!lines.length) return [{ id: uid(), kind: "start", text: "START", x: 360, y: 40 }, { id: uid(), kind: "end", text: "END", x: 360, y: 180 }];
  const width = 760;
  return lines.map((line, i) => ({ id: uid(), kind: inferKind(line, i, lines.length), text: line, x: width / 2, y: 55 + i * 92 }));
}

function shapePath(kind: NodeKind) {
  if (kind === "decision") return "M 0 -34 L 92 0 L 0 34 L -92 0 Z";
  if (kind === "input" || kind === "output") return "M -92 -28 L 92 -28 L 74 28 L -110 28 Z";
  if (kind === "start" || kind === "end") return "M -92 0 A 92 28 0 1 0 92 0 A 92 28 0 1 0 -92 0";
  return "M -92 -30 Q -92 -38 -84 -38 L 84 -38 Q 92 -38 92 -30 L 92 30 Q 92 38 84 38 L -84 38 Q -92 38 -92 30 Z";
}

export default function AlgorithmStudio() {
  const [code, setCode] = useState(starter);
  const [nodes, setNodes] = useState<FlowNode[]>(() => nodesFromCode(starter));
  const [tests, setTests] = useState<TestCase[]>([{ id: uid("test"), input: "8", expected: "Even" }, { id: uid("test"), input: "7", expected: "Odd" }]);
  const [tab, setTab] = useState<"write" | "flow" | "trace" | "tests">("write");
  const [output, setOutput] = useState("");
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const canvas = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem("shadecode.comp-lab.algorithm-studio");
    if (!raw) return;
    try { const state = JSON.parse(raw) as StudioState; if (state.code) setCode(state.code); if (Array.isArray(state.nodes)) setNodes(state.nodes); if (Array.isArray(state.tests)) setTests(state.tests); } catch { /* ignore corrupted local draft */ }
  }, []);

  const traceRows = useMemo(() => {
    const marker = output.indexOf("TRACE TABLE");
    if (marker < 0) return [];
    const rows = output.slice(marker).split(/\r?\n/).filter(x => x.trim().startsWith("|"));
    if (rows.length < 3) return [];
    const headers = rows[0].split("|").map(x => x.trim()).filter(Boolean);
    return rows.slice(2).map(row => row.split("|").map(x => x.trim()).filter(Boolean)).map(cells => Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""])));
  }, [output]);

  function save() {
    localStorage.setItem("shadecode.comp-lab.algorithm-studio", JSON.stringify({ code, nodes, tests } satisfies StudioState));
    setSaved(true); setTimeout(() => setSaved(false), 1600);
  }

  function generateFlowchart() { setNodes(nodesFromCode(code)); setTab("flow"); }

  async function runAlgorithm() {
    setRunning(true); setDiagnostics([]); setOutput("");
    try {
      const result = await executeCode({ id: crypto.randomUUID(), language: "pseudocode", code, entryFile: "main.pseudo", inputs: [], timeoutMs: 5000 });
      const text = result.events.filter(e => e.type === "stdout").map(e => e.text).join("\n");
      setOutput(text || (result.exitCode === 0 ? "Algorithm completed with no output." : "Algorithm failed."));
      setDiagnostics(result.diagnostics.map(d => `Line ${d.line ?? "?"}: ${d.message}`));
      setTab(result.diagnostics.length ? "write" : "trace");
    } finally { setRunning(false); }
  }

  async function runTests() {
    setRunning(true); const messages: string[] = [];
    try {
      for (const test of tests) {
        const result = await executeCode({ id: crypto.randomUUID(), language: "pseudocode", code, entryFile: "main.pseudo", inputs: test.input.split(/\r?\n/), timeoutMs: 5000 });
        const actual = result.events.filter(e => e.type === "stdout").map(e => e.text).join("\n").replace(/\nTRACE TABLE[\s\S]*$/i, "").trim();
        messages.push(`${actual === test.expected.trim() ? "PASS" : "FAIL"} | input: ${test.input.replace(/\n/g, " / ")} | expected: ${test.expected} | actual: ${actual}`);
      }
      setOutput(messages.join("\n")); setTab("tests");
    } finally { setRunning(false); }
  }

  function addNode(kind: NodeKind) {
    setNodes(prev => [...prev, { id: uid(), kind, text: kindLabel[kind].toUpperCase(), x: 360, y: 70 + prev.length * 95 }]);
  }

  function updateNode(id: string, patch: Partial<FlowNode>) { setNodes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n)); }
  function removeNode(id: string) { setNodes(prev => prev.filter(n => n.id !== id)); }

  function startDrag(event: React.PointerEvent, node: FlowNode) {
    const rect = canvas.current?.getBoundingClientRect(); if (!rect) return;
    const sx = ((event.clientX - rect.left) / rect.width) * 760;
    const sy = ((event.clientY - rect.top) / rect.height) * 620;
    setDrag({ id: node.id, dx: node.x - sx, dy: node.y - sy });
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent) {
    if (!drag) return; const rect = canvas.current?.getBoundingClientRect(); if (!rect) return;
    const x = Math.max(110, Math.min(650, ((event.clientX - rect.left) / rect.width) * 760 + drag.dx));
    const y = Math.max(45, Math.min(575, ((event.clientY - rect.top) / rect.height) * 620 + drag.dy));
    updateNode(drag.id, { x, y });
  }

  function exportStudio() {
    const blob = new Blob([JSON.stringify({ version: 1, code, nodes, tests }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "algorithm-project.json"; a.click(); URL.revokeObjectURL(url);
  }

  function importStudio(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { try { const state = JSON.parse(String(reader.result)) as StudioState; if (state.code) setCode(state.code); if (state.nodes) setNodes(state.nodes); if (state.tests) setTests(state.tests); } catch { setDiagnostics(["Could not import that algorithm project."]); } }; reader.readAsText(file); event.target.value = "";
  }

  return <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[#090d14] text-slate-200 shadow-xl">
    <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-[#0d121b] p-2">
      <div className="mr-2 px-2"><div className="text-xs font-semibold">Algorithm Studio</div><div className="text-[9px] text-slate-500">Create · Run · Visualise · Trace · Test</div></div>
      {[ ["write", "Pseudocode"], ["flow", "Flowchart"], ["trace", "Trace"], ["tests", "Tests"] ].map(([id, label]) => <button key={id} onClick={() => setTab(id as typeof tab)} className={`rounded-lg px-3 py-2 text-[11px] ${tab === id ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5"}`}>{label}</button>)}
      <div className="ml-auto flex gap-1"><button onClick={save} title="Save locally" className="rounded-lg p-2 text-slate-500 hover:bg-white/5">{saved ? <Check className="h-4 w-4 text-emerald-400" /> : <Save className="h-4 w-4" />}</button><button onClick={exportStudio} title="Export project" className="rounded-lg p-2 text-slate-500 hover:bg-white/5"><Download className="h-4 w-4" /></button><label title="Import project" className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-white/5"><Upload className="h-4 w-4" /><input type="file" accept="application/json,.json" onChange={importStudio} className="hidden" /></label></div>
    </div>

    {tab === "write" && <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]"><section className="min-w-0 border-b border-white/10 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between border-b border-white/10 px-3 py-2"><span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">main.pseudo · your algorithm</span><div className="flex gap-1"><button onClick={generateFlowchart} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-slate-400 hover:bg-white/5"><Workflow className="h-3 w-3" />Build flowchart</button><button onClick={runAlgorithm} disabled={running} className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"><Play className="h-3 w-3" />{running ? "Running" : "Run"}</button></div></div><textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false} className="min-h-[500px] w-full resize-y bg-[#070a10] p-5 font-mono text-[13px] leading-6 text-slate-200 outline-none" /></section><aside className="p-4"><div className="rounded-xl border border-white/10 bg-white/[.02] p-4"><div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Build anything</div><p className="mt-2 text-xs leading-5 text-slate-400">This is a blank algorithm workspace, not an exercise picker. Start from scratch, edit the example, or import your own project.</p><div className="mt-3 flex flex-wrap gap-1">{["INPUT", "OUTPUT", "IF / ELSE", "FOR", "WHILE", "REPEAT", "CASE", "ARRAYS", "PROCEDURES"].map(x => <span key={x} className="rounded-full border border-white/10 px-2 py-1 text-[9px] text-slate-500">{x}</span>)}</div></div>{diagnostics.length > 0 && <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-[10px] leading-5 text-red-300">{diagnostics.map(x => <div key={x}>{x}</div>)}</div>}<div className="mt-3 rounded-xl border border-white/10 p-3"><div className="text-[9px] uppercase tracking-widest text-slate-600">Output</div><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-slate-400">{output || "Run your algorithm to see output and a generated trace."}</pre></div></aside></div>}

    {tab === "flow" && <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]"><section className="min-h-[650px] overflow-hidden border-b border-white/10 bg-[#070a10] lg:border-b-0 lg:border-r"><div className="flex items-center gap-2 border-b border-white/10 px-3 py-2"><span className="text-[10px] uppercase tracking-widest text-slate-500">Visual algorithm canvas</span><button onClick={generateFlowchart} className="ml-auto rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-slate-400">Regenerate from pseudocode</button></div><div className="overflow-auto p-3"><svg ref={canvas} viewBox="0 0 760 620" className="min-h-[610px] w-full min-w-[720px] touch-none" onPointerMove={moveDrag} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
      <defs><marker id="algorithm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
      {nodes.slice(0, -1).map((n, i) => { const next = nodes[i + 1]; return <line key={`edge-${n.id}`} x1={n.x} y1={n.y + 40} x2={next.x} y2={next.y - 40} stroke="currentColor" opacity=".3" strokeWidth="2" markerEnd="url(#algorithm-arrow)" />; })}
      {nodes.map(node => { const Icon = kindIcon[node.kind]; return <g key={node.id} transform={`translate(${node.x} ${node.y})`} className="cursor-move" onPointerDown={e => startDrag(e, node)}><path d={shapePath(node.kind)} fill="#101722" stroke="currentColor" strokeOpacity=".35" strokeWidth="2" /><foreignObject x="-78" y="-24" width="156" height="48"><div className="flex h-full items-center justify-center px-1 text-center font-mono text-[10px] text-slate-200">{node.text}</div></foreignObject><circle cx="-102" cy="-35" r="11" fill="#0b111a" stroke="currentColor" strokeOpacity=".25" /><foreignObject x="-112" y="-45" width="20" height="20"><div className="grid h-full place-items-center"><Icon className="h-3 w-3 text-slate-500" /></div></foreignObject></g>; })}
    </svg></div></section><aside className="p-4"><div className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Shapes</div><div className="mt-2 grid grid-cols-2 gap-2">{(Object.keys(kindLabel) as NodeKind[]).map(kind => <button key={kind} onClick={() => addNode(kind)} className="flex items-center gap-2 rounded-lg border border-white/10 p-2 text-left text-[10px] text-slate-400 hover:bg-white/5"><Plus className="h-3 w-3" />{kindLabel[kind]}</button>)}</div><div className="mt-4 text-[9px] font-semibold uppercase tracking-widest text-slate-500">Selected nodes</div><div className="mt-2 space-y-2">{nodes.map(node => <div key={node.id} className="rounded-lg border border-white/10 p-2"><select value={node.kind} onChange={e => updateNode(node.id, { kind: e.target.value as NodeKind })} className="w-full bg-transparent text-[10px] text-slate-300"><option value="start">Start</option><option value="end">End</option><option value="process">Process</option><option value="input">Input / Output</option><option value="output">Output</option><option value="decision">Decision</option></select><input value={node.text} onChange={e => updateNode(node.id, { text: e.target.value })} className="mt-1 w-full rounded border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-300 outline-none" /><button onClick={() => removeNode(node.id)} className="mt-1 text-[9px] text-red-400/70"><Trash2 className="mr-1 inline h-3 w-3" />Remove</button></div>)}</div></aside></div>}

    {tab === "trace" && <div className="min-h-[500px] overflow-auto bg-[#070a10] p-4">{traceRows.length ? <table className="w-full border-collapse text-left text-[11px]"><thead><tr>{Object.keys(traceRows[0]).map(k => <th key={k} className="border-b border-white/10 px-3 py-2 text-[9px] uppercase tracking-wider text-slate-500">{k}</th>)}</tr></thead><tbody>{traceRows.map((row, i) => <tr key={i} className="border-b border-white/5">{Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 font-mono text-slate-300">{v}</td>)}</tr>)}</tbody></table> : <div className="grid min-h-[460px] place-items-center text-xs text-slate-600">Run your algorithm to generate a real execution trace.</div>}</div>}

    {tab === "tests" && <div className="grid lg:grid-cols-[1fr_320px]"><section className="min-h-[500px] border-b border-white/10 bg-[#070a10] p-4 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between"><div><div className="text-sm font-semibold">Your test cases</div><div className="text-[10px] text-slate-500">Design normal, boundary and invalid inputs yourself.</div></div><button onClick={() => setTests(prev => [...prev, { id: uid("test"), input: "", expected: "" }])} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-[10px]"><Plus className="h-3 w-3" />Add test</button></div><div className="mt-4 space-y-2">{tests.map((test, i) => <div key={test.id} className="grid gap-2 rounded-xl border border-white/10 p-3 md:grid-cols-[80px_1fr_1fr_auto]"><span className="pt-2 text-[9px] uppercase tracking-widest text-slate-600">Case {i + 1}</span><textarea value={test.input} onChange={e => setTests(prev => prev.map(x => x.id === test.id ? { ...x, input: e.target.value } : x))} placeholder="Input" className="min-h-16 rounded-lg border border-white/10 bg-black/20 p-2 font-mono text-[10px] outline-none" /><textarea value={test.expected} onChange={e => setTests(prev => prev.map(x => x.id === test.id ? { ...x, expected: e.target.value } : x))} placeholder="Expected output" className="min-h-16 rounded-lg border border-white/10 bg-black/20 p-2 font-mono text-[10px] outline-none" /><button onClick={() => setTests(prev => prev.filter(x => x.id !== test.id))} className="self-start rounded p-2 text-slate-600 hover:text-red-400"><X className="h-4 w-4" /></button></div>)}</div><button onClick={runTests} disabled={running} className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-50"><Play className="h-3.5 w-3.5" />Run my tests</button></section><aside className="p-4"><div className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Test output</div><pre className="mt-3 whitespace-pre-wrap font-mono text-[10px] leading-5 text-slate-400">{output || "No test run yet."}</pre></aside></div>}

    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-[#0d121b] px-3 py-2 text-[9px] text-slate-600"><span>Student-created artifact</span><span>·</span><span>Board-neutral</span><span>·</span><span>Local draft</span><span className="ml-auto">{nodes.length} flow nodes · {tests.length} tests</span></div>
  </div>;
}
