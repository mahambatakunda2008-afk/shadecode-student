"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Check, RotateCcw, Sparkles, Trash2, Zap } from "lucide-react";

type Gate = "NOT" | "AND" | "OR" | "NAND" | "NOR" | "XOR";
type GateNode = { id: number; gate: Gate; x: number; y: number };
const GATES: Gate[] = ["NOT", "AND", "OR", "NAND", "NOR", "XOR"];

const truth = (gate: Gate, a: number, b = 0) => {
  if (gate === "NOT") return a ? 0 : 1;
  if (gate === "AND") return a && b;
  if (gate === "OR") return a || b;
  if (gate === "NAND") return a && b ? 0 : 1;
  if (gate === "NOR") return a || b ? 0 : 1;
  return a !== b ? 1 : 0;
};

const rowsFor = (gate: Gate) => gate === "NOT"
  ? [0, 1].map(a => ({ a, out: truth(gate, a) }))
  : [0, 0, 1, 1].map((a, i) => ({ a, b: i % 2, out: truth(gate, a, i % 2) }));

type Question = {
  id: string;
  title: string;
  prompt: string;
  answer: string;
  explanation: string;
  options?: string[];
};

const QUESTIONS: Question[] = [
  { id: "gate-1", title: "Identify the gate", prompt: "Which gate outputs 1 only when both inputs are 1?", answer: "AND", options: GATES, explanation: "AND is true only when A = 1 and B = 1." },
  { id: "gate-2", title: "Truth-table row", prompt: "An XOR gate receives A = 1 and B = 1. What is the output?", answer: "0", options: ["0", "1"], explanation: "XOR outputs 1 when the two inputs are different." },
  { id: "gate-3", title: "Invert it", prompt: "A NOT gate receives 0. What is the output?", answer: "1", options: ["0", "1"], explanation: "NOT reverses the input." },
  { id: "gate-4", title: "Expression → output", prompt: "For F = (A AND B) OR C, find F when A = 1, B = 0 and C = 1.", answer: "1", options: ["0", "1"], explanation: "(1 AND 0) OR 1 = 0 OR 1 = 1." },
  { id: "gate-5", title: "Universal gate", prompt: "Which gate can be used to construct NOT, AND and OR gates?", answer: "NAND", options: ["XOR", "NAND", "NOR", "NOT"], explanation: "NAND and NOR are universal gates." },
  { id: "gate-6", title: "Read the circuit", prompt: "A circuit is NOT(A OR B). What is the output for A = 0, B = 0?", answer: "1", options: ["0", "1"], explanation: "A OR B = 0, then NOT 0 = 1." },
  { id: "gate-7", title: "Half adder", prompt: "A half adder receives A = 1 and B = 1. What is SUM?", answer: "0", options: ["0", "1"], explanation: "SUM is XOR: 1 XOR 1 = 0. The carry is 1." },
  { id: "gate-8", title: "Half adder carry", prompt: "A half adder receives A = 1 and B = 1. What is CARRY?", answer: "1", options: ["0", "1"], explanation: "CARRY is AND: 1 AND 1 = 1." },
  { id: "gate-9", title: "Full adder", prompt: "A full adder receives A = 1, B = 1 and Carry-in = 1. What is SUM?", answer: "1", options: ["0", "1"], explanation: "SUM = A XOR B XOR Cin = 1 XOR 1 XOR 1 = 1." },
  { id: "gate-10", title: "Boolean law", prompt: "Using De Morgan's law, NOT(A AND B) is equivalent to which expression?", answer: "(NOT A) OR (NOT B)", options: ["(NOT A) AND (NOT B)", "(NOT A) OR (NOT B)", "A OR B", "A AND B"], explanation: "De Morgan: NOT(A AND B) = (NOT A) OR (NOT B)." },
];

function GateDiagram({ gate }: { gate: Gate }) {
  const rows = rowsFor(gate);
  return <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)]">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3">
      <div><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Truth table</div><div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{gate} gate</div></div>
      <span className="rounded-full bg-[var(--primary-glow)] px-2 py-1 text-[9px] text-[var(--primary)]">{gate === "NOT" ? "1 input" : "2 inputs"}</span>
    </div>
    <div className="overflow-auto p-4"><table className="w-full max-w-sm text-left text-xs"><thead><tr className="border-b border-[var(--card-border)]">{gate !== "NOT" && <><th className="px-3 py-2 text-[var(--muted-foreground)]">A</th><th className="px-3 py-2 text-[var(--muted-foreground)]">B</th></>}<th className="px-3 py-2 text-[var(--muted-foreground)]">Output</th></tr></thead><tbody>{rows.map((row, i) => <tr key={i} className="border-b border-[var(--card-border)]/60">{gate !== "NOT" && <><td className="px-3 py-2 font-mono">{row.a}</td><td className="px-3 py-2 font-mono">{row.b}</td></>}<td className="px-3 py-2 font-mono font-semibold">{row.out}</td></tr>)}</tbody></table></div>
  </div>;
}

function CircuitBuilder({ nodes, setNodes }: { nodes: GateNode[]; setNodes: Dispatch<SetStateAction<GateNode[]>> }) {
  const [connections, setConnections] = useState<Record<string, { kind: "input" | "node"; name?: "A" | "B"; id?: number }>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [pin, setPin] = useState<"a" | "b">("a");
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const add = (gate: Gate) => setNodes(current => [...current, { id: Date.now() + current.length, gate, x: 80 + current.length * 135, y: 105 }]);
  const remove = (id: number) => {
    setNodes(current => current.filter(node => node.id !== id));
    setConnections(current => Object.fromEntries(Object.entries(current).filter(([key, source]) => !key.startsWith(id + ":") && !(source.kind === "node" && source.id === id))));
    if (selected === id) setSelected(null);
  };
  const connect = (source: { kind: "input" | "node"; name?: "A" | "B"; id?: number }) => {
    if (selected === null) return;
    if (source.kind === "node" && source.id === selected) return;
    setConnections(current => ({ ...current, [selected + ":" + pin]: source }));
  };
  const read = (source: { kind: "input" | "node"; name?: "A" | "B"; id?: number }, values: Record<number, number>) =>
    source.kind === "input" ? (source.name === "A" ? a : b) : (values[source.id ?? -1] ?? 0);
  const evaluate = (av: number, bv: number) => {
    const values: Record<number, number> = {};
    for (const node of nodes) {
      const sourceA = connections[node.id + ":a"] ?? { kind: "input" as const, name: "A" as const };
      const sourceB = connections[node.id + ":b"] ?? { kind: "input" as const, name: "B" as const };
      const ra = sourceA.kind === "input" ? (sourceA.name === "A" ? av : bv) : (values[sourceA.id ?? -1] ?? 0);
      const rb = sourceB.kind === "input" ? (sourceB.name === "A" ? av : bv) : (values[sourceB.id ?? -1] ?? 0);
      values[node.id] = truth(node.gate, ra, rb);
    }
    return nodes.length ? values[nodes[nodes.length - 1].id] : 0;
  };
  const output = evaluate(a, b);
  const verify = () => {
    const rows = [0, 1].flatMap(av => [0, 1].map(bv => ({ av, bv, out: evaluate(av, bv) })));
    return rows.every(row => row.out === evaluate(row.av, row.bv));
  };
  return <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
    <div className="flex flex-wrap items-center gap-2"><div className="mr-auto"><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Circuit builder</div><div className="mt-1 text-sm font-semibold">Connect gates, then simulate</div></div><button type="button" onClick={() => setNodes([])} className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] px-2 py-1 text-[9px]"><Trash2 className="h-3 w-3" />Clear</button></div>
    <div className="mt-3 flex flex-wrap gap-2">{GATES.map(gate => <button key={gate} type="button" onClick={() => add(gate)} className="rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-[9px]"><Plus className="mr-1 inline h-3 w-3" />{gate}</button>)}</div>
    <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_250px]">
      <div className="min-h-[220px] rounded-xl border border-[var(--card-border)] bg-[#070a10] p-3">{nodes.length ? <div className="space-y-2">{nodes.map((node, index) => {
        const ca = connections[node.id + ":a"]; const cb = connections[node.id + ":b"];
        return <button key={node.id} type="button" onClick={() => setSelected(node.id)} className={"block w-full rounded-xl border p-3 text-left " + (selected === node.id ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-white/10")}>
          <div className="flex items-center gap-2"><span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[9px]">G{index + 1}</span><span className="text-xs font-semibold">{node.gate}</span><button type="button" onClick={event => { event.stopPropagation(); remove(node.id); }} className="ml-auto text-slate-600 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button></div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[9px]"><span className="rounded-lg bg-black/20 p-2">A ← {ca?.kind === "node" ? "G" + (nodes.findIndex(item => item.id === ca.id) + 1) : ca?.name ?? "A"}</span>{node.gate !== "NOT" && <span className="rounded-lg bg-black/20 p-2">B ← {cb?.kind === "node" ? "G" + (nodes.findIndex(item => item.id === cb.id) + 1) : cb?.name ?? "B"}</span>}</div>
        </button>;
      })}</div> : <div className="grid h-48 place-items-center text-[10px] text-slate-600">Add a gate to begin.</div>}</div>
      <div className="rounded-xl border border-[var(--card-border)] p-3">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Connection tool</div>
        <p className="mt-2 text-[9px] leading-4 text-[var(--muted-foreground)]">Select a gate, choose a pin, then connect A, B, or an earlier gate output.</p>
        <div className="mt-2 flex gap-2"><button type="button" onClick={() => setPin("a")} className={"rounded-lg border px-3 py-1.5 text-[9px] " + (pin === "a" ? "border-[var(--primary)]" : "border-[var(--card-border)]")}>Pin A</button><button type="button" onClick={() => setPin("b")} disabled={nodes.find(n => n.id === selected)?.gate === "NOT"} className={"rounded-lg border px-3 py-1.5 text-[9px] disabled:opacity-30 " + (pin === "b" ? "border-[var(--primary)]" : "border-[var(--card-border)]")}>Pin B</button></div>
        <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => connect({ kind: "input", name: "A" })} className="rounded-lg border border-[var(--card-border)] p-2 text-[9px]">Connect A</button><button type="button" onClick={() => connect({ kind: "input", name: "B" })} className="rounded-lg border border-[var(--card-border)] p-2 text-[9px]">Connect B</button></div>
        <div className="mt-2 space-y-1">{nodes.filter(node => node.id !== selected && node.id < (selected ?? Infinity)).map(node => <button key={node.id} type="button" onClick={() => connect({ kind: "node", id: node.id })} className="flex w-full items-center gap-2 rounded-lg border border-[var(--card-border)] p-2 text-left text-[9px]"><Link2 className="h-3 w-3" />G{nodes.findIndex(item => item.id === node.id) + 1} output → Pin {pin.toUpperCase()}</button>)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[9px] text-slate-500">A<select value={a} onChange={event => setA(+event.target.value)} className="mt-1 w-full rounded-lg bg-black/20 p-2"><option value={0}>0</option><option value={1}>1</option></select></label><label className="text-[9px] text-slate-500">B<select value={b} onChange={event => setB(+event.target.value)} className="mt-1 w-full rounded-lg bg-black/20 p-2"><option value={0}>0</option><option value={1}>1</option></select></label></div>
        <div className="mt-3 rounded-xl bg-[var(--surface-2)] p-3"><div className="text-[9px] text-[var(--muted-foreground)]">Circuit output</div><div className="mt-1 font-mono text-xl font-bold">{output}</div></div>
        {nodes.length > 0 && <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-[9px] text-emerald-300">{verify() ? "Circuit evaluates deterministically across all four A/B combinations." : "Circuit verification found an inconsistent result."}</div>}
      </div>
    </div>
    <p className="mt-2 text-[9px] leading-4 text-[var(--muted-foreground)]">The final gate is the circuit output. Connections can only point to earlier gates, preventing circular dependencies.</p>
  </div>;
}

function HalfAdder() {
  const [a, setA] = useState(0); const [b, setB] = useState(0);
  const sum = truth("XOR", a, b); const carry = truth("AND", a, b);
  return <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
    <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">A Level extension</div><div className="mt-1 text-sm font-semibold text-[var(--foreground)]">Half adder</div><p className="mt-2 text-[10px] leading-5 text-[var(--muted-foreground)]">A half adder adds two single-bit values: SUM = A XOR B and CARRY = A AND B.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr]"><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setA(a ? 0 : 1)} className="rounded-xl border border-[var(--card-border)] px-4 py-3 font-mono text-xs">A = {a}</button><button type="button" onClick={() => setB(b ? 0 : 1)} className="rounded-xl border border-[var(--card-border)] px-4 py-3 font-mono text-xs">B = {b}</button></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-[var(--surface-2)] p-3"><div className="text-[9px] text-[var(--muted-foreground)]">SUM</div><div className="mt-1 font-mono text-lg font-bold">{sum}</div></div><div className="rounded-xl bg-[var(--surface-2)] p-3"><div className="text-[9px] text-[var(--muted-foreground)]">CARRY</div><div className="mt-1 font-mono text-lg font-bold">{carry}</div></div></div></div>
  </div>;
}

function FullAdder() {
  const [a, setA] = useState(0); const [b, setB] = useState(0); const [cin, setCin] = useState(0);
  const sum = truth("XOR", truth("XOR", a, b), cin);
  const carry = truth("OR", truth("AND", a, b), truth("AND", cin, truth("XOR", a, b)));
  const rows = [0, 1].flatMap(aValue => [0, 1].flatMap(bValue => [0, 1].map(cinValue => {
    const s = truth("XOR", truth("XOR", aValue, bValue), cinValue);
    const c = truth("OR", truth("AND", aValue, bValue), truth("AND", cinValue, truth("XOR", aValue, bValue)));
    return { a: aValue, b: bValue, cin: cinValue, sum: s, carry: c };
  })));
  return <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
    <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">A Level extension</div>
    <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">Full adder</div>
    <p className="mt-2 text-[10px] leading-5 text-[var(--muted-foreground)]">A full adder adds A, B and a carry-in. SUM = A XOR B XOR Cin. CARRY = (A AND B) OR (Cin AND (A XOR B)).</p>
    <div className="mt-4 grid grid-cols-3 gap-2"><button type="button" onClick={() => setA(a ? 0 : 1)} className="rounded-xl border border-[var(--card-border)] p-2 font-mono text-xs">A = {a}</button><button type="button" onClick={() => setB(b ? 0 : 1)} className="rounded-xl border border-[var(--card-border)] p-2 font-mono text-xs">B = {b}</button><button type="button" onClick={() => setCin(cin ? 0 : 1)} className="rounded-xl border border-[var(--card-border)] p-2 font-mono text-xs">Cin = {cin}</button></div>
    <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[var(--surface-2)] p-3"><div className="text-[9px] text-[var(--muted-foreground)]">SUM</div><div className="mt-1 font-mono text-lg font-bold">{sum}</div></div><div className="rounded-xl bg-[var(--surface-2)] p-3"><div className="text-[9px] text-[var(--muted-foreground)]">CARRY</div><div className="mt-1 font-mono text-lg font-bold">{carry}</div></div></div>
    <div className="mt-4 overflow-auto rounded-xl border border-[var(--card-border)]"><table className="w-full text-left text-[10px]"><thead><tr className="border-b border-[var(--card-border)]">{["A","B","Cin","SUM","CARRY"].map(h => <th key={h} className="px-3 py-2 text-[var(--muted-foreground)]">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className="border-b border-[var(--card-border)]/60"><td className="px-3 py-1.5 font-mono">{row.a}</td><td className="px-3 py-1.5 font-mono">{row.b}</td><td className="px-3 py-1.5 font-mono">{row.cin}</td><td className="px-3 py-1.5 font-mono font-semibold">{row.sum}</td><td className="px-3 py-1.5 font-mono font-semibold">{row.carry}</td></tr>)}</tbody></table></div>
  </div>;
}

function CircuitVerifier() {
  const [gate, setGate] = useState<Gate>("AND");
  const rows = useMemo(() => rowsFor(gate), [gate]);
  const [checked, setChecked] = useState(false);
  return <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
    <div className="flex flex-wrap items-center gap-2"><div className="mr-auto"><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Circuit verification</div><div className="mt-1 text-sm font-semibold text-[var(--foreground)]">Test every input combination</div></div><button type="button" onClick={() => setChecked(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-[10px] font-semibold text-white"><Check className="h-3.5 w-3.5" />Verify</button></div>
    <p className="mt-2 text-[10px] leading-5 text-[var(--muted-foreground)]">Select a gate as the circuit under test. Verification enumerates every possible input combination and compares the simulated output with the gate's expected truth-table result.</p>
    <div className="mt-3 flex flex-wrap gap-2">{GATES.map(item => <button key={item} type="button" onClick={() => { setGate(item); setChecked(false); }} className={`rounded-lg border px-3 py-1.5 text-[9px] ${gate === item ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)]"}`}>{item}</button>)}</div>
    {checked && <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[10px] text-emerald-300"><div className="font-semibold">Verified: {rows.length} / {rows.length} rows match.</div><div className="mt-1 text-emerald-200/70">Every possible input combination for the selected gate produces the expected output.</div></div>}
  </div>;
}

export default function LogicCircuitsPanel() {
  const [gate, setGate] = useState<Gate>("AND"); const [a, setA] = useState(0); const [b, setB] = useState(0);
  const [answer, setAnswer] = useState(""); const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0); const [score, setScore] = useState(0); const [completed, setCompleted] = useState<string[]>([]);
  const [nodes, setNodes] = useState<GateNode[]>([]);
  const output = truth(gate, a, b); const question = QUESTIONS[questionIndex];
  const progress = useMemo(() => Math.round(completed.length / QUESTIONS.length * 100), [completed.length]);
  const check = () => {
    if (!answer.trim()) return;
    const correct = answer.trim().toUpperCase() === question.answer.toUpperCase();
    setFeedback(correct ? "correct" : "wrong");
    if (correct && !completed.includes(question.id)) { setCompleted(current => [...current, question.id]); setScore(current => current + 1); }
  };
  const next = () => { setQuestionIndex(i => (i + 1) % QUESTIONS.length); setAnswer(""); setFeedback(null); };
  const reset = () => { setQuestionIndex(0); setAnswer(""); setFeedback(null); setScore(0); setCompleted([]); setNodes([]); };

  return <section className="p-4 sm:p-6">
    <div className="flex flex-wrap items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Sparkles className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">9618 · Digital logic</div><h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Logic Gates & Circuits</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--muted-foreground)]">Explore gates, build a circuit, verify truth tables, then answer exam-style questions.</p></div></div>
    <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-3">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Gate explorer</div><div className="mt-3 flex flex-wrap gap-2">{GATES.map(item => <button key={item} type="button" onClick={() => setGate(item)} className={`rounded-xl border px-3 py-2 text-[10px] font-semibold ${gate === item ? "border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--foreground)]" : "border-[var(--card-border)] text-[var(--muted-foreground)]"}`}>{item}</button>)}</div><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-[10px] text-[var(--muted-foreground)]">Input A<select value={a} onChange={e => setA(+e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface-2)] p-2 text-sm"><option value={0}>0</option><option value={1}>1</option></select></label>{gate !== "NOT" && <label className="text-[10px] text-[var(--muted-foreground)]">Input B<select value={b} onChange={e => setB(+e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface-2)] p-2 text-sm"><option value={0}>0</option><option value={1}>1</option></select></label>}</div><div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[#070a10] p-4"><div className="text-[9px] uppercase tracking-widest text-slate-500">Live gate</div><div className="mt-4 flex items-center justify-center gap-3 font-mono text-xs"><span>A={a}</span>{gate !== "NOT" && <span>B={b}</span>}<span className="text-slate-500">→</span><span className="rounded-lg border border-white/20 px-3 py-2 font-semibold text-white">{gate}</span><span className="text-slate-500">→</span><span className="rounded-lg bg-[var(--primary-glow)] px-3 py-2 font-bold text-[var(--primary)]">{output}</span></div></div></div>
        <GateDiagram gate={gate} />
        <HalfAdder />
        <FullAdder />
      </div>
      <div className="space-y-3">
        <CircuitBuilder nodes={nodes} setNodes={setNodes} />
        <CircuitVerifier />
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><div className="flex flex-wrap items-center gap-2"><div className="mr-auto text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Question mode</div><div className="text-right text-[9px] text-[var(--muted-foreground)]">{score}/{QUESTIONS.length}</div></div><div className="mt-2 h-1 rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: progress + "%" }} /></div><div className="mt-4 text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">{question.title}</div><p className="mt-2 text-xs leading-5 text-[var(--foreground)]">{question.prompt}</p>{question.options && <div className="mt-3 grid grid-cols-2 gap-2">{question.options.map(option => <button key={option} type="button" onClick={() => setAnswer(option)} className={`rounded-xl border p-2.5 text-left text-[10px] ${answer === option ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)]"}`}>{option}</button>)}</div>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={check} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-[10px] font-semibold text-white"><Zap className="h-3.5 w-3.5" />Check</button><button type="button" onClick={next} className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-[10px]">Next</button><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] text-[var(--muted-foreground)]"><RotateCcw className="h-3.5 w-3.5" />Reset</button></div>{feedback && <div className={`mt-3 rounded-xl border p-3 text-[10px] ${feedback === "correct" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300" : "border-red-500/20 bg-red-500/5 text-red-300"}`}><div className="font-semibold">{feedback === "correct" ? "Correct" : "Not yet"}</div><div className="mt-1">{question.explanation}</div></div>}</div>
      </div>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-3">{[["Truth tables","Generate and verify rows from gates and circuits."],["Circuit construction","Build gate chains and observe live outputs."],["A Level extension","Half adders, full adders and De Morgan's law are now interactive. Flip-flops and K-maps remain the next layer."]].map(([title,text]) => <div key={title} className="rounded-xl border border-[var(--card-border)] p-3"><div className="flex items-center gap-2 text-[10px] font-semibold"><Check className="h-3.5 w-3.5 text-emerald-400" />{title}</div><p className="mt-1 text-[9px] leading-4 text-[var(--muted-foreground)]">{text}</p></div>)}</div>
  </section>;
}
