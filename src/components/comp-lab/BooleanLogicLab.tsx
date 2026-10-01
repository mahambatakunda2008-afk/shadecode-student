"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw, Sigma, Table2, ToggleLeft } from "lucide-react";

type Bit = 0 | 1;
type Gate = "AND" | "OR" | "NAND" | "NOR" | "XOR";

const bit = (v: boolean | number): Bit => v ? 1 : 0;
const evalGate = (gate: Gate, a: Bit, b: Bit): Bit => {
  if (gate === "AND") return bit(a === 1 && b === 1);
  if (gate === "OR") return bit(a === 1 || b === 1);
  if (gate === "NAND") return bit(!(a === 1 && b === 1));
  if (gate === "NOR") return bit(!(a === 1 || b === 1));
  return bit(a !== b);
};

const evalExpr = (expr: string, values: Record<string, Bit>): Bit | null => {
  let s = expr.toUpperCase().replace(/\s+/g, "");
  if (!s || !/^[ABC01()NOTANDORNANDNORXOR]+$/.test(s)) return null;
  Object.entries(values).forEach(([key, value]) => { s = s.replaceAll(key, String(value)); });
  let guard = 0;
  while (/[()]/.test(s) && guard++ < 20) {
    const before = s;
    s = s.replace(/\(([^()]+)\)/g, "$1");
    if (s === before) break;
  }
  s = s.replace(/NOT([01])/g, (_, v) => v === "1" ? "0" : "1");
  const reduceOp = (word: string, fn: (a: Bit, b: Bit) => Bit) => {
    const re = new RegExp("([01])" + word + "([01])");
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) s = s.slice(0, m.index) + fn(Number(m[1]) as Bit, Number(m[2]) as Bit) + s.slice(m.index + m[0].length);
  };
  ["XOR","NAND","NOR","AND","OR"].forEach(word => reduceOp(word, (a,b) => evalGate(word as Gate,a,b)));
  return s === "0" ? 0 : s === "1" ? 1 : null;
};

const combinations = (names: string[]) => Array.from({ length: 2 ** names.length }, (_, i) =>
  Object.fromEntries(names.map((n, j) => [n, ((i >> (names.length - j - 1)) & 1) as Bit]))
);

function BooleanLab() {
  const [expr, setExpr] = useState("(A AND B) OR C");
  const [verified, setVerified] = useState(false);
  const names = useMemo(() => ["A","B","C"].filter(n => expr.toUpperCase().includes(n)), [expr]);
  const rows = useMemo(() => combinations(names).map(values => ({ values, output: evalExpr(expr, values) })), [expr, names]);
  const valid = rows.length > 0 && rows.every(r => r.output !== null);
  return <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
    <div className="flex items-center gap-2"><Sigma className="h-4 w-4 text-[var(--primary)]" /><div><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Boolean algebra lab</div><div className="mt-1 text-sm font-semibold">Expression → truth table</div></div></div>
    <p className="mt-2 text-[10px] leading-5 text-[var(--muted-foreground)]">Write an expression using A, B, C, NOT, AND, OR, NAND, NOR or XOR. Every input combination is evaluated automatically.</p>
    <input value={expr} onChange={e => { setExpr(e.target.value); setVerified(false); }} className="mt-3 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3 font-mono text-xs" />
    <div className="mt-3 flex items-center gap-2"><button type="button" disabled={!valid} onClick={() => setVerified(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-40"><Check className="h-3.5 w-3.5" />Verify expression</button><span className="text-[9px] text-[var(--muted-foreground)]">{valid ? rows.length + " rows generated" : "Use valid Boolean syntax"}</span></div>
    {valid && <div className="mt-3 overflow-auto rounded-xl border border-[var(--card-border)]"><table className="w-full text-left text-[10px]"><thead><tr>{names.map(n => <th key={n} className="px-3 py-2">{n}</th>)}<th className="px-3 py-2">F</th></tr></thead><tbody>{rows.map((row,i)=><tr key={i} className="border-t border-[var(--card-border)]/60">{names.map(n=><td key={n} className="px-3 py-1.5 font-mono">{row.values[n]}</td>)}<td className="px-3 py-1.5 font-mono font-semibold">{row.output}</td></tr>)}</tbody></table></div>}
    {verified && valid && <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[10px] text-emerald-300">Expression verified across every generated input combination.</div>}
    <div className="mt-3 rounded-xl bg-[var(--surface-2)] p-3 text-[10px]"><span className="text-[var(--muted-foreground)]">Useful law:</span> NOT(A AND B) = (NOT A) OR (NOT B). NOT(A OR B) = (NOT A) AND (NOT B).</div>
  </div>;
}

function KMapLab() {
  const [cells, setCells] = useState<Bit[]>([0,0,0,0]);
  const [target, setTarget] = useState<Bit[]>([1,1,0,0]);
  const solved = cells.every((v,i) => v === target[i]);
  const labels = ["00","01","11","10"];
  return <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
    <div className="flex items-center gap-2"><Table2 className="h-4 w-4 text-[var(--primary)]" /><div><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Karnaugh map practice</div><div className="mt-1 text-sm font-semibold">Match the target function</div></div></div>
    <p className="mt-2 text-[10px] leading-5 text-[var(--muted-foreground)]">Toggle the four cells until your map matches the target. Columns use Gray-code order: 00, 01, 11, 10.</p>
    <div className="mt-4 grid max-w-md grid-cols-4 gap-2">{cells.map((value,i)=><button key={i} type="button" onClick={()=>setCells(c=>c.map((v,j)=>j===i?(v?0:1):v))} className={"rounded-xl border p-4 font-mono text-lg " + (value ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)]")}>{value}</button>)}</div>
    <div className="mt-3 flex flex-wrap gap-2">{target.map((v,i)=><button key={i} type="button" onClick={()=>setTarget(t=>t.map((x,j)=>j===i?(x?0:1):x))} className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-[9px]">Target {labels[i]}: {v}</button>)}</div>
    {solved && <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[10px] text-emerald-300"><Check className="mr-1 inline h-3.5 w-3.5" />Map matches the target.</div>}
  </div>;
}

function FlipFlopLab() {
  const [q, setQ] = useState<Bit>(0); const [s, setS] = useState<Bit>(0); const [r, setR] = useState<Bit>(0); const [j, setJ] = useState<Bit>(0); const [k, setK] = useState<Bit>(0);
  const sr = s === 1 && r === 1 ? "Invalid" : s === 1 ? "Set" : r === 1 ? "Reset" : "Hold";
  const jkNext: Bit = j === 0 && k === 0 ? q : j === 0 ? 0 : k === 0 ? 1 : q ? 0 : 1;
  return <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
    <div className="flex items-center gap-2"><ToggleLeft className="h-4 w-4 text-[var(--primary)]" /><div><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Sequential logic</div><div className="mt-1 text-sm font-semibold">SR & JK flip-flop sandbox</div></div></div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-[var(--card-border)] p-3"><div className="text-[10px] font-semibold">SR latch model</div><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setS(s?0:1)} className="rounded-lg border p-2 text-xs">S = {s}</button><button type="button" onClick={()=>setR(r?0:1)} className="rounded-lg border p-2 text-xs">R = {r}</button></div><button type="button" onClick={()=>{if(s===1&&r===0)setQ(1);else if(s===0&&r===1)setQ(0)}} className="mt-2 w-full rounded-lg bg-[var(--primary)] p-2 text-[10px] font-semibold text-white">Apply SR</button><div className="mt-2 font-mono text-xs">Q = {q} · {sr}</div></div>
      <div className="rounded-xl border border-[var(--card-border)] p-3"><div className="text-[10px] font-semibold">JK flip-flop model</div><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setJ(j?0:1)} className="rounded-lg border p-2 text-xs">J = {j}</button><button type="button" onClick={()=>setK(k?0:1)} className="rounded-lg border p-2 text-xs">K = {k}</button></div><button type="button" onClick={()=>setQ(jkNext)} className="mt-2 w-full rounded-lg bg-[var(--primary)] p-2 text-[10px] font-semibold text-white">Clock / apply</button><div className="mt-2 font-mono text-xs">Q(next) = {jkNext}</div></div>
    </div>
    <p className="mt-3 text-[9px] leading-4 text-[var(--muted-foreground)]">The SR model exposes S=R=1 as invalid. The JK model demonstrates hold, reset, set and toggle behaviour.</p>
  </div>;
}

export default function BooleanLogicLab() {
  const [resetKey, setResetKey] = useState(0);
  return <section key={resetKey} className="space-y-3"><BooleanLab /><KMapLab /><FlipFlopLab /><button type="button" onClick={()=>setResetKey(k=>k+1)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-3 py-2 text-[10px] text-[var(--muted-foreground)]"><RotateCcw className="h-3.5 w-3.5" />Reset advanced logic labs</button></section>;
}
