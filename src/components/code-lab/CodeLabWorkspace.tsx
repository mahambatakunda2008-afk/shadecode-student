"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Code2, Copy, Play, RotateCcw, Save, Sparkles, Terminal, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

const STARTER = `// Write JavaScript here and press Run.\n// Code Lab runs browser-safe JavaScript locally.\n\nconst name = "Shadecode";\nconsole.log(\`Hello, \${name}!\`);`;
const STORAGE_KEY = "shadecode.student.code-lab.workspace.v1";
type RunState = "idle" | "running" | "success" | "error";

function runInWorker(source: string): Promise<{ output: string[]; error?: string }> {
  return new Promise((resolve) => {
    const workerSource = `
      self.fetch = undefined;
      self.XMLHttpRequest = undefined;
      self.WebSocket = undefined;
      self.EventSource = undefined;
      self.importScripts = undefined;
      const lines = [];
      const print = (...args) => lines.push(args.map((v) => typeof v === "string" ? v : JSON.stringify(v)).join(" "));
      self.onmessage = (event) => {
        try {
          const console = { log: print, info: print, warn: print, error: print };
          const fn = new Function("console", "fetch", "XMLHttpRequest", "WebSocket", "EventSource", event.data);
          fn(console, undefined, undefined, undefined, undefined);
          self.postMessage({ output: lines });
        } catch (error) {
          self.postMessage({ output: lines, error: error instanceof Error ? error.message : String(error) });
        }
      };
    `;
    const url = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
    const worker = new Worker(url);
    const timer = window.setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({ output: [], error: "Execution stopped after 2 seconds. Check for an infinite loop." });
    }, 2000);
    worker.onmessage = (event) => {
      window.clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(event.data);
    };
    worker.postMessage(source);
  });
}

function OutputPanel({ output, error, runState }: { output: string[]; error: string | null; runState: RunState }) {
  return <div className="border-t border-white/10 bg-black/20 p-3 sm:p-4">
    <div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-white/70"><Terminal className="h-3.5 w-3.5" /> Output</span>{runState === "success" && <span className="flex items-center gap-1 text-[11px] text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Finished</span>}{runState === "error" && <span className="flex items-center gap-1 text-[11px] text-red-300"><XCircle className="h-3.5 w-3.5" /> Needs a fix</span>}</div>
    <div className="min-h-[72px] rounded-xl border border-white/5 bg-black/20 p-3 font-mono text-xs leading-5 text-white/70">
      {error ? <span className="text-red-300">{error}</span> : output.length ? output.map((line, i) => <div key={`${line}-${i}`}>{line}</div>) : <span className="text-white/25">Run your code to see output here.</span>}
    </div>
  </div>;
}

export function CodeLabWorkspace() {
  const { profile } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const [code, setCode] = useState(STARTER);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [runState, setRunState] = useState<RunState>("idle");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activePanel, setActivePanel] = useState<"task" | "output">("task");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setCode(stored);
    } catch {
      // Local persistence is an enhancement. The workspace remains usable when storage is unavailable.
    }
  }, []);

  const lineNumbers = useMemo(() => Array.from({ length: Math.max(1, code.split("\n").length) }, (_, i) => i + 1), [code]);

  const save = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1400);
    } catch {
      setSaved(false);
    }
  }, [code]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  const run = async () => {
    setRunState("running");
    setError(null);
    setOutput([]);
    setActivePanel("output");
    const result = await runInWorker(code);
    setOutput(result.output);
    setError(result.error ?? null);
    setRunState(result.error ? "error" : "success");
  };

  const reset = () => {
    setCode(STARTER);
    setOutput([]);
    setError(null);
    setRunState("idle");
    setActivePanel("task");
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-[1500px] flex-col gap-4 px-3 pb-5 sm:px-5 lg:px-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-glow)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)]"><Code2 className="h-3.5 w-3.5" /> Code Lab</span>
            <span className="rounded-full border border-[var(--card-border)] px-2.5 py-1 text-[11px] text-[var(--muted-foreground)]">{experience.shortLabel}</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">Build, run, understand.</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">A local-first coding workspace. Your editor keeps working without Cortex or a network connection.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={reset} type="button" className="ssc-button-secondary"><RotateCcw className="h-4 w-4" /> Reset</button>
          <button onClick={save} type="button" className="ssc-button-secondary"><Save className="h-4 w-4" /> {saved ? "Saved" : "Save"}</button>
          <button onClick={run} disabled={runState === "running"} type="button" className="ssc-button-primary disabled:opacity-60"><Play className="h-4 w-4" /> {runState === "running" ? "Running…" : "Run"}</button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(260px,0.35fr)_minmax(0,1fr)]">
        <aside className="hidden min-h-0 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5 lg:block">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]"><Sparkles className="h-4 w-4 text-[var(--primary)]" /> Learning target</div>
          <div className="mt-5 rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Objective-first</p>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">Write a small program, run it, inspect the output, and iterate. Verified syllabus objectives appear here when the learner has an authoritative curriculum scope.</p>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-[var(--card-border)] p-4">
            <p className="text-xs font-semibold text-[var(--muted-foreground)]">Curriculum integrity</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Unverified curriculum content is never presented as exam-required work.</p>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[#111318] shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" /><span className="text-xs font-medium text-white/70">main.js</span></div>
            <div className="flex items-center gap-1">
              <button onClick={copy} type="button" className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Copy code">{copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
              <span className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/40">JavaScript · local</span>
            </div>
          </div>
          <div className="flex min-h-[360px] flex-1 overflow-auto">
            <div className="select-none border-r border-white/5 px-3 py-4 text-right font-mono text-xs leading-6 text-white/20">{lineNumbers.map((n) => <div key={n}>{n}</div>)}</div>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} aria-label="Code editor" className="min-h-[360px] min-w-0 flex-1 resize-none bg-transparent px-4 py-4 font-mono text-[13px] leading-6 text-white outline-none placeholder:text-white/20" />
          </div>
          <div className="border-t border-white/10 lg:hidden">
            <div className="grid grid-cols-2">
              <button onClick={() => setActivePanel("task")} type="button" className={cn("border-r border-white/10 px-3 py-2.5 text-xs font-medium", activePanel === "task" ? "text-white" : "text-white/40")}>Task</button>
              <button onClick={() => setActivePanel("output")} type="button" className={cn("px-3 py-2.5 text-xs font-medium", activePanel === "output" ? "text-white" : "text-white/40")}>Output</button>
            </div>
          </div>
          <div className="hidden lg:block"><OutputPanel output={output} error={error} runState={runState} /></div>
          {activePanel === "task" && <div className="border-t border-white/10 bg-black/20 p-4 lg:hidden"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/35">Objective-first</p><p className="mt-2 text-sm leading-6 text-white/70">Write a small program, run it, inspect the output, and iterate. Verified syllabus objectives will appear here when an authoritative scope is available.</p></div>}
          {activePanel === "output" && <div className="lg:hidden"><OutputPanel output={output} error={error} runState={runState} /></div>}
        </section>
      </div>

      <div className="flex items-center justify-between px-1 text-[11px] text-[var(--muted-foreground)]">
        <span>Runs locally in your browser. No code is sent to an AI provider.</span>
        <span className="hidden sm:inline">Ctrl/Cmd + S saves locally</span>
      </div>
    </div>
  );
}
