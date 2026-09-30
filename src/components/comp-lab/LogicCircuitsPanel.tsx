"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw, Sparkles, X, Zap } from "lucide-react";

type Gate = "NOT" | "AND" | "OR" | "NAND" | "NOR" | "XOR";

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
];

function GateDiagram({ gate }: { gate: Gate }) {
  const rows = rowsFor(gate);
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Truth table</div>
          <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{gate} gate</div>
        </div>
        <span className="rounded-full bg-[var(--primary-glow)] px-2 py-1 text-[9px] text-[var(--primary)]">{gate === "NOT" ? "1 input" : "2 inputs"}</span>
      </div>
      <div className="overflow-auto p-4">
        <table className="w-full max-w-sm text-left text-xs">
          <thead><tr className="border-b border-[var(--card-border)]">{gate !== "NOT" && <th className="px-3 py-2 text-[var(--muted-foreground)]">A</th>}{gate !== "NOT" && <th className="px-3 py-2 text-[var(--muted-foreground)]">B</th>}<th className="px-3 py-2 text-[var(--muted-foreground)]">Output</th></tr></thead>
          <tbody>{rows.map((row, i) => <tr key={i} className="border-b border-[var(--card-border)]/60"><>{gate !== "NOT" && <td className="px-3 py-2 font-mono">{row.a}</td>}{gate !== "NOT" && <td className="px-3 py-2 font-mono">{row.b}</td>}</><td className="px-3 py-2 font-mono font-semibold">{row.out}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

export default function LogicCircuitsPanel() {
  const [gate, setGate] = useState<Gate>("AND");
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [expression, setExpression] = useState("A AND B");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);

  const output = truth(gate, a, b);
  const question = QUESTIONS[questionIndex];
  const progress = useMemo(() => Math.round(completed.length / QUESTIONS.length * 100), [completed.length]);

  const check = () => {
    if (!answer.trim()) return;
    const correct = answer.trim().toUpperCase() === question.answer.toUpperCase();
    setFeedback(correct ? "correct" : "wrong");
    if (correct && !completed.includes(question.id)) {
      setCompleted(current => [...current, question.id]);
      setScore(current => current + 1);
    }
  };

  const reset = () => {
    setQuestionIndex(0);
    setAnswer("");
    setFeedback(null);
    setScore(0);
    setCompleted([]);
  };

  return (
    <section className="p-4 sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Sparkles className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">9618 · Digital logic</div>
          <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Logic Gates & Circuits</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--muted-foreground)]">Build the bridge between Boolean logic, truth tables and physical digital circuits.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Gate explorer</div>
            <div className="mt-3 flex flex-wrap gap-2">{GATES.map(item => <button key={item} type="button" onClick={() => setGate(item)} className={`rounded-xl border px-3 py-2 text-[10px] font-semibold ${gate === item ? "border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--foreground)]" : "border-[var(--card-border)] text-[var(--muted-foreground)]"}`}>{item}</button>)}</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-[10px] text-[var(--muted-foreground)]">Input A<select value={a} onChange={e => setA(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface-2)] p-2 text-sm"><option value={0}>0</option><option value={1}>1</option></select></label>
              {gate !== "NOT" && <label className="text-[10px] text-[var(--muted-foreground)]">Input B<select value={b} onChange={e => setB(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface-2)] p-2 text-sm"><option value={0}>0</option><option value={1}>1</option></select></label>}
            </div>
            <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[#070a10] p-4">
              <div className="text-[9px] uppercase tracking-widest text-slate-500">Live circuit</div>
              <div className="mt-4 flex items-center justify-center gap-3 font-mono text-xs">
                <span>A={a}</span>{gate !== "NOT" && <span>B={b}</span>}<span className="text-slate-500">→</span><span className="rounded-lg border border-white/20 px-3 py-2 font-semibold text-white">{gate}</span><span className="text-slate-500">→</span><span className="rounded-lg bg-[var(--primary-glow)] px-3 py-2 font-bold text-[var(--primary)]">{output}</span>
              </div>
            </div>
          </div>
          <GateDiagram gate={gate} />
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-center gap-2"><div className="mr-auto text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Expression playground</div><button type="button" onClick={() => setExpression("NOT (A OR B)")} className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-[9px]">NOR form</button></div>
            <input value={expression} onChange={e => setExpression(e.target.value)} className="mt-3 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3 font-mono text-xs" />
            <p className="mt-2 text-[9px] leading-4 text-[var(--muted-foreground)]">Use AND, OR and NOT. Build the expression from a circuit, then test it with different inputs.</p>
          </div>

          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-3"><div className="mr-auto"><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Question mode</div><div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{question.title}</div></div><div className="text-right text-[9px] text-[var(--muted-foreground)]">{score}/{QUESTIONS.length}</div></div>
            <div className="mt-2 h-1 rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: progress + "%" }} /></div>
            <p className="mt-4 text-xs leading-5 text-[var(--foreground)]">{question.prompt}</p>
            {question.options && <div className="mt-3 grid grid-cols-2 gap-2">{question.options.map(option => <button key={option} type="button" onClick={() => setAnswer(option)} className={`rounded-xl border p-2.5 text-left text-[10px] ${answer === option ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)]"}`}>{option}</button>)}</div>}
            {!question.options && <input value={answer} onChange={e => setAnswer(e.target.value)} className="mt-3 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3 font-mono text-xs" placeholder="Your answer" />}
            {feedback && <div className={`mt-3 rounded-xl border p-3 text-[10px] ${feedback === "correct" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300" : "border-red-500/20 bg-red-500/5 text-red-300"}`}><div className="font-semibold">{feedback === "correct" ? "Correct" : "Not yet"}</div><div className="mt-1">{question.explanation}</div></div>}
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={check} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-[10px] font-semibold text-white"><Zap className="h-3.5 w-3.5" />Check</button><button type="button" onClick={() => { setQuestionIndex(i => (i + 1) % QUESTIONS.length); setAnswer(""); setFeedback(null); }} className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-[10px]">Next</button><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] text-[var(--muted-foreground)]"><RotateCcw className="h-3.5 w-3.5" />Reset</button></div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          ["Truth tables", "Generate and complete rows from a gate or expression."],
          ["Circuit construction", "Move between problem statement, expression, truth table and circuit."],
          ["A Level extension", "De Morgan's laws, Boolean simplification, adders, flip-flops and K-maps can sit here as the advanced layer."],
        ].map(([title, text]) => <div key={title} className="rounded-xl border border-[var(--card-border)] p-3"><div className="flex items-center gap-2 text-[10px] font-semibold"><Check className="h-3.5 w-3.5 text-emerald-400" />{title}</div><p className="mt-1 text-[9px] leading-4 text-[var(--muted-foreground)]">{text}</p></div>)}
      </div>
    </section>
  );
}
