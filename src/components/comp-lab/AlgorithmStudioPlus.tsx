"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, GitBranch, Play, Plus, Save, Trash2, Upload, Workflow, X } from "lucide-react";
import { executeCode } from "@/lib/code-lab/runtime";

type Kind = "start" | "end" | "process" | "input" | "output" | "decision";
type Node = { id: string; kind: Kind; text: string; x: number; y: number };
type Edge = { id: string; from: string; to: string; label?: string };
type Test = { id: string; input: string; expected: string };
type Project = { version: 2; code: string; nodes: Node[]; edges: Edge[]; tests: Test[] };

const starter = `// Your algorithm. Edit or replace everything below.\nINPUT Number\nIF Number MOD 2 = 0 THEN\n    OUTPUT "Even"\nELSE\n    OUTPUT "Odd"\nEND IF`;
const labels: Record<Kind, string> = { start: "START / END", end: "START / END", process: "PROCESS", input: "INPUT", output: "OUTPUT", decision: "DECISION" };
const colors: Record<Kind, string> = { start: "#22c55e", end: "#ef4444", process: "#60a5fa", input: "#a78bfa", output: "#a78bfa", decision: "#f59e0b" };
const uid = (p: string) => `${p}-${crypto.randomUUID()}`;

function infer(line: string, i: number, total: number): Kind {
  const s = line.trim().toUpperCase();
  if (i === 0 || /^(END|RETURN)\b/.test(s)) return i === 0 ? "start" : "end";
  if (/^(IF|WHILE|FOR|REPEAT|CASE)\b/.test(s)) return "decision";
  if (/^INPUT\b/.test(s)) return "input";
  if (/^(OUTPUT|PRINT)\b/.test(s)) return "output";
  return "process";
}
function nodesFromCode(code: string): Node[] {
  const lines = code.split(/\r?\n/).map(v => v.replace(/\/\/.*$/, "").trim()).filter(Boolean).slice(0, 80);
  if (!lines.length) return [{ id: uid("node"), kind: "start", text: "START", x: 380, y: 60 }, { id: uid("node"), kind: "end", text: "END", x: 380, y: 180 }];
  const nodes = lines.map((text, i) => ({ id: uid("node"), kind: infer(text, i, lines.length), text, x: 380, y: 55 + i * 88 }));
  return nodes;
}
function edgesFromCode(code: string, nodes: Node[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) edges.push({ id: uid("edge"), from: nodes[i].id, to: nodes[i + 1].id });
  const lines = code.split(/\r?\n/).map(v => v.trim().toUpperCase());
  const decisions = nodes.filter(n => n.kind === "decision");
  decisions.forEach((d) => {
    const index = nodes.findIndex(n => n.id === d.id);
    const line = lines[index] ?? "";
    if (/^IF\b/.test(line)) {
      const elseIndex = lines.findIndex((v, i) => i > index && /^ELSE$/.test(v));
      const endIndex = lines.findIndex((v, i) => i > index && /^(END IF|ENDIF)$/.test(v));
      if (elseIndex > index && nodes[elseIndex + 1]) edges.push({ id: uid("edge"), from: d.id, to: nodes[elseIndex + 1].id, label: "FALSE" });
      if (nodes[index + 1]) edges.push({ id: uid("edge"), from: d.id, to: nodes[index + 1].id, label: "TRUE" });
      if (endIndex > index && nodes[endIndex + 1] && elseIndex < 0) edges.push({ id: uid("edge"), from: d.id, to: nodes[endIndex + 1].id, label: "FALSE" });
    }
  });
  return edges.filter((e, i, a) => a.findIndex(x => x.from === e.from && x.to === e.to && x.label === e.label) === i);
}
function shape(kind: Kind) {
  if (kind === "decision") return "M 0 -38 L 108 0 L 0 38 L -108 0 Z";
  if (kind === "input" || kind === "output") return "M -96 -30 L 96 -30 L 76 30 L -116 30 Z";
  if (kind === "start" || kind === "end") return "M -96 0 A 96 30 0 1 0 96 0 A 96 30 0 1 0 -96 0";
  return "M -96 -32 Q -96 -40 -86 -40 L 86 -40 Q 96 -40 96 -32 L 96 32 Q 96 40 86 40 L -86 40 Q -96 40 -96 32 Z";
}
function centreText(text: string) { return text.length > 28 ? `${text.slice(0, 27)}…` : text; }

export default function AlgorithmStudioPlus() {
  const [code, setCode] = useState(starter);
  const [nodes, setNodes] = useState<Node[]>(() => nodesFromCode(starter));
  const [edges, setEdges] = useState<Edge[]>(() => edgesFromCode(starter, nodesFromCode(starter)));
  const [tests, setTests] = useState<Test[]>([{ id: uid("test"), input: "8", expected: "Even" }, { id: uid("test"), input: "7", expected: "Odd" }]);
  const [inputs, setInputs] = useState("8");
  const [output, setOutput] = useState("");
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"write" | "flow" | "trace" | "tests">("write");
  const [saved, setSaved] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem("shadecode.comp-lab.algorithm-studio");
    if (!raw) return;
    try {
      const old = JSON.parse(raw) as Partial<Project> & { nodes?: Node[] };
      if (old.code) setCode(old.code);
      if (Array.isArray(old.nodes)) setNodes(old.nodes);
      if (Array.isArray(old.edges)) setEdges(old.edges); else if (Array.isArray(old.nodes)) setEdges(edgesFromCode(old.code ?? starter, old.nodes));
      if (Array.isArray(old.tests)) setTests(old.tests);
    } catch { /* ignore invalid draft */ }
  }, []);

  const trace = useMemo(() => {
    const marker = output.indexOf("TRACE TABLE");
    if (marker < 0) return [];
    const rows = output.slice(marker).split(/\r?\n/).filter(x => x.trim().startsWith("|"));
    if (rows.length < 3) return [];
    const headers = rows[0].split("|").map(x => x.trim()).filter(Boolean);
    return rows.slice(2).map(row => row.split("|").map(x => x.trim()).filter(Boolean)).map(cells => headers.map((h, i) => [h, cells[i] ?? ""] as const));
  }, [output]);

  function save() { const project: Project = { version: 2, code, nodes, edges, tests }; localStorage.setItem("shadecode.comp-lab.algorithm-studio", JSON.stringify(project)); setSaved(true); setTimeout(() => setSaved(false), 1500); }
  function rebuild() { const n = nodesFromCode(code); setNodes(n); setEdges(edgesFromCode(code, n)); setTab("flow"); }
  async function run() {
    setRunning(true); setDiagnostics([]); setOutput("");
    try {
      const result = await executeCode({ id: crypto.randomUUID(), language: "pseudocode", code, entryFile: "main.pseudo", inputs: inputs.split(/\r?\n/).filter(Boolean), timeoutMs: 5000 });
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
  function startDrag(e: React.PointerEvent, n: Node) { const r = svg.current?.getBoundingClientRect(); if (!r) return; const x = ((e.clientX-r.left)/r.width)*760, y=((e.clientY-r.top)/r.height)*620; setDrag({ id:n.id, dx:n.x-x, dy:n.y-y }); setSelectedNode(n.id); (e.currentTarget as Element).setPointerCapture(e.pointerId); }
  function moveDrag(e: React.PointerEvent) { if (!drag) return; const r=svg.current?.getBoundingClientRect(); if (!r) return; const x=Math.max(115,Math.min(645,((e.clientX-r.left)/r.width)*760+drag.dx)); const y=Math.max(45,Math.min(590,((e.clientY-r.top)/r.height)*620+drag.dy)); setNodes(ns=>ns.map(n=>n.id===drag.id?{...n,x,y}:n)); }
  function add(kind: Kind) { const n: Node={id:uid("node"),kind,text:labels[kind],x:380,y:70+nodes.length*90}; setNodes(v=>[...v,n]); setSelectedNode(n.id); }
  function remove() { if (!selectedNode) return; setNodes(v=>v.filter(n=>n.id!==selectedNode)); setEdges(v=>v.filter(e=>e.from!==selectedNode&&e.to!==selectedNode)); setSelectedNode(null); }
  function editNode(id: string, text: string) { setNodes(v=>v.map(n=>n.id===id?{...n,text}:n)); }
  function exportProject() { const blob=new Blob([JSON.stringify({version:2,code,nodes,edges,tests},null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="algorithm-project.json"; a.click(); URL.revokeObjectURL(url); }
  function importProject(e: React.ChangeEvent<HTMLInputElement>) { const file=e.target.files?.[0]; if(!file)return; const reader=new FileReader(); reader.onload=()=>{try{const p=JSON.parse(String(reader.result)) as Partial<Project>; if(p.code)setCode(p.code); if(Array.isArray(p.nodes))setNodes(p.nodes); if(Array.isArray(p.edges))setEdges(p.edges); if(Array.isArray(p.tests))setTests(p.tests);}catch{setDiagnostics(["Could not import this algorithm project."]);}}; reader.readAsText(file); e.target.value=""; }

  return <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[#090d14] text-slate-200 shadow-xl">
    <header className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-[#0d121b] p-2"><div className="mr-2 px-2"><div className="text-xs font-semibold">Algorithm Studio</div><div className="text-[9px] text-slate-500">Write · Run · Visualise · Trace · Test</div></div>{([["write","Pseudocode"],["flow","Flowchart"],["trace","Trace"],["tests","Tests"]] as const).map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`rounded-lg px-3 py-2 text-[11px] ${tab===id?"bg-white/10 text-white":"text-slate-500 hover:bg-white/5"}`}>{label}</button>)}<div className="ml-auto flex gap-1"><button onClick={save} title="Save locally" className="rounded-lg p-2 text-slate-500 hover:bg-white/5">{saved?<Check className="h-4 w-4 text-emerald-400"/>:<Save className="h-4 w-4"/>}</button><button onClick={exportProject} title="Export" className="rounded-lg p-2 text-slate-500 hover:bg-white/5"><Download className="h-4 w-4"/></button><label title="Import" className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-white/5"><Upload className="h-4 w-4"/><input className="hidden" type="file" accept=".json,application/json" onChange={importProject}/></label></div></header>

    {tab==="write" && <div className="grid lg:grid-cols-[minmax(0,1fr)_310px]"><section className="min-w-0 border-b border-white/10 lg:border-b-0 lg:border-r"><div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2"><span className="mr-auto text-[10px] font-semibold uppercase tracking-widest text-slate-500">main.pseudo · student-owned</span><button onClick={rebuild} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-slate-400"><Workflow className="h-3 w-3"/>Flowchart</button><button disabled={running} onClick={run} className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"><Play className="h-3 w-3"/>{running?"Running":"Run"}</button></div><textarea value={code} onChange={e=>setCode(e.target.value)} spellCheck={false} className="min-h-[480px] w-full resize-y bg-[#070a10] p-5 font-mono text-[13px] leading-6 outline-none"/></section><aside className="space-y-3 p-4"><div className="rounded-xl border border-white/10 p-3"><div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Program input</div><p className="mt-1 text-[10px] leading-4 text-slate-500">One input value per line, consumed by INPUT statements in order.</p><textarea value={inputs} onChange={e=>setInputs(e.target.value)} className="mt-2 min-h-20 w-full rounded-lg bg-black/20 p-2 font-mono text-xs outline-none" placeholder="8"/></div><div className="rounded-xl border border-white/10 p-3"><div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Algorithm toolkit</div><div className="mt-2 flex flex-wrap gap-1">{["INPUT","OUTPUT","IF / ELSE","FOR","WHILE","REPEAT","CASE","ARRAYS","PROCEDURES","MOD / DIV"].map(v=><span key={v} className="rounded-full border border-white/10 px-2 py-1 text-[9px] text-slate-500">{v}</span>)}</div></div>{diagnostics.length>0&&<div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-[10px] leading-5 text-red-300">{diagnostics.map(x=><div key={x}>{x}</div>)}</div>}<div className="rounded-xl border border-white/10 p-3"><div className="text-[9px] uppercase tracking-widest text-slate-600">Output</div><pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-slate-400">{output||"Run the algorithm to see its output and trace."}</pre></div></aside></div>}

    {tab==="flow" && <div className="grid lg:grid-cols-[minmax(0,1fr)_290px]"><section className="min-h-[680px] overflow-hidden border-b border-white/10 bg-[#070a10] lg:border-b-0 lg:border-r"><div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2"><span className="text-[10px] uppercase tracking-widest text-slate-500">Flowchart builder</span><button onClick={rebuild} className="ml-auto rounded-lg border border-white/10 px-2 py-1.5 text-[10px]">Regenerate</button></div><div className="overflow-auto p-3"><svg ref={svg} viewBox="0 0 760 620" className="min-h-[620px] w-full min-w-[720px] touch-none" onPointerMove={moveDrag} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)}>
      <defs><marker id="studio-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="currentColor"/></marker></defs>
      {edges.map(e=>{const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to);if(!a||!b)return null;const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len;return <g key={e.id}><line x1={a.x+ux*42} y1={a.y+uy*42} x2={b.x-ux*42} y2={b.y-uy*42} stroke="currentColor" opacity=".45" strokeWidth="2" markerEnd="url(#studio-arrow)"/>{e.label&&<text x={(a.x+b.x)/2+8} y={(a.y+b.y)/2-5} fontSize="10" fill="currentColor" opacity=".7">{e.label}</text>}</g>})}
      {nodes.map(n=><g key={n.id} transform={`translate(${n.x} ${n.y})`} onPointerDown={e=>startDrag(e,n)} onDoubleClick={()=>{const v=window.prompt("Edit flowchart text",n.text);if(v!==null)editNode(n.id,v)}}><path d={shape(n.kind)} fill="#0d1520" stroke={selectedNode===n.id?"white":colors[n.kind]} strokeWidth={selectedNode===n.id?3:2}/><text textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="white">{centreText(n.text)}</text></g>)}
    </svg></div></section><aside className="p-4"><div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Shapes</div><div className="mt-2 grid grid-cols-2 gap-2">{(["process","input","output","decision","start","end"] as Kind[]).map(k=><button key={k} onClick={()=>add(k)} className="rounded-xl border border-white/10 p-2 text-left text-[10px] hover:bg-white/5"><span className="block font-semibold" style={{color:colors[k]}}>{labels[k]}</span><span className="text-[9px] text-slate-600">Add shape</span></button>)}</div>{selectedNode&&<div className="mt-3 rounded-xl border border-white/10 p-3"><div className="text-[9px] uppercase tracking-widest text-slate-600">Selected node</div><select value={nodes.find(n=>n.id===selectedNode)?.kind??"process"} onChange={e=>setNodes(v=>v.map(n=>n.id===selectedNode?{...n,kind:e.target.value as Kind}:n))} className="mt-2 w-full rounded-lg bg-black/30 p-2 text-xs">{Object.keys(labels).map(k=><option key={k} value={k}>{labels[k]}</option>)}</select><input value={nodes.find(n=>n.id===selectedNode)?.text??""} onChange={e=>editNode(selectedNode,e.target.value)} className="mt-2 w-full rounded-lg bg-black/30 p-2 text-xs"/><button onClick={remove} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-red-400/20 p-2 text-[10px] text-red-300"><Trash2 className="h-3 w-3"/>Remove</button></div>}<div className="mt-3 rounded-xl border border-white/10 p-3 text-[10px] leading-5 text-slate-500"><GitBranch className="mr-1 inline h-3 w-3"/>Decision nodes now expose TRUE/FALSE connectors when the source pseudocode contains an IF/ELSE structure. Drag nodes to arrange the diagram.</div></aside></div>}

    {tab==="trace"&&<div className="p-4"><div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-semibold">Execution trace</div><div className="text-[10px] text-slate-500">Each row is evidence from the pseudocode runtime.</div></div><button onClick={run} disabled={running} className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-[10px] text-white"><Play className="h-3 w-3"/>Run again</button></div>{trace.length?<div className="overflow-auto rounded-xl border border-white/10"><table className="w-full min-w-[620px] text-left text-[10px]"><thead><tr className="border-b border-white/10 bg-white/[.03]">{trace[0].map(([h])=><th key={h} className="px-3 py-2 font-semibold text-slate-500">{h}</th>)}</tr></thead><tbody>{trace.map((row,i)=><tr key={i} className="border-b border-white/5">{row.map(([h,v])=><td key={h} className="px-3 py-2 font-mono text-slate-400">{v}</td>)}</tr>)}</tbody></table></div>:<div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-xs text-slate-600">Run an algorithm to generate a trace table.</div>}</div>}

    {tab==="tests"&&<div className="p-4"><div className="mb-3 flex items-center gap-2"><div className="mr-auto"><div className="text-xs font-semibold">Student test cases</div><div className="text-[10px] text-slate-500">Create your own normal, boundary and invalid cases.</div></div><button onClick={()=>setTests(v=>[...v,{id:uid("test"),input:"",expected:""}])} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-[10px]"><Plus className="h-3 w-3"/>Add case</button><button onClick={runTests} disabled={running} className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-[10px] text-white"><Play className="h-3 w-3"/>Run tests</button></div><div className="space-y-2">{tests.map((t,i)=><div key={t.id} className="grid gap-2 rounded-xl border border-white/10 p-3 md:grid-cols-[90px_1fr_1fr_auto]"><span className="pt-2 text-[10px] text-slate-600">CASE {i+1}</span><textarea value={t.input} onChange={e=>setTests(v=>v.map(x=>x.id===t.id?{...x,input:e.target.value}:x))} placeholder="Input" className="min-h-14 rounded-lg bg-black/20 p-2 font-mono text-xs outline-none"/><textarea value={t.expected} onChange={e=>setTests(v=>v.map(x=>x.id===t.id?{...x,expected:e.target.value}:x))} placeholder="Expected output" className="min-h-14 rounded-lg bg-black/20 p-2 font-mono text-xs outline-none"/><button onClick={()=>setTests(v=>v.filter(x=>x.id!==t.id))} className="self-start rounded-lg p-2 text-slate-600 hover:text-red-300"><X className="h-4 w-4"/></button></div>)}</div>{output&&<pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 p-3 font-mono text-[10px] text-slate-400">{output}</pre>}</div>}
    <footer className="border-t border-white/10 px-4 py-3 text-[9px] text-slate-600">Practice and student-created algorithms run in the browser. Official assessment remains a separate authoritative path and does not trust client-side hidden tests.</footer>
  </div>;
}
