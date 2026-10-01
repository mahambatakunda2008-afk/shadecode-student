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
  const [a, setA] = useState(0); const [b, setB] = useState(0);
  const add = (gate: Gate) => setNodes(current => [...current, { id: Date.now() + current.length, gate, x: 70 + current.length * 135, y: 105 }]);
  const outputs = nodes.reduce<number[]>((values, node, index) => {
    const inputA = index === 0 ? a : values[index - 1];
    return [...values, truth(node.gate, inputA, b)];
  }, []);
  return <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
    <div className="flex flex-wrap items-center gap-2"><div className="mr-auto"><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Circuit builder</div><div className="mt-1 text-sm font-semibold text-[var(--foreground)]">Build and simulate a gate chain</div></div><button type="button" onClick={() => setNodes([])} className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] px-2 py-1 text-[9px]"><Trash2 className="h-3 w-3" />Clear</button></div>
    <div className="mt-3 flex flex-wrap gap-2">{GATES.map(gate => <button key={gate} type="button" onClick={() => add(gate)} className="rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-[9px] font-semibold hover:border-[var(--primary)]">{gate} +</button>)}</div>
    <div className="mt-3 grid max-w-xs grid-cols-2 gap-2"><label className="text-[9px] text-[var(--muted-foreground)]">A<select value={a} onChange={e => setA(+e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface-2)] p-2"><option value={0}>0</option><option value={1}>1</option></select></label><label className="text-[9px] text-[var(--muted-foreground)]">B<select value={b} onChange={e => setB(+e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface-2)] p-2"><option value={0}>0</option><option value={1}>1</option></select></label></div>
    <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[#070a10] p-4"><svg viewBox="0 0 760 210" className="h-52 min-w-[650px] w-full" role="img" aria-label="Digital logic gate chain"><text x="14" y="70" fill="currentColor" opacity=".55" fontSize="11">A/B</text>{nodes.map((node, index) => <g key={node.id}><rect x={node.x} y={node.y} width="100" height="52" rx="12" fill="none" stroke="currentColor" opacity=".35"/><text x={node.x + 50} y={node.y + 22} textAnchor="middle" fill="currentColor" fontSize="11">{node.gate}</text><text x={node.x + 50} y={node.y + 39} textAnchor="middle" fill="currentColor" opacity=".55" fontSize="9">out {outputs[index]}</text>{index > 0 && <line x1={node.x - 20} y1={node.y + 26} x2={node.x} y2={node.y + 26} stroke="currentColor" opacity=".5" strokeWidth="2"/>}</g>)}<text x="14" y="185" fill="currentColor" opacity=".55" fontSize="10">{nodes.length ? `Current chain output: ${outputs[outputs.length - 1]}` : "Add gates above to begin"}</text></svg></div>
    <p className="mt-2 text-[9px] leading-4 text-[var(--muted-foreground)]">The first gate receives A/B. Each later gate receives the previous gate's output as its first input and B as its second input. This is a guided chain, not a freeform circuit editor.</p>
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
