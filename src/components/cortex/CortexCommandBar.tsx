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

type ActionEvent = { id: string; label: string; detail: string; at: string };
type Suggestion = { label: string; prompt: string };

const SUGGESTIONS: Suggestion[] = [
  { label: "Plan tonight", prompt: "I have Physics tomorrow and 3 hours tonight. Build me a study plan." },
  { label: "Fix Mechanics", prompt: "I keep getting Mechanics questions wrong. Build me a focused recovery session." },
  { label: "Start Physics", prompt: "Start a 30-minute Physics study session." },
  { label: "My current focus", prompt: "What should I focus on right now?" },
];

function inferIntent(prompt: string): Intent {
  const text = prompt.toLowerCase();
  const subject = ["physics", "mathematics", "maths", "computer science", "chemistry", "biology", "economics"].find((value) => text.includes(value));
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/);
  const mins = text.match(/(\d+)\s*(?:minutes?|mins?)/);
  const minutes = hours ? Math.round(Number(hours[1]) * 60) : mins ? Number(mins[1]) : undefined;
  const topic = text.includes("mechanics") ? "Mechanics" : text.includes("electricity") ? "Electricity" : text.includes("trigon") ? "Trigonometry" : subject ? subject[0].replace(/\b\w/g, (char) => char.toUpperCase()) : "Study session";

  if (/start\b|start a|begin/.test(text)) return { kind: "session", subject, topic, minutes, label: "Study session" };
  if (/what should i|current focus|progress|weak|struggling|wrong|behind|fix/.test(text)) return { kind: "progress", subject, topic, minutes, label: "Study recommendation" };
  if (/session|study|revise|revision|prepare|tomorrow|plan|hours?|minutes?/.test(text)) return { kind: "study_plan", subject, topic, minutes, label: "Executable study plan" };
  return { kind: "unknown", subject, topic, minutes, label: "Cortex request" };
}

function makeSteps(intent: Intent): string[] {
  const topic = intent.topic;
  return [
    `Diagnose your current ${topic} understanding`,
    `Review the core ${topic} ideas and one worked example`,
    `Practise targeted ${topic} questions without notes`,
    "Check mistakes and record the next weak point",
  ];
}

function nowLabel() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

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
    window.addEventListener("shadecode:study-state", sync);
    const timer = window.setInterval(() => {
      const doc = document as Document & { modelContext?: unknown };
      const win = window as Window & { __shadecodeWebMCPToolCount?: number };
      setWebmcp(Boolean(doc.modelContext));
      if (win.__shadecodeWebMCPToolCount) setWebmcp(true);
    }, 500);
    return () => { window.removeEventListener("shadecode:study-state", sync); window.clearInterval(timer); };
  }, [capabilities]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); }
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
    setBusy(true); setResponse(null);
    const intent = inferIntent(clean);
    try {
      const current = capabilities.get_student_study_state();
      if (intent.kind === "progress") {
        const focus = current.plan?.topic ?? current.subject ?? intent.topic;
        if (current.plan) {
          setResponse(`Your saved focus is ${current.plan.subject} · ${current.plan.topic}. I turned that context into the next actionable step.`);
          addEvent("Read study state", `Focus: ${focus}`);
          setState(current);
        } else {
          const subject = intent.subject ?? "General study";
          const steps = makeSteps(intent);
          capabilities.setStudyGoal({ goal: clean, subject, minutes: intent.minutes ?? 30 });
          capabilities.createStudyPlan({ subject, topic: intent.topic, steps, minutes: intent.minutes ?? 30 });
          addEvent("Set study goal", `${subject} · ${intent.minutes ?? 30} min`);
          addEvent("Created study plan", `${steps.length} steps · ${intent.topic}`);
          setState(capabilities.get_student_study_state());
          setResponse(`I found no saved plan, so I created a focused ${intent.topic} recovery plan locally.`);
        }
        return;
      }

      if (intent.kind === "session") {
        const subject = intent.subject ?? current.plan?.subject ?? current.subject ?? "General study";
        const topic = intent.topic === "Study session" ? current.plan?.topic ?? "Focused study" : intent.topic;
        const minutes = intent.minutes ?? current.plan?.minutes ?? 30;
        capabilities.startStudySession({ subject, topic, minutes });
        addEvent("Started study session", `${subject} · ${topic} · ${minutes} min`);
        setResponse(`Session started: ${subject} · ${topic}. Opening your learning workspace.`);
        window.setTimeout(() => window.location.assign(`/learn?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`), 150);
        return;
      }

      if (intent.kind === "study_plan") {
        const minutes = intent.minutes ?? 30;
        const subject = intent.subject ?? current.subject ?? "General study";
        const steps = makeSteps(intent);
        capabilities.setStudyGoal({ goal: clean, subject, minutes });
        addEvent("Set study goal", `${subject} · ${minutes} min`);
        capabilities.createStudyPlan({ subject, topic: intent.topic, steps, minutes });
        addEvent("Created study plan", `${steps.length} steps · ${intent.topic}`);
        setState(capabilities.get_student_study_state());
        setResponse(`Done. I created a ${minutes}-minute ${subject} plan and saved it to your local study state.`);
        return;
      }
      setResponse("Try a concrete goal, time limit, subject, or problem. Cortex will turn it into a study action.");
    } catch (error) {
      setResponse(error instanceof Error ? error.message : "Cortex could not complete that action.");
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void runPrompt(prompt); }

  function startPlan() {
    if (busy || !state.plan) return;
    setBusy(true);
    try {
      capabilities.startStudySession({ subject: state.plan.subject, topic: state.plan.topic, minutes: state.plan.minutes ?? 25 });
      addEvent("Started study session", `${state.plan.subject} · ${state.plan.topic}`);
      window.location.assign(`/learn?subject=${encodeURIComponent(state.plan.subject)}&topic=${encodeURIComponent(state.plan.topic)}`);
    } catch (error) { setResponse(error instanceof Error ? error.message : "Could not start the session."); setBusy(false); }
  }

  return (
    <>
      {!open && <button type="button" onClick={() => setOpen(true)} className="fixed bottom-[92px] right-4 z-[100] flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)]/95 px-4 py-3 text-left shadow-xl backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[var(--primary)] md:bottom-6 md:right-6" aria-label="Open Ask Cortex"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Sparkles className="h-4 w-4" /></span><span><span className="block text-[13px] font-bold text-[var(--foreground)]">Ask Cortex</span><span className="block text-[11px] text-[var(--muted-foreground)]">Turn intent into action</span></span></button>}
      {open && <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/35 p-3 backdrop-blur-[3px] md:items-center">
        <section className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[var(--card-border)] bg-[var(--surface)] shadow-2xl" role="dialog" aria-modal="true" aria-label="Cortex Command Center">
          <header className="flex items-center justify-between border-b border-[var(--card-border)] px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><BrainCircuit className="h-5 w-5" /></span><div><div className="flex items-center gap-2"><h2 className="text-[15px] font-bold text-[var(--foreground)]">Cortex</h2><span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", webmcp ? "border-[var(--primary)]/30 bg-[var(--primary-glow)] text-[var(--primary)]" : "border-[var(--card-border)] text-[var(--muted-foreground)]")}>{webmcp ? "WebMCP connected" : "WebMCP waiting"}</span></div><p className="text-[12px] text-[var(--muted-foreground)]">Tell me what you want to accomplish.</p></div></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]" aria-label="Close Cortex"><X className="h-5 w-5" /></button></header>
          <div className="max-h-[72vh] overflow-y-auto p-5">
            <form onSubmit={submit} className="relative"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="e.g. I have Physics tomorrow and 3 hours tonight. Build me a study plan." rows={3} className="w-full resize-none rounded-2xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-4 pr-14 text-[14px] leading-relaxed text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15" autoFocus /><button disabled={!prompt.trim() || busy} type="submit" className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-40" aria-label="Run Cortex command">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}</button></form>
            <div className="mt-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Quick actions</p><div className="grid grid-cols-2 gap-2">{SUGGESTIONS.map((item) => <button key={item.label} type="button" onClick={() => { setPrompt(item.prompt); void runPrompt(item.prompt); }} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 text-left text-[12px] font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-glow)]">{item.label}<span className="mt-1 block text-[10px] font-normal text-[var(--muted-foreground)]">{item.prompt}</span></button>)}</div></div>
            {response && <div className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--primary-glow)] text-[var(--primary)]"><Check className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[13px] font-semibold leading-relaxed text-[var(--foreground)]">{response}</p>{state.plan && <div className="mt-3 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-[12px] font-bold text-[var(--foreground)]">{state.plan.subject} · {state.plan.topic}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{state.plan.steps.length} steps · {state.plan.minutes ?? 25} min · local</p></div><button type="button" onClick={startPlan} disabled={busy} className="shrink-0 rounded-xl bg-[var(--primary)] px-3 py-2 text-[11px] font-bold text-[var(--primary-foreground)] disabled:opacity-40">Start</button></div><ol className="mt-3 space-y-2">{state.plan.steps.map((step, index) => <li key={`${step}-${index}`} className="flex gap-2 text-[11px] leading-relaxed text-[var(--muted-foreground)]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--primary-glow)] text-[10px] font-bold text-[var(--primary)]">{index + 1}</span>{step}</li>)}</ol></div>}</div></div></div>}
            <div className="mt-5 grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4"><div className="flex items-center gap-2 text-[var(--muted-foreground)]"><Clock3 className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.1em]">Study state</span></div><p className="mt-2 text-[13px] font-semibold text-[var(--foreground)]">{state.plan ? `${state.plan.subject} · ${state.plan.topic}` : "No saved plan"}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{state.activeSession ? `Active · ${state.activeSession.minutes} min` : state.availableMinutes ? `${state.availableMinutes} min available` : "Ready for a goal"}</p></div><div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4"><div className="flex items-center gap-2 text-[var(--muted-foreground)]"><Command className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.1em]">Recent actions</span></div><div className="mt-2 space-y-1.5">{history.length ? history.slice(0, 3).map((event) => <div key={event.id} className="flex items-center justify-between gap-2 text-[11px]"><span className="truncate font-medium text-[var(--foreground)]">{event.label}</span><span className="shrink-0 text-[var(--muted-foreground)]">{event.at}</span></div>) : <p className="text-[11px] text-[var(--muted-foreground)]">Nothing run yet.</p>}</div></div></div>
            <p className="mt-4 text-[10px] leading-5 text-[var(--muted-foreground)]"><span className="font-semibold text-[var(--foreground)]">Agent access:</span> WebMCP exposes Shadecode's capabilities to compatible agents. This student command box is the human-facing fallback and uses the same capability layer.</p>
          </div>
        </section>
      </div>}
    </>
  );
}
