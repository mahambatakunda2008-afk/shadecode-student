"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowUp, BrainCircuit, Check, Clock3, Command, Loader2, Sparkles, X } from "lucide-react";
import { buildCapabilityRegistry } from "@/lib/capabilities";
import type { StudyState } from "@/lib/capabilities/study";
import { cn } from "@/lib/utils";

type Intent = {
  kind: "study_plan" | "progress" | "session" | "unknown";
  subject?: string;
  topic: string;
  minutes?: number;
  label: string;
};

type ActionEvent = {
  id: string;
  label: string;
  detail: string;
  at: string;
};

const SUGGESTIONS = [
  "I have Physics tomorrow. I have 3 hours tonight. Help me turn that into an executable study session.",
  "What should I study tonight?",
  "I keep getting Mechanics questions wrong. Help me fix that.",
];

function inferIntent(prompt: string): Intent {
  const text = prompt.toLowerCase();
  const subject = ["physics", "mathematics", "maths", "computer science", "chemistry", "biology", "economics"].find((value) => text.includes(value));
  const minutesMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/);
  const minuteMatch = text.match(/(\d+)\s*(?:minutes?|mins?)/);
  const minutes = minutesMatch ? Math.round(Number(minutesMatch[1]) * 60) : minuteMatch ? Number(minuteMatch[1]) : undefined;
  const topic = text.includes("mechanics") ? "Mechanics" : text.includes("electricity") ? "Electricity" : text.includes("trigon") ? "Trigonometry" : subject ? subject[0].replace(/\b\w/g, (char) => char.toUpperCase()) : "Study session";

  if (/what should i study|progress|weak|struggling|wrong|behind|tonight/.test(text)) return { kind: "progress", subject, topic, minutes, label: "Study recommendation" };
  if (/start|session|study for|revise|revision|prepare|tomorrow|plan|hours?/.test(text)) return { kind: "study_plan", subject, topic, minutes, label: "Executable study plan" };
  return { kind: "unknown", subject, topic, minutes, label: "Cortex request" };
}

function makeSteps(intent: Intent): string[] {
  const topic = intent.topic;
  return [
    `Quick diagnostic: identify what you already know about ${topic}`,
    `Focused learning: review the core ${topic} ideas and worked examples`,
    `Active practice: solve targeted ${topic} questions without notes`,
    "Check your mistakes and record the next weak point",
  ];
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function CortexCommandBar() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [state, setState] = useState<StudyState>({});
  const [history, setHistory] = useState<ActionEvent[]>([]);
  const [webmcp, setWebmcp] = useState(false);

  const capabilities = useMemo(() => buildCapabilityRegistry().study, []);

  useEffect(() => {
    const sync = () => setState(capabilities.get_student_study_state());
    sync();
    const onState = () => sync();
    window.addEventListener("shadecode:study-state", onState);
    setWebmcp(Boolean((document as Document & { modelContext?: unknown }).modelContext));
    return () => window.removeEventListener("shadecode:study-state", onState);
  }, [capabilities]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function addEvent(label: string, detail: string) {
    setHistory((items) => [{ id: crypto.randomUUID(), label, detail, at: nowLabel() }, ...items].slice(0, 6));
  }

  async function runPrompt(value: string) {
    const clean = value.trim();
    if (!clean || busy) return;
    setBusy(true);
    setResponse(null);
    const intent = inferIntent(clean);

    try {
      if (intent.kind === "progress") {
        const current = capabilities.get_student_study_state();
        setState(current);
        const focus = current.plan?.topic ?? current.subject ?? intent.topic;
        setResponse(current.plan ? `Your current focus is ${current.plan.subject}: ${current.plan.topic}. I can turn that context into a focused session.` : `I can start from your local study state and build a focused ${intent.topic} session.`);
        addEvent("Read study state", `Focused on ${focus}`);
        return;
      }

      if (intent.kind === "study_plan") {
        const minutes = intent.minutes ?? 30;
        const subject = intent.subject ?? (state.subject || "General study");
        const steps = makeSteps(intent);
        const goal = clean;
        capabilities.set_study_goal({ goal, subject, minutes });
        addEvent("Set study goal", `${subject} · ${minutes} min`);
        capabilities.create_study_plan({ subject, topic: intent.topic, steps, minutes });
        addEvent("Created study plan", `${steps.length} steps · ${intent.topic}`);
        setState(capabilities.get_student_study_state());
        setResponse(`Got it. I turned your request into a ${minutes}-minute ${subject} plan with ${steps.length} executable steps. Your study state is saved locally.`);
        return;
      }

      setResponse("Tell Cortex what you want to accomplish, how much time you have, or what is giving you trouble. I’ll map it to a study workflow.");
    } catch (error) {
      setResponse(error instanceof Error ? error.message : "Cortex could not complete that action.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void runPrompt(prompt);
  }

  function startPlan() {
    if (busy || !state.plan) return;
    setBusy(true);
    try {
      capabilities.start_study_session({ subject: state.plan.subject, topic: state.plan.topic, minutes: state.plan.minutes ?? 25 });
      addEvent("Started study session", `${state.plan.subject} · ${state.plan.topic}`);
      setState(capabilities.get_student_study_state());
      window.location.assign(`/learn?subject=${encodeURIComponent(state.plan.subject)}&topic=${encodeURIComponent(state.plan.topic)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[92px] right-4 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)]/95 px-4 py-3 text-left shadow-[0_14px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[var(--primary)] md:bottom-6 md:right-6"
          aria-label="Open Ask Cortex"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Sparkles className="h-4 w-4" /></span>
          <span className="min-w-0"><span className="block text-[13px] font-bold text-[var(--foreground)]">Ask Cortex</span><span className="block truncate text-[12px] text-[var(--muted-foreground)]">Tell me what you need to study</span></span>
          <kbd className="hidden rounded-md border border-[var(--card-border)] bg-[var(--surface-2)] px-1.5 py-1 text-[10px] text-[var(--muted-foreground)] md:block">⌘K</kbd>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/35 p-3 backdrop-blur-[3px] md:items-center">
          <section className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[var(--card-border)] bg-[var(--surface)] shadow-[0_30px_100px_rgba(0,0,0,0.35)]" role="dialog" aria-modal="true" aria-label="Cortex Command Center">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] px-5 py-4">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><BrainCircuit className="h-5 w-5" /></span><div><div className="flex items-center gap-2"><h2 className="text-[15px] font-bold text-[var(--foreground)]">Cortex Command Center</h2>{webmcp && <span className="rounded-full border border-[var(--card-border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">WebMCP ready</span>}</div><p className="text-[12px] text-[var(--muted-foreground)]">Turn intent into an executable study workflow.</p></div></div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]" aria-label="Close Cortex"><X className="h-5 w-5" /></button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              <form onSubmit={submit} className="relative">
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="I have Physics tomorrow. I have 3 hours tonight. Help me turn that into an executable study session." rows={3} className="w-full resize-none rounded-2xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-4 pr-14 text-[14px] leading-relaxed text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15" autoFocus />
                <button disabled={!prompt.trim() || busy} type="submit" className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Run Cortex command">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}</button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => { setPrompt(suggestion); void runPrompt(suggestion); }} className="rounded-full border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-2 text-left text-[11px] font-medium text-[var(--muted-foreground)] transition hover:border-[var(--primary)] hover:text-[var(--foreground)]">{suggestion}</button>)}
              </div>

              {response && <div className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4"><div className="flex gap-3"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--primary-glow)] text-[var(--primary)]"><Check className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[13px] font-semibold leading-relaxed text-[var(--foreground)]">{response}</p>{state.plan && <div className="mt-3 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-[12px] font-bold text-[var(--foreground)]">{state.plan.subject} · {state.plan.topic}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{state.plan.steps.length} steps · {state.plan.minutes ?? 25} min · saved locally</p></div><button type="button" onClick={startPlan} className="shrink-0 rounded-xl bg-[var(--primary)] px-3 py-2 text-[11px] font-bold text-[var(--primary-foreground)]">Start session</button></div><ol className="mt-3 space-y-2">{state.plan.steps.map((step, index) => <li key={`${step}-${index}`} className="flex gap-2 text-[11px] leading-relaxed text-[var(--muted-foreground)]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--primary-glow)] text-[10px] font-bold text-[var(--primary)]">{index + 1}</span>{step}</li>)}</ol></div>}</div></div></div>}

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4"><div className="flex items-center gap-2 text-[var(--muted-foreground)]"><Clock3 className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-[0.08em]">Local study state</span></div><p className="mt-2 text-[13px] font-semibold text-[var(--foreground)]">{state.plan ? `${state.plan.subject} · ${state.plan.topic}` : "No active plan yet"}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{state.activeSession ? `Session active · ${state.activeSession.minutes} min` : state.availableMinutes ? `${state.availableMinutes} min available` : "Ready for your next goal"}</p></div>
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4"><div className="flex items-center gap-2 text-[var(--muted-foreground)]"><Command className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-[0.08em]">Action history</span></div><div className="mt-2 space-y-1.5">{history.length ? history.slice(0, 3).map((event) => <div key={event.id} className="flex items-center justify-between gap-2 text-[11px]"><span className="truncate font-medium text-[var(--foreground)]">{event.label}</span><span className="shrink-0 text-[var(--muted-foreground)]">{event.at}</span></div>) : <p className="text-[11px] text-[var(--muted-foreground)]">Your Cortex actions will appear here.</p>}</div></div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" /> Cortex uses the same local-first capability layer exposed to WebMCP agents. Cloud AI is not required for these study-state actions.</div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
