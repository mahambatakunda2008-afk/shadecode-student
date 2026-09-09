"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Decision {
  kind: string;
  subject: string;
  topic: string;
  priority: number;
  title: string;
  reason: string;
  evidence: Array<{ signal: string; value: number | string; interpretation: string }>;
  intervention: string;
  successCheck: string;
}

interface FeedbackSnapshot {
  subject: string;
  topic: string;
  kind: string;
  priority: number;
  mastery?: number | string;
  retention?: number | string;
  errorRate?: number | string;
  attempts?: number | string;
  startedAt: string;
}

const FEEDBACK_KEY = "shadecode:cortex:agent-feedback:v1";

function buildLearnPrompt(decision: Decision): string {
  const focus = decision.kind === "repair-prerequisite"
    ? `Start by repairing the prerequisite knowledge I need for ${decision.topic}, then connect it back to ${decision.topic}.`
    : decision.kind === "targeted-practice"
      ? `Focus on targeted practice for ${decision.topic}. Teach only the ideas I need, then give me worked reasoning and practice that exposes common errors.`
      : decision.kind === "retrieval-check"
        ? `Run a retrieval-focused lesson on ${decision.topic}. Make me recall and explain the important ideas before showing the answer, then correct any gaps.`
        : decision.kind === "consolidate"
          ? `Help me consolidate ${decision.topic} by connecting the key ideas, testing transfer, and finishing with an exam-style application.`
          : `Continue teaching ${decision.topic} with a focused explanation, worked example, and a short check of understanding.`;

  return `I need to improve my understanding of ${decision.topic} in ${decision.subject}. ${focus} My goal is to satisfy this success check: ${decision.successCheck} Do not give me a generic overview. Adapt the lesson to this specific learning need and finish with evidence that I can actually apply it.`;
}

function snapshotDecision(decision: Decision): FeedbackSnapshot {
  const value = (signal: string) => decision.evidence.find(item => item.signal === signal)?.value;
  return {
    subject: decision.subject,
    topic: decision.topic,
    kind: decision.kind,
    priority: decision.priority,
    mastery: value("mastery"),
    retention: value("retention"),
    errorRate: value("error rate"),
    attempts: value("attempts"),
    startedAt: new Date().toISOString(),
  };
}

function changedEvidence(before: FeedbackSnapshot, after: Decision): string[] {
  const current = snapshotDecision(after);
  const changes: string[] = [];
  if (before.attempts !== current.attempts) changes.push(`New observation recorded: attempts ${before.attempts ?? "?"} → ${current.attempts ?? "?"}`);
  if (before.mastery !== current.mastery) changes.push(`Mastery ${before.mastery ?? "?"} → ${current.mastery ?? "?"}`);
  if (before.retention !== current.retention) changes.push(`Retention ${before.retention ?? "?"} → ${current.retention ?? "?"}`);
  if (before.errorRate !== current.errorRate) changes.push(`Error rate ${before.errorRate ?? "?"} → ${current.errorRate ?? "?"}`);
  if (before.kind !== current.kind) changes.push(`Next action changed to ${current.kind.replaceAll("-", " ")}`);
  return changes;
}

export default function CortexAgentPage() {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [observedTopics, setObservedTopics] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ before: FeedbackSnapshot; changes: string[] } | null>(null);
  const [awaitingEvidence, setAwaitingEvidence] = useState<FeedbackSnapshot | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cortex/next-action", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not read Cortex state");
      const nextDecision = (payload.decision ?? null) as Decision | null;
      setDecision(nextDecision);
      setObservedTopics(payload.observedTopics ?? 0);

      if (nextDecision && typeof window !== "undefined") {
        const raw = localStorage.getItem(FEEDBACK_KEY);
        if (raw) {
          try {
            const before = JSON.parse(raw) as FeedbackSnapshot;
            if (before.topic === nextDecision.topic && before.subject === nextDecision.subject) {
              const changes = changedEvidence(before, nextDecision);
              if (changes.length) {
                setFeedback({ before, changes });
                setAwaitingEvidence(null);
                localStorage.removeItem(FEEDBACK_KEY);
              } else {
                setAwaitingEvidence(before);
                setFeedback(null);
              }
            }
          } catch {
            localStorage.removeItem(FEEDBACK_KEY);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read Cortex state");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const learnPrompt = useMemo(() => decision ? buildLearnPrompt(decision) : "", [decision]);
  const learnHref = useMemo(() => {
    if (!decision) return "/learn";
    const params = new URLSearchParams({ subject: decision.subject, prompt: learnPrompt });
    return `/learn?${params.toString()}`;
  }, [decision, learnPrompt]);
  const examHref = useMemo(() => {
    if (!decision) return "/exam-sim";
    const params = new URLSearchParams({ subject: decision.subject, topic: decision.topic, count: "5" });
    return `/exam-sim?${params.toString()}`;
  }, [decision]);

  function startIntervention(href: string) {
    if (!decision) return;
    const snapshot = snapshotDecision(decision);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(snapshot));
    setFeedback(null);
    setAwaitingEvidence(snapshot);
    router.push(href);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-500">Cortex agent</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">What should I study next?</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Cortex reads durable learning evidence, chooses one intervention, and shows why it chose it.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-50">{loading ? "Re-evaluating…" : "Re-evaluate"}</button>
      </div>

      {feedback && <section className="mb-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">New evidence observed</p><h2 className="mt-1 text-xl font-bold">The intervention changed the learning state.</h2></div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">Closed loop</span></div><div className="mt-4 flex flex-wrap gap-2">{feedback.changes.map(change => <span key={change} className="rounded-full border bg-background px-3 py-1.5 text-sm">{change}</span>)}</div><p className="mt-4 text-sm text-muted-foreground">Cortex did not assume improvement. It re-read the durable observation and computed the current decision from the new evidence.</p></section>}
      {awaitingEvidence && !feedback && <section className="mb-5 rounded-3xl border border-cyan-500/30 bg-cyan-500/5 p-6"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">Intervention in progress</p><h2 className="mt-1 text-xl font-bold">Cortex is waiting for new evidence.</h2><p className="mt-2 text-sm text-muted-foreground">Complete the lesson or 5-question test, then come back and press Re-evaluate. No progress is shown until a real learning observation changes the state.</p></section>}

      {error ? <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6"><h2 className="font-semibold">Cortex could not read your learning state</h2><p className="mt-2 text-sm text-muted-foreground">{error}</p></section> : !loading && !decision ? <section className="rounded-2xl border p-8 text-center"><h2 className="text-xl font-semibold">No topic evidence yet</h2><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Complete a lesson question or exam attempt with a curriculum topic attached. Cortex will use that observation to choose the next intervention.</p></section> : decision ? <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]"><section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8"><div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span className="rounded-full bg-cyan-500/10 px-3 py-1 text-cyan-600">{decision.kind.replaceAll("-", " ")}</span><span>{decision.subject}</span><span>·</span><span>{decision.topic}</span></div><h2 className="mt-5 text-2xl font-bold">{decision.title}</h2><p className="mt-3 text-muted-foreground">{decision.reason}</p><div className="mt-7 rounded-2xl bg-muted/50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intervention</p><p className="mt-2 font-medium">{decision.intervention}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => startIntervention(learnHref)} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Start Cortex lesson</button><button type="button" onClick={() => startIntervention(examHref)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted">Test it with 5 questions</button></div></div><div className="mt-5 rounded-2xl border p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Success check</p><p className="mt-2 text-sm">{decision.successCheck}</p><p className="mt-3 text-xs text-muted-foreground">After the intervention, return here and re-evaluate. The next decision is computed from the new durable observation.</p></div></section><aside className="rounded-3xl border p-6 sm:p-7"><div className="flex items-center justify-between"><h2 className="font-semibold">Evidence used</h2><span className="text-xs text-muted-foreground">{observedTopics} topics</span></div><div className="mt-5 space-y-4">{decision.evidence.map(item => <div key={item.signal}><div className="flex items-center justify-between gap-3 text-sm"><span className="capitalize text-muted-foreground">{item.signal}</span><span className="font-semibold">{item.value}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.interpretation}</p></div>)}</div><div className="mt-7 border-t pt-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decision priority</p><p className="mt-1 text-2xl font-bold">{decision.priority}</p><p className="mt-1 text-xs text-muted-foreground">Higher means more urgent learning need.</p></div></aside></div> : <div className="h-64 animate-pulse rounded-3xl border bg-muted/30" />}
    </main>
  );
}
