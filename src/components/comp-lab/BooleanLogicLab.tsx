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
  const ast = parseExpression(source);
  return ast ? evaluateAst(ast, values) : null;
}
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

type AstNode = { kind: "bit" | "name" | "not" | "op"; value?: string; left?: AstNode; right?: AstNode };

function parseExpression(source: string): AstNode | null {
  const tokens = tokenize(source);
  if (!tokens?.length) return null;
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];
  const primary = (): AstNode | null => {
    const token = peek();
    if (!token) return null;
    if (token.type === "bit" || token.type === "name") { take(); return { kind: token.type, value: token.value }; }
    if (token.type === "lparen") {
      take();
      const node = orExpr();
      if (peek()?.type !== "rparen") return null;
      take();
      return node;
    }
    return null;
  };
  const unary = (): AstNode | null => {
    if (peek()?.type === "op" && peek()?.value === "NOT") {
      take();
      const child = unary();
      return child ? { kind: "not", left: child } : null;
    }
    return primary();
  };
  const binary = (next: () => AstNode | null, ops: string[]): AstNode | null => {
    let left = next();
    while (left && peek()?.type === "op" && ops.includes(peek()!.value)) {
      const op = take().value;
      const right = next();
      if (!right) return null;
      left = { kind: "op", value: op, left, right };
    }
    return left;
  };
  const xorExpr = () => binary(unary, ["XOR"]);
  const andExpr = () => binary(xorExpr, ["AND", "NAND", "NOR"]);
  const orExpr = () => binary(andExpr, ["OR"]);
  const root = orExpr();
  return pos === tokens.length ? root : null;
}

function evaluateAst(node: AstNode, values: Record<string, Bit>): Bit | null {
  if (node.kind === "bit") return Number(node.value) as Bit;
  if (node.kind === "name") return values[node.value ?? ""] ?? null;
  if (node.kind === "not") {
    const value = node.left ? evaluateAst(node.left, values) : null;
    return value === null ? null : value ? 0 : 1;
  }
  const left = node.left ? evaluateAst(node.left, values) : null;
  const right = node.right ? evaluateAst(node.right, values) : null;
  return left === null || right === null ? null : gate(node.value as Gate, left, right);
}

function parseRowsExpression(names: string[], rows: Array<{ values: Record<string, Bit>; output: Bit | null }>) {
  const terms = rows.filter(row => row.output === 1).map(row => {
    if (!names.length) return "1";
    return names.map(name => row.values[name] ? name : "NOT " + name).join(" AND ");
  });
  return terms.length ? terms.map(term => "(" + term + ")").join(" OR ") : "0";
}

function CircuitTree({ node }: { node: AstNode }) {
  const label = node.kind === "not" ? "NOT" : node.kind === "op" ? node.value : node.value;
  return (
    <div className="flex items-center justify-center">
      <div className="min-w-16 rounded-lg border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-2 text-center text-[9px] font-semibold">
        {label}
        {(node.left || node.right) && <div className="mt-2 flex gap-2 text-[8px] font-normal">
          {node.left && <div className="rounded border border-[var(--card-border)] px-2 py-1"><CircuitTree node={node.left} /></div>}
          {node.right && <div className="rounded border border-[var(--card-border)] px-2 py-1"><CircuitTree node={node.right} /></div>}
        </div>}
      </div>
    </div>
  );
}

function BooleanLab() {
  const [expr, setExpr] = useState("(A AND B) OR C");
  const [verified, setVerified] = useState(false);
  const names = useMemo(() => variableNames(expr), [expr]);
  const ast = useMemo(() => parseExpression(expr), [expr]);
  const rows = useMemo(() => combinations(names).map(values => ({ values, output: evaluateExpression(expr, values) })), [expr, names]);
  const valid = Boolean(ast) && rows.length > 0 && rows.every(row => row.output !== null);
  const sop = useMemo(() => valid ? parseRowsExpression(names, rows) : "", [names, rows, valid]);

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2"><Sigma className="h-4 w-4 text-[var(--primary)]" /><div><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Boolean algebra lab</div><div className="mt-1 text-sm font-semibold">Expression ↔ truth table ↔ circuit</div></div></div>
      <p className="mt-2 text-[10px] leading-5 text-[var(--muted-foreground)]">Enter A, B or C with NOT, AND, OR, NAND, NOR and XOR. The lab evaluates every input combination, builds a canonical sum-of-products form, and shows the expression as a gate tree.</p>
      <input value={expr} onChange={e => { setExpr(e.target.value); setVerified(false); }} className="mt-3 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3 font-mono text-xs" />
      <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" disabled={!valid} onClick={() => setVerified(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-40"><Check className="h-3.5 w-3.5" />Verify expression</button><span className="text-[9px] text-[var(--muted-foreground)]">{valid ? rows.length + " rows generated" : "Invalid or incomplete Boolean expression"}</span></div>
      {valid && <div className="mt-3 overflow-auto rounded-xl border border-[var(--card-border)]"><table className="w-full text-left text-[10px]"><thead><tr>{names.map(n => <th key={n} className="px-3 py-2">{n}</th>)}<th className="px-3 py-2">F</th></tr></thead><tbody>{rows.map((row,i)=><tr key={i} className="border-t border-[var(--card-border)]/60">{names.map(n=><td key={n} className="px-3 py-1.5 font-mono">{row.values[n]}</td>)}<td className="px-3 py-1.5 font-mono font-semibold">{row.output}</td></tr>)}</tbody></table></div>}
      {valid && <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl bg-[var(--surface-2)] p-3"><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Canonical SOP</div><div className="mt-2 break-words font-mono text-[10px]">{sop}</div><p className="mt-2 text-[9px] text-[var(--muted-foreground)]">Each product term represents one truth-table row where F = 1.</p></div>
        <div className="overflow-auto rounded-xl bg-[var(--surface-2)] p-3"><div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Gate tree</div><div className="mt-3 min-w-[260px]"><CircuitTree node={ast!} /></div></div>
      </div>}
      {verified && valid && <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[10px] text-emerald-300">Expression verified across every generated input combination.</div>}
      <div className="mt-3 rounded-xl bg-[var(--surface-2)] p-3 text-[10px]"><span className="text-[var(--muted-foreground)]">De Morgan:</span> NOT(A AND B) = (NOT A) OR (NOT B). NOT(A OR B) = (NOT A) AND (NOT B).</div>
    </div>
  );
}

