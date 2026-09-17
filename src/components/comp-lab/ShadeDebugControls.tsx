"use client";

import { useEffect, useMemo, useState } from "react";
import { CirclePause, FastForward, RotateCcw, SkipBack, Square } from "lucide-react";
import { ShadeDebugSession, type ShadeExecutionTrace } from "@/lib/shade/debug";

export default function ShadeDebugControls({ trace, onSelect }: { trace?: ShadeExecutionTrace; onSelect: (line: number | null, step: number | null) => void }) {
  const session = useMemo(() => trace ? new ShadeDebugSession(trace) : null, [trace]);
  const [, redraw] = useState(0);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);

  useEffect(() => {
    setBreakpoints([]);
    onSelect(null, null);
  }, [trace, onSelect]);

  if (!session || !trace?.events.length) {
    return <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3 text-[10px] text-[var(--muted-foreground)]">Run Shade to activate the debugger.</div>;
  }

  const state = session.getState();
  const sync = () => {
    setBreakpoints(session.getBreakpoints());
    const next = session.getState();
    onSelect(next.event?.location.line ?? null, next.event?.step ?? null);
    redraw(value => value + 1);
  };
  const toggle = (line: number) => { session.toggleBreakpoint(line); sync(); };

  return <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
    <div className="flex items-center gap-2">
      <CirclePause className="h-4 w-4 text-[var(--primary)]" />
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Debugger</h2>
      <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">{state.event ? `step ${state.event.step}/${trace.events.length}` : "ready"}</span>
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5">
      <button type="button" onClick={() => { session.continue(); sync(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"><FastForward className="h-3 w-3" />Continue</button>
      <button type="button" onClick={() => { session.stepOver(); sync(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"><SkipBack className="h-3 w-3 rotate-180" />Step</button>
      <button type="button" onClick={() => { session.stepBack(); sync(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"><SkipBack className="h-3 w-3" />Back</button>
      <button type="button" onClick={() => { session.restart(); sync(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"><RotateCcw className="h-3 w-3" />Restart</button>
    </div>
    <div className="mt-3 flex items-center justify-between gap-2">
      <span className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">Breakpoints</span>
      <span className="text-[9px] text-[var(--muted-foreground)]">{breakpoints.length ? breakpoints.map(line => `L${line}`).join(" · ") : "none"}</span>
    </div>
    <div className="mt-2 max-h-28 overflow-auto rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)] p-2 text-[9px] text-[var(--muted-foreground)]">
      <p>Continue stops at the next selected source line.</p>
      <div className="mt-2 flex flex-wrap gap-1">{[...new Set(trace.events.map(event => event.location.line).filter(line => line > 0))].sort((a, b) => a - b).map(line => <button key={line} type="button" onClick={() => toggle(line)} className={`rounded-md px-2 py-1 font-mono ${breakpoints.includes(line) ? "bg-[var(--primary)] text-white" : "bg-[var(--surface)] text-[var(--muted-foreground)]"}`}>L{line}</button>)}</div>
    </div>
    {state.event && <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--primary-glow)] px-3 py-2 text-[10px] text-[var(--foreground)]"><Square className="h-3 w-3 fill-current" />{state.reason === "breakpoint" ? "Breakpoint" : state.reason === "end" ? "End" : "Ready"} · line {state.event.location.line}{state.event.location.column ? `:${state.event.location.column}` : ""}</div>}
  </section>;
}
