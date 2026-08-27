"use client";

import { useEffect, useState } from "react";
import { evaluateExpression } from "@/lib/cortex/calculatorEngine";

const buttons = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "%", "+", "(", ")"];
const HISTORY_KEY = "shadecode-calculator-history";

export function Calculator() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]")); } catch { setHistory([]); }
  }, []);

  function calculate() {
    const evaluated = evaluateExpression(expression);
    if (!evaluated.ok) { setResult(evaluated.error === "division_by_zero" ? "Cannot divide by zero" : evaluated.error === "overflow" ? "Number too large" : "Invalid expression"); return; }
    setResult(evaluated.display);
    const entry = `${expression} = ${evaluated.display}`;
    const next = [entry, ...history.filter(item => item !== entry)].slice(0, 20);
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }

  function append(value: string) { setExpression(current => current + value); setResult(""); }
  function clear() { setExpression(""); setResult(""); }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (/^[0-9.]$/.test(event.key) || ["+", "-", "*", "/", "%", "(", ")"].includes(event.key)) { append(event.key); return; }
      if (event.key === "Enter" || event.key === "=") { event.preventDefault(); calculate(); }
      if (event.key === "Escape") clear();
      if (event.key === "Backspace") setExpression(current => current.slice(0, -1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return <section aria-label="Calculator" className="w-full max-w-sm rounded-2xl border bg-background p-4 shadow-sm">
    <div className="mb-3 rounded-xl border bg-muted/30 p-3 text-right">
      <input aria-label="Calculator expression" value={expression} onChange={event => setExpression(event.target.value)} onKeyDown={event => { if (event.key === "Enter") calculate(); }} className="w-full bg-transparent text-right text-lg outline-none" placeholder="0" inputMode="decimal" />
      <div aria-live="polite" aria-label="Calculator result" className="min-h-8 text-2xl font-semibold">{result}</div>
    </div>
    <div className="grid grid-cols-4 gap-2">
      {buttons.map(button => <button key={button} type="button" aria-label={`Calculator ${button}`} onClick={() => append(button)} className="min-h-12 rounded-xl border text-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2">{button}</button>)}
      <button type="button" aria-label="Backspace" onClick={() => setExpression(current => current.slice(0, -1))} className="min-h-12 rounded-xl border">⌫</button>
      <button type="button" aria-label="Clear calculator" onClick={clear} className="min-h-12 rounded-xl border">AC</button>
      <button type="button" aria-label="Calculate" onClick={calculate} className="col-span-2 min-h-12 rounded-xl border font-semibold hover:bg-muted">=</button>
    </div>
    {history.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm font-medium">History</summary><ul className="mt-2 space-y-1 text-sm">{history.slice(0, 8).map(item => <li key={item} className="truncate rounded-lg bg-muted/30 px-2 py-1">{item}</li>)}</ul></details>}
  </section>;
}
