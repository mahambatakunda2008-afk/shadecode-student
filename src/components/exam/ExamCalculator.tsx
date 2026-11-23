"use client";

import { useMemo, useState } from "react";
import { Activity, Calculator, ChartNoAxesCombined, Clock3, Sigma, X } from "lucide-react";
import { definiteIntegral, derivative, descriptiveStatistics, evaluateExpression, formatResult, solveByBisection } from "@/lib/exam/calculator";

type Tab = "scientific" | "calculus" | "graph" | "statistics";
type HistoryItem = { expression: string; result: string };

const keys = ["sin(", "cos(", "tan(", "ln(", "log(", "sqrt(", "(", ")", "π", "e", "x", "^", "!", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "%", "⌫"];

export default function ExamCalculator({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("scientific");
  const [expression, setExpression] = useState("sin(30)^2 + cos(30)^2");
  const [result, setResult] = useState("1");
  const [error, setError] = useState("");
  const [angle, setAngle] = useState<"DEG" | "RAD">("DEG");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [precision, setPrecision] = useState("10");
  const [functionText, setFunctionText] = useState("x^2");
  const [xValue, setXValue] = useState("2");
  const [lower, setLower] = useState("0");
  const [upper, setUpper] = useState("1");
  const [statsInput, setStatsInput] = useState("4, 7, 7, 9, 13");
  const [graphMin, setGraphMin] = useState("-5");
  const [graphMax, setGraphMax] = useState("5");

  const calculate = () => {
    try {
      const value = evaluateExpression(expression, {}, angle);
      const formatted = formatResult(value, Number(precision));
      setResult(formatted); setError("");
      setHistory((items) => [{ expression, result: formatted }, ...items].slice(0, 30));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not calculate this expression"); }
  };
  const insert = (key: string) => {
    if (key === "⌫") setExpression((v) => v.slice(0, -1));
    else setExpression((v) => v + (key === "π" ? "pi" : key === "×" ? "*" : key === "÷" ? "/" : key === "−" ? "-" : key));
  };
  const graph = useMemo(() => {
    try {
      const min = Number(graphMin), max = Number(graphMax);
      if (!(max > min)) return "";
      const points = Array.from({ length: 161 }, (_, i) => {
        const x = min + (max - min) * i / 160;
        try { const y = evaluateExpression(functionText, { x }, angle); return Number.isFinite(y) ? { x, y } : null; } catch { return null; }
      });
      const finite = points.filter((p): p is { x: number; y: number } => !!p && Math.abs(p.y) < 1e5);
      if (!finite.length) return "";
      const ymin = Math.min(-1, ...finite.map((p) => p.y)), ymax = Math.max(1, ...finite.map((p) => p.y));
      return points.map((p, i) => {
        if (!p || Math.abs(p.y) >= 1e5) return "";
        const px = (i / 160) * 640, py = 260 - ((p.y - ymin) / (ymax - ymin)) * 240;
        return `${i === 0 || !points[i - 1] ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`;
      }).filter(Boolean).join(" ");
    } catch { return ""; }
  }, [functionText, graphMin, graphMax, angle]);

  const calculusResult = (() => {
    if (tab !== "calculus" || !functionText.trim()) return null;
    const attempt = (run: () => number) => { try { return formatResult(run()); } catch { return "Unavailable for this input"; } };
    const x = Number(xValue), a = Number(lower), b = Number(upper);
    return {
      slope: attempt(() => derivative(functionText, x, angle)),
      area: attempt(() => definiteIntegral(functionText, a, b, angle)),
      root: attempt(() => solveByBisection(functionText, a, b, angle)),
    };
  })();
  const stats = (() => {
    try { return descriptiveStatistics(statsInput.split(/[,;\s]+/).filter(Boolean).map(Number)); } catch { return null; }
  })();

  return <section className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl" aria-label="Advanced scientific calculator">
    <header className="flex flex-wrap items-center gap-3 border-b border-[var(--card-border)] px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Calculator size={19} /></div>
      <div className="min-w-0 flex-1"><p className="text-sm font-black">Shadecode Scientific</p><p className="text-[10px] text-[var(--muted-foreground)]">Offline mathematics workspace</p></div>
      <button onClick={() => setAngle((v) => v === "DEG" ? "RAD" : "DEG")} className="min-h-10 rounded-lg border border-[var(--card-border)] px-3 text-xs font-black" aria-label="Toggle angle mode">{angle}</button>
      <button onClick={onClose} className="min-h-10 min-w-10 rounded-lg hover:bg-[var(--muted)]" aria-label="Close calculator"><X size={18} /></button>
    </header>
    <nav className="grid grid-cols-4 gap-1 border-b border-[var(--card-border)] p-2" aria-label="Calculator tools">
      {([{ id: "scientific", label: "Scientific", icon: Calculator }, { id: "calculus", label: "Calculus", icon: Sigma }, { id: "graph", label: "Graph", icon: ChartNoAxesCombined }, { id: "statistics", label: "Statistics", icon: Activity }] as const).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold ${tab === id ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}><Icon size={14} />{label}</button>)}
    </nav>
    {tab === "scientific" && <div className="grid gap-3 p-3 md:grid-cols-[1fr_220px]">
      <div className="min-w-0">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]" htmlFor="exam-calc-expression">Expression</label>
        <input id="exam-calc-expression" value={expression} onChange={(e) => setExpression(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") calculate(); }} className="mt-2 min-h-14 w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted)] px-4 font-mono text-lg" placeholder="Enter a mathematical expression" />
        <div className="mt-2 flex min-h-16 items-center justify-between gap-3 rounded-xl bg-[var(--muted)] px-4 py-3"><div className="min-w-0"><p className="text-[10px] uppercase text-[var(--muted-foreground)]">Result</p><p className="truncate font-mono text-2xl font-black" aria-live="polite">{result}</p></div><button onClick={calculate} className="min-h-11 rounded-xl bg-[var(--primary)] px-5 font-black text-[var(--primary-foreground)]">Calculate</button></div>
        {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
        <div className="mt-3 grid grid-cols-5 gap-1.5">{keys.map((key, i) => <button key={i} onClick={() => insert(key)} className={`min-h-11 rounded-lg border border-[var(--card-border)] text-sm font-bold ${["sin(", "cos(", "tan(", "ln(", "log(", "sqrt("].includes(key) ? "bg-[var(--primary-glow)] text-[var(--primary)]" : "bg-[var(--muted)] hover:border-[var(--primary)]"}`}>{key}</button>)}</div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><label className="text-xs text-[var(--muted-foreground)]" htmlFor="calc-precision">Significant digits</label><select id="calc-precision" value={precision} onChange={(e) => setPrecision(e.target.value)} className="min-h-9 rounded-lg border border-[var(--card-border)] bg-[var(--muted)] px-2 text-xs"><option value="6">6</option><option value="8">8</option><option value="10">10</option><option value="12">12</option><option value="15">15</option></select><span className="text-[10px] text-[var(--muted-foreground)]">Constants: π, e, φ, τ · Functions: trig, inverse trig, logs, roots, factorial, min/max</span></div>
      </div>
      <aside className="rounded-xl border border-[var(--card-border)] p-3"><div className="flex items-center gap-2 text-xs font-black"><Clock3 size={14} /> History</div><div className="mt-2 max-h-80 space-y-2 overflow-auto">{history.length ? history.map((item, i) => <button key={i} onClick={() => { setExpression(item.expression); setResult(item.result); }} className="block w-full rounded-lg bg-[var(--muted)] p-2 text-left"><p className="truncate font-mono text-[10px] text-[var(--muted-foreground)]">{item.expression}</p><p className="truncate font-mono text-sm font-bold">{item.result}</p></button>) : <p className="text-xs text-[var(--muted-foreground)]">Your calculations will appear here.</p>}</div></aside>
    </div>}
    {(tab === "calculus" || tab === "graph") && <div className="space-y-3 p-4">
      <label className="block text-xs font-bold" htmlFor="calc-function">Function f(x)</label><input id="calc-function" value={functionText} onChange={(e) => setFunctionText(e.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted)] px-3 font-mono" placeholder="e.g. x^3 - 4x" />
      {tab === "calculus" ? <><div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold">At x<input value={xValue} onChange={(e) => setXValue(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--muted)] px-2 font-mono" /></label><label className="text-xs font-semibold">Lower limit<input value={lower} onChange={(e) => setLower(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--muted)] px-2 font-mono" /></label><label className="text-xs font-semibold">Upper limit<input value={upper} onChange={(e) => setUpper(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--muted)] px-2 font-mono" /></label></div><div className="grid gap-2 sm:grid-cols-3"><Metric label="Numerical derivative f′(x)" value={calculusResult?.slope ?? "Check function / interval"} /><Metric label="Definite integral" value={calculusResult?.area ?? "Check function / interval"} /><Metric label="Bracketed root" value={calculusResult?.root ?? "Check function / interval"} /></div><p className="text-[10px] text-[var(--muted-foreground)]">Numerical methods: five-point derivative, Simpson’s rule integration and bisection root finding. These are approximations, not symbolic proofs.</p></> : <><div className="grid grid-cols-2 gap-2"><label className="text-xs font-semibold">x minimum<input value={graphMin} onChange={(e) => setGraphMin(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--muted)] px-2" /></label><label className="text-xs font-semibold">x maximum<input value={graphMax} onChange={(e) => setGraphMax(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--muted)] px-2" /></label></div><div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--muted)] p-2"><svg viewBox="0 0 640 280" role="img" aria-label={`Graph of y equals ${functionText}`} className="w-full"><path d="M0 140H640 M320 0V280" stroke="currentColor" opacity=".25" strokeDasharray="4 5" /><path d={graph} fill="none" stroke="var(--primary)" strokeWidth="3" /></svg></div></>}
    </div>}
    {tab === "statistics" && <div className="space-y-3 p-4"><label className="block text-xs font-bold" htmlFor="calc-stat-values">Data values (comma or space separated)</label><textarea id="calc-stat-values" value={statsInput} onChange={(e) => setStatsInput(e.target.value)} rows={3} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted)] p-3 font-mono text-sm" />{stats ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(stats).map(([key, value]) => <Metric key={key} label={key.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`)} value={formatResult(value)} />)}</div> : <p className="text-xs text-red-500">Enter valid numeric data.</p>}<p className="text-[10px] text-[var(--muted-foreground)]">Population variance and standard deviation are shown. Frequency tables and sample statistics are planned for the next expansion.</p></div>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--card-border)] bg-[var(--muted)] p-3"><p className="text-[10px] font-semibold capitalize text-[var(--muted-foreground)]">{label}</p><p className="mt-1 break-all font-mono text-sm font-black">{value}</p></div>;
}
