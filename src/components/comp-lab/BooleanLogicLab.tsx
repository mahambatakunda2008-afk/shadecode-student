"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw, Sigma, Table2, ToggleLeft } from "lucide-react";

type Bit = 0 | 1;
type Gate = "AND" | "OR" | "NAND" | "NOR" | "XOR";

const b = (v: boolean | number): Bit => (v ? 1 : 0);
const gate = (name: Gate, a: Bit, c: Bit): Bit => {
  if (name === "AND") return b(a && c);
  if (name === "OR") return b(a || c);
  if (name === "NAND") return b(!(a && c));
  if (name === "NOR") return b(!(a || c));
  return b(a !== c);
};

type Token = { type: "bit" | "name" | "op" | "lparen" | "rparen"; value: string };

function tokenize(source: string): Token[] | null {
  const input = source.toUpperCase().replace(/\s+/g, "");
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === "0" || ch === "1") { tokens.push({ type: "bit", value: ch }); i++; continue; }
    if (/[ABC]/.test(ch)) { tokens.push({ type: "name", value: ch }); i++; continue; }
    if (ch === "(") { tokens.push({ type: "lparen", value: ch }); i++; continue; }
    if (ch === ")") { tokens.push({ type: "rparen", value: ch }); i++; continue; }
    const rest = input.slice(i);
    const op = ["NAND", "XOR", "NOR", "NOT", "AND", "OR"].find(word => rest.startsWith(word));
    if (op) { tokens.push({ type: "op", value: op }); i += op.length; continue; }
    return null;
  }
  return tokens;
}

function evaluateExpression(source: string, values: Record<string, Bit>): Bit | null {
  const tokens = tokenize(source);
  if (!tokens?.length) return null;
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];

  const primary = (): Bit | null => {
    const token = peek();
    if (!token) return null;
    if (token.type === "bit") { take(); return Number(token.value) as Bit; }
    if (token.type === "name") { take(); return values[token.value] ?? null; }
    if (token.type === "lparen") {
      take();
      const value = orExpr();
      if (peek()?.type !== "rparen") return null;
      take();
      return value;
    }
    return null;
  };
  const unary = (): Bit | null => {
    if (peek()?.type === "op" && peek()?.value === "NOT") {
      take();
      const value = unary();
      return value === null ? null : (value ? 0 : 1);
    }
    return primary();
  };
  const binary = (next: () => Bit | null, ops: string[]): Bit | null => {
    let left = next();
    while (left !== null && peek()?.type === "op" && ops.includes(peek()!.value)) {
      const op = take().value as Gate;
      const right = next();
      if (right === null) return null;
      left = gate(op, left, right);
    }
    return left;
  };
  const xorExpr = () => binary(unary, ["XOR"]);
  const andExpr = () => binary(xorExpr, ["AND", "NAND", "NOR"]);
  const orExpr = () => binary(andExpr, ["OR"]);
  const result = orExpr();
  return pos === tokens.length ? result : null;
}

function variableNames(expr: string) {
  const tokens = tokenize(expr) ?? [];
  return ["A", "B", "C"].filter(name => tokens.some(token => token.type === "name" && token.value === name));
}

function combinations(names: string[]) {
  return Array.from({ length: 2 ** names.length }, (_, i) =>
    Object.fromEntries(names.map((name, j) => [name, ((i >> (names.length - j - 1)) & 1) as Bit]))
  );
}

function BooleanLab() {
  const [expr, setExpr] = useState("(A AND B) OR C");
  const [verified, setVerified] = useState(false);
  const names = useMemo(() => variableNames(expr), [expr]);
  const rows = useMemo(() => combinations(names).map(values => ({ values, output: evaluateExpression(expr, values) })), [expr, names]);
  const valid = rows.length > 0 && rows.every(row => row.output !== null);

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2"><Sigma className="h-4 w-4 text-[var(--primary)]" /><div><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Boolean algebra lab</div><div className="mt-1 text-sm font-semibold">Expression → truth table</div></div></div>
      <p className="mt-2 text-[10px] leading-5 text-[var(--muted-foreground)]">Use A, B, C with NOT, AND, OR, NAND, NOR and XOR. Parentheses are supported and normal Boolean precedence is enforced.</p>
      <input value={expr} onChange={e => { setExpr(e.target.value); setVerified(false); }} className="mt-3 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3 font-mono text-xs" />
      <div className="mt-3 flex items-center gap-2"><button type="button" disabled={!valid} onClick={() => setVerified(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-40"><Check className="h-3.5 w-3.5" />Verify expression</button><span className="text-[9px] text-[var(--muted-foreground)]">{valid ? rows.length + " rows generated" : "Invalid or incomplete Boolean expression"}</span></div>
      {valid && <div className="mt-3 overflow-auto rounded-xl border border-[var(--card-border)]"><table className="w-full text-left text-[10px]"><thead><tr>{names.map(n => <th key={n} className="px-3 py-2">{n}</th>)}<th className="px-3 py-2">F</th></tr></thead><tbody>{rows.map((row,i)=><tr key={i} className="border-t border-[var(--card-border)]/60">{names.map(n=><td key={n} className="px-3 py-1.5 font-mono">{row.values[n]}</td>)}<td className="px-3 py-1.5 font-mono font-semibold">{row.output}</td></tr>)}</tbody></table></div>}
      {verified && valid && <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[10px] text-emerald-300">Expression verified across every generated input combination.</div>}
      <div className="mt-3 rounded-xl bg-[var(--surface-2)] p-3 text-[10px]"><span className="text-[var(--muted-foreground)]">De Morgan:</span> NOT(A AND B) = (NOT A) OR (NOT B). NOT(A OR B) = (NOT A) AND (NOT B).</div>
    </div>
  );
}

const MAP_LABELS = ["00", "01", "11", "10"];
const MINTERMS = [0, 1, 3, 2];

function literalFor(minterm: number) {
  const a = (minterm >> 1) & 1;
  const b2 = minterm & 1;
  return `${a ? "A" : "NOT A"} AND ${b2 ? "B" : "NOT B"}`;
}

function kMapGroups(cells: Bit[]) {
  const candidates = [[0,1],[1,2],[2,3],[3,0],[0,1,2,3]];
  return candidates.filter(group => group.every(index => cells[index] === 1)).sort((a,b) => b.length-a.length);
}
function kMapGroupLabel(group: number[]) {
  if (group.length === 4) return "4-cell group: 1 essential group";
  const labels = group.map(index => MAP_LABELS[index]).join(" ↔ ");
  return group.length === 2 ? `2-cell group: ${labels}` : `1-cell group: ${labels}`;
}
function kMapTerm(group: number[]) {
  if (group.length === 4) return "1";
  const minterms = group.map(index => MINTERMS[index]);
  if (group.length === 2) {
    const sameA = ((minterms[0] >> 1) & 1) === ((minterms[1] >> 1) & 1);
    const sameB = (minterms[0] & 1) === (minterms[1] & 1);
    if (sameA) return ((minterms[0] >> 1) & 1) ? "A" : "NOT A";
    if (sameB) return (minterms[0] & 1) ? "B" : "NOT B";
  }
  return literalFor(minterms[0]);
}

function kMapCandidateGroups(cells: Bit[]) {
  const candidates = [[0,1,2,3],[0,1],[1,2],[2,3],[3,0],[0],[1],[2],[3]];
  return candidates.filter(group => group.every(index => cells[index] === 1));
}

function simplifyKMap(cells: Bit[]) {
  const ones = MINTERMS.filter((_, index) => cells[index] === 1);
  if (ones.length === 0) return "0";
  if (ones.length === 4) return "1";

  const groups = kMapCandidateGroups(cells);
  const covers = (group: number[]) => new Set(group.map(index => MINTERMS[index]));
  const uncovered = new Set(ones);
  const chosen: number[][] = [];

  while (uncovered.size) {
    const essential = groups.filter(group => {
      const groupMinterms = covers(group);
      return [...uncovered].some(minterm => groupMinterms.has(minterm));
    }).sort((a, b) => b.length - a.length)[0];
    if (!essential) break;
    chosen.push(essential);
    covers(essential).forEach(minterm => uncovered.delete(minterm));
    groups.splice(groups.indexOf(essential), 1);
  }

  return chosen.map(kMapTerm).join(" OR ") || "0";
}

const KMAP_QUESTIONS: Bit[][] = [
  [1, 1, 0, 0],
  [0, 1, 1, 0],
  [1, 0, 0, 1],
  [1, 1, 1, 1],
  [0, 0, 0, 0],
];

type BooleanQuestion = { id: string; prompt: string; options: string[]; answer: string; explanation: string };

const BOOLEAN_QUESTIONS: BooleanQuestion[] = [
  { id: "bool-1", prompt: "Which expression is equivalent to NOT(A AND B)?", options: ["(NOT A) AND (NOT B)", "(NOT A) OR (NOT B)", "A OR B", "A AND B"], answer: "(NOT A) OR (NOT B)", explanation: "De Morgan's law changes AND into OR when the whole expression is complemented." },
  { id: "bool-2", prompt: "Which expression is equivalent to NOT(A OR B)?", options: ["(NOT A) OR (NOT B)", "(NOT A) AND (NOT B)", "A XOR B", "A AND B"], answer: "(NOT A) AND (NOT B)", explanation: "De Morgan's law changes OR into AND when the whole expression is complemented." },
  { id: "bool-3", prompt: "What is A AND 1 equivalent to?", options: ["0", "1", "A", "NOT A"], answer: "A", explanation: "AND with 1 leaves the value unchanged." },
  { id: "bool-4", prompt: "What is A OR 0 equivalent to?", options: ["0", "1", "A", "NOT A"], answer: "A", explanation: "OR with 0 leaves the value unchanged." },
  { id: "bool-5", prompt: "What is A XOR A equivalent to?", options: ["A", "NOT A", "0", "1"], answer: "0", explanation: "XOR is 1 only when inputs differ, so identical inputs produce 0." },
];

function BooleanQuestionLab() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [checked, setChecked] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const question = BOOLEAN_QUESTIONS[index];
  const correct = answer === question.answer;
  const next = () => {
    setIndex(value => (value + 1) % BOOLEAN_QUESTIONS.length);
    setAnswer("");
    setChecked(false);
  };
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-2">
        <div><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Boolean practice</div><div className="mt-1 text-sm font-semibold">Simplify & identify laws</div></div>
        <span className="text-[9px] text-[var(--muted-foreground)]">Score {score}/{BOOLEAN_QUESTIONS.length}</span>
      </div>
      <p className="mt-3 text-xs leading-5">{question.prompt}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{question.options.map(option => <button key={option} type="button" onClick={() => { setAnswer(option); setChecked(false); }} className={"rounded-xl border p-3 text-left text-[10px] " + (answer === option ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)]")}>{option}</button>)}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!answer} onClick={() => { setChecked(true); if (correct && !completed.includes(question.id)) { setCompleted(value => [...value, question.id]); setScore(value => value + 1); } }} className="rounded-xl bg-[var(--primary)] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-40">Check</button>
        <button type="button" onClick={next} className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-[10px]">Next</button>
      </div>
      {checked && <div className={"mt-3 rounded-xl border p-3 text-[10px] " + (correct ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300" : "border-red-500/20 bg-red-500/5 text-red-300")}><div className="font-semibold">{correct ? "Correct" : "Not yet"}</div><div className="mt-1">{question.explanation}</div></div>}
    </div>
  );
}

function KMapLab() {
  const [cells, setCells] = useState<Bit[]>([0,1,0,0]);
  const [targetIndex, setTargetIndex] = useState(0);
  const target = KMAP_QUESTIONS[targetIndex];
  const targetExpression = useMemo(() => simplifyKMap(target), [target]);
  const solved = cells.every((v,i) => v === target[i]);
  const currentExpression = useMemo(() => simplifyKMap(cells), [cells]);
  const loadQuestion = (index: number) => {
    setTargetIndex(index);
    setCells([0, 0, 0, 0]);
  };

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2"><Table2 className="h-4 w-4 text-[var(--primary)]" /><div><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Karnaugh map lab</div><div className="mt-1 text-sm font-semibold">Group adjacent 1s and simplify</div></div></div>
      <p className="mt-2 text-[10px] leading-5 text-[var(--muted-foreground)]">Two-variable K-map. Columns are Gray-code ordered. Toggle cells to build the function. Highlighted groups show adjacent 1s, including wrap-around adjacency, and the minimized SOP is generated from valid groups.</p>
      <div className="mt-4 max-w-md rounded-xl border border-[var(--card-border)] p-3">
        <div className="grid grid-cols-4 gap-2 text-center text-[9px] text-[var(--muted-foreground)]">{MAP_LABELS.map(label => <div key={label}>{label}</div>)}</div>
        <div className="mt-2 grid grid-cols-4 gap-2">{cells.map((value,i)=>{ const groups=kMapGroups(cells).filter(group=>group.includes(i)); return <button key={i} type="button" aria-label={`K-map cell ${MAP_LABELS[i]}, value ${value}`} title={groups.map(kMapGroupLabel).join(" • ") || "No valid adjacent group yet"} onClick={()=>setCells(c=>c.map((v,j)=>j===i?(v?0:1):v))} className={"relative rounded-xl border p-4 font-mono text-lg " + (value ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)]") + (groups.length ? " ring-2 ring-[var(--primary)]/40" : "")}>{value}<span className="absolute right-1.5 top-1 text-[7px] text-[var(--muted-foreground)]">{MINTERMS[i]}</span></button>})}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">{kMapGroups(cells).map((group,index) => <span key={`${group.join("-")}-${index}`} className="rounded-full border border-[var(--card-border)] px-2 py-1 text-[8px] text-[var(--muted-foreground)]">{kMapGroupLabel(group)}</span>)}{kMapGroups(cells).length === 0 && <span className="text-[8px] text-[var(--muted-foreground)]">Turn on adjacent 1s to form valid groups. Wrap-around cells are adjacent.</span>}</div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-[var(--surface-2)] p-3 text-[10px]"><div className="text-[var(--muted-foreground)]">Your simplified form</div><div className="mt-1 font-mono">{currentExpression}</div></div><div className="rounded-xl bg-[var(--surface-2)] p-3 text-[10px]"><div className="text-[var(--muted-foreground)]">Target solution</div><div className="mt-1 font-mono">{solved ? targetExpression : "Hidden until the map matches"}</div></div></div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[9px] text-[var(--muted-foreground)]">Question {targetIndex + 1}/{KMAP_QUESTIONS.length}</span>
        {KMAP_QUESTIONS.map((_, i) => <button key={i} type="button" onClick={() => loadQuestion(i)} className={"rounded-lg border px-2 py-1 text-[9px] " + (i === targetIndex ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)]")}>Load {i + 1}</button>)}
        <button type="button" onClick={() => setCells([0,0,0,0])} className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-[9px]">Clear map</button>
      </div>
      {solved && <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[10px] text-emerald-300"><Check className="mr-1 inline h-3.5 w-3.5" />Map matches the target. Simplified form: <span className="font-mono">{targetExpression}</span></div>}
    </div>
  );
}

function FlipFlopLab() {
  const [srQ, setSrQ] = useState<Bit>(0);
  const [jkQ, setJkQ] = useState<Bit>(0);
  const [clock, setClock] = useState<0 | 1>(0);
  const [clockCycles, setClockCycles] = useState(0);
  const [s, setS] = useState<Bit>(0); const [r, setR] = useState<Bit>(0);
  const [j, setJ] = useState<Bit>(0); const [k, setK] = useState<Bit>(0);
  const srState = s && r ? "Invalid" : s ? "Set" : r ? "Reset" : "Hold";
  const jkNext: Bit = j === 0 && k === 0 ? jkQ : j === 0 ? 0 : k === 0 ? 1 : jkQ ? 0 : 1;
  const srNext: Bit = s && !r ? 1 : !s && r ? 0 : srQ;
  const pulseClock = () => {
    setClock(1);
    setClockCycles(value => value + 1);
    setJkQ(jkNext);
    window.setTimeout(() => setClock(0), 180);
  };
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2"><ToggleLeft className="h-4 w-4 text-[var(--primary)]" /><div><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Sequential logic</div><div className="mt-1 text-sm font-semibold">SR & JK flip-flop sandbox</div></div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--card-border)] p-3">
          <div className="text-[10px] font-semibold">SR latch</div>
          <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setS(s?0:1)} className="rounded-lg border p-2 text-xs">S = {s}</button><button type="button" onClick={()=>setR(r?0:1)} className="rounded-lg border p-2 text-xs">R = {r}</button></div>
          <button type="button" onClick={()=>{if(!(s&&r))setSrQ(srNext)}} className="mt-2 w-full rounded-lg bg-[var(--primary)] p-2 text-[10px] font-semibold text-white">Apply SR</button>
          <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs"><span>Q = {srQ}</span><span>Q̅ = {srQ ? 0 : 1}</span></div>
          <div className="mt-2 text-[9px] text-[var(--muted-foreground)]">{srState}. S=R=1 is intentionally exposed as invalid.</div>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] p-3">
          <div className="text-[10px] font-semibold">JK flip-flop</div>
          <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setJ(j?0:1)} className="rounded-lg border p-2 text-xs">J = {j}</button><button type="button" onClick={()=>setK(k?0:1)} className="rounded-lg border p-2 text-xs">K = {k}</button></div>
          <button type="button" onClick={pulseClock} className="mt-2 w-full rounded-lg bg-[var(--primary)] p-2 text-[10px] font-semibold text-white">Clock pulse</button>
          <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs"><span>Q = {jkQ}</span><span>Q̅ = {jkQ ? 0 : 1}</span></div>
          <div className="mt-2 text-[9px] text-[var(--muted-foreground)]">Next Q = {jkNext}. J=K=1 toggles the stored state.</div>\n          <div className="mt-3 rounded-lg bg-[var(--surface-2)] p-2"><div className="flex items-center justify-between text-[9px] text-[var(--muted-foreground)]"><span>Clock</span><span>pulses: {clockCycles}</span></div><div className="mt-2 flex h-8 items-end gap-1" aria-label="Clock waveform">{Array.from({length: 12}, (_, i) => <span key={i} className={"w-3 rounded-sm " + (((i + clockCycles) % 2) === 0 ? "h-2 bg-[var(--muted)]" : "h-6 bg-[var(--primary)]")}></span>)}</div><div className="mt-1 text-[8px] text-[var(--muted-foreground)]">Each pulse represents an active clock edge that updates Q.</div></div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2"><div className="overflow-auto rounded-xl border border-[var(--card-border)]"><div className="border-b border-[var(--card-border)] px-3 py-2 text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">SR truth table</div><table className="w-full text-left text-[9px]"><thead><tr>{["S","R","Q(next)","State"].map(h=><th key={h} className="px-2 py-2">{h}</th>)}</tr></thead><tbody>{[["0","0","Q","Hold"],["0","1","0","Reset"],["1","0","1","Set"],["1","1","Invalid","Invalid"]].map(row=><tr key={row[0]+row[1]} className="border-t border-[var(--card-border)]/60">{row.map((cell,i)=><td key={i} className="px-2 py-1.5 font-mono">{cell}</td>)}</tr>)}</tbody></table></div><div className="overflow-auto rounded-xl border border-[var(--card-border)]"><div className="border-b border-[var(--card-border)] px-3 py-2 text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">JK truth table</div><table className="w-full text-left text-[9px]"><thead><tr>{["J","K","Q(next)","Action"].map(h=><th key={h} className="px-2 py-2">{h}</th>)}</tr></thead><tbody>{[["0","0","Q","Hold"],["0","1","0","Reset"],["1","0","1","Set"],["1","1","Q̅","Toggle"]].map(row=><tr key={row[0]+row[1]} className="border-t border-[var(--card-border)]/60">{row.map((cell,i)=><td key={i} className="px-2 py-1.5 font-mono">{cell}</td>)}</tr>)}</tbody></table></div></div>
    </div>
  );
}

export default function BooleanLogicLab() {
  const [resetKey, setResetKey] = useState(0);
  return <section key={resetKey} className="space-y-3"><BooleanLab /><BooleanQuestionLab /><KMapLab /><FlipFlopLab /><button type="button" onClick={()=>setResetKey(k=>k+1)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-3 py-2 text-[10px] text-[var(--muted-foreground)]"><RotateCcw className="h-3.5 w-3.5" />Reset advanced logic labs</button></section>;
}
