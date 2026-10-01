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

function simplifyKMap(cells: Bit[]) {
  const ones = MINTERMS.filter((_, index) => cells[index] === 1);
  if (ones.length === 0) return "0";
  if (ones.length === 4) return "1";
  const groups: number[][] = [];
  const add = (indexes: number[]) => {
    if (indexes.every(index => cells[index] === 1)) groups.push(indexes);
  };
  add([0,1,2,3]);
  add([0,1]); add([1,2]); add([2,3]); add([3,0]);
  add([0]); add([1]); add([2]); add([3]);
  const chosen: number[][] = [];
  const covered = new Set<number>();
  for (const group of groups.sort((x,y) => y.length - x.length)) {
    if (group.some(index => !covered.has(MINTERMS[index]))) {
      chosen.push(group);
      group.forEach(index => covered.add(MINTERMS[index]));
    }
  }
  return chosen.map(group => {
    if (group.length === 2) {
      const m = group.map(index => MINTERMS[index]);
      const sameA = ((m[0] >> 1) & 1) === ((m[1] >> 1) & 1);
      const sameB = (m[0] & 1) === (m[1] & 1);
      return sameA ? (((m[0] >> 1) & 1) ? "A" : "NOT A") : sameB ? ((m[0] & 1) ? "B" : "NOT B") : "1";
    }
    return literalFor(MINTERMS[group[0]]);
  }).join(" OR ");
}

function KMapLab() {
  const [cells, setCells] = useState<Bit[]>([0,1,0,0]);
  const [target, setTarget] = useState<Bit[]>([1,1,0,0]);
  const targetExpression = useMemo(() => simplifyKMap(target), [target]);
  const solved = cells.every((v,i) => v === target[i]);
  const currentExpression = useMemo(() => simplifyKMap(cells), [cells]);

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2"><Table2 className="h-4 w-4 text-[var(--primary)]" /><div><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Karnaugh map lab</div><div className="mt-1 text-sm font-semibold">Group adjacent 1s and simplify</div></div></div>
      <p className="mt-2 text-[10px] leading-5 text-[var(--muted-foreground)]">Two-variable K-map. Columns are Gray-code ordered. Toggle cells, then inspect the minimized SOP expression generated from the largest valid groups.</p>
      <div className="mt-4 max-w-md rounded-xl border border-[var(--card-border)] p-3">
        <div className="grid grid-cols-4 gap-2 text-center text-[9px] text-[var(--muted-foreground)]">{MAP_LABELS.map(label => <div key={label}>{label}</div>)}</div>
        <div className="mt-2 grid grid-cols-4 gap-2">{cells.map((value,i)=><button key={i} type="button" onClick={()=>setCells(c=>c.map((v,j)=>j===i?(v?0:1):v))} className={"rounded-xl border p-4 font-mono text-lg " + (value ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)]")}>{value}</button>)}</div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-[var(--surface-2)] p-3 text-[10px]"><div className="text-[var(--muted-foreground)]">Current simplified form</div><div className="mt-1 font-mono">{currentExpression}</div></div><div className="rounded-xl bg-[var(--surface-2)] p-3 text-[10px]"><div className="text-[var(--muted-foreground)]">Target</div><div className="mt-1 font-mono">{targetExpression}</div></div></div>
      <div className="mt-3 flex flex-wrap gap-2">{target.map((v,i)=><button key={i} type="button" onClick={()=>setTarget(t=>t.map((x,j)=>j===i?(x?0:1):x))} className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-[9px]">Target {MAP_LABELS[i]}: {v}</button>)}</div>
      {solved && <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[10px] text-emerald-300"><Check className="mr-1 inline h-3.5 w-3.5" />Map matches the target.</div>}
    </div>
  );
}

function FlipFlopLab() {
  const [srQ, setSrQ] = useState<Bit>(0);
  const [jkQ, setJkQ] = useState<Bit>(0);
  const [s, setS] = useState<Bit>(0); const [r, setR] = useState<Bit>(0);
  const [j, setJ] = useState<Bit>(0); const [k, setK] = useState<Bit>(0);
  const srState = s && r ? "Invalid" : s ? "Set" : r ? "Reset" : "Hold";
  const jkNext: Bit = j === 0 && k === 0 ? jkQ : j === 0 ? 0 : k === 0 ? 1 : jkQ ? 0 : 1;
  const srNext: Bit = s && !r ? 1 : !s && r ? 0 : srQ;
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
          <button type="button" onClick={()=>setJkQ(jkNext)} className="mt-2 w-full rounded-lg bg-[var(--primary)] p-2 text-[10px] font-semibold text-white">Clock pulse</button>
          <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs"><span>Q = {jkQ}</span><span>Q̅ = {jkQ ? 0 : 1}</span></div>
          <div className="mt-2 text-[9px] text-[var(--muted-foreground)]">Next Q = {jkNext}. J=K=1 toggles the stored state.</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[9px]">{[["0","0","Hold"],["0","1","Reset"],["1","0","Set"],["1","1","Toggle"]].map(([a,c,label])=><div key={label} className="rounded-lg bg-[var(--surface-2)] p-2 font-mono">J={a}, K={c}<br/><span className="font-sans text-[var(--muted-foreground)]">{label}</span></div>)}</div>
    </div>
  );
}

export default function BooleanLogicLab() {
  const [resetKey, setResetKey] = useState(0);
  return <section key={resetKey} className="space-y-3"><BooleanLab /><KMapLab /><FlipFlopLab /><button type="button" onClick={()=>setResetKey(k=>k+1)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-3 py-2 text-[10px] text-[var(--muted-foreground)]"><RotateCcw className="h-3.5 w-3.5" />Reset advanced logic labs</button></section>;
}
