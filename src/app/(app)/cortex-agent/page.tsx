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

export default function CortexAgentPage() {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [observedTopics, setObservedTopics] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cortex/next-action", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not read Cortex state");
      setDecision(payload.decision ?? null);
      setObservedTopics(payload.observedTopics ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read Cortex state");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const learnHref = useMemo(() => {
    if (!decision) return "/learn";
    const params = new URLSearchParams({ subject: decision.subject, topic: decision.topic });
    return `/learn?${params.toString()}`;
  }, [decision]);

  const examHref = useMemo(() => {
    if (!decision) return "/exam-sim";
    const params = new URLSearchParams({ subject: decision.subject, topic: decision.topic, count: "5" });
    return `/exam-sim?${params.toString()}`;
  }, [decision]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-500">Cortex agent</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">What should I study next?</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cortex reads durable learning evidence, chooses one intervention, and shows why it chose it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
        >
          {loading ? "Re-evaluating…" : "Re-evaluate"}
        </button>
      </div>

      {error ? (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
          <h2 className="font-semibold">Cortex could not read your learning state</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </section>
      ) : !loading && !decision ? (
        <section className="rounded-2xl border p-8 text-center">
          <h2 className="text-xl font-semibold">No topic evidence yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Complete a lesson question or exam attempt with a curriculum topic attached. Cortex will use that observation to choose the next intervention.
          </p>
        </section>
      ) : decision ? (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-cyan-600">{decision.kind.replaceAll("-", " ")}</span>
              <span>{decision.subject}</span>
              <span>·</span>
              <span>{decision.topic}</span>
            </div>
            <h2 className="mt-5 text-2xl font-bold">{decision.title}</h2>
            <p className="mt-3 text-muted-foreground">{decision.reason}</p>

            <div className="mt-7 rounded-2xl bg-muted/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intervention</p>
              <p className="mt-2 font-medium">{decision.intervention}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => router.push(learnHref)} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                  Start Cortex lesson
                </button>
                <button type="button" onClick={() => router.push(examHref)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted">
                  Test it with 5 questions
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Success check</p>
              <p className="mt-2 text-sm">{decision.successCheck}</p>
              <p className="mt-3 text-xs text-muted-foreground">After the intervention, return here and re-evaluate. The next decision is computed from the new durable observation.</p>
            </div>
          </section>

          <aside className="rounded-3xl border p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Evidence used</h2>
              <span className="text-xs text-muted-foreground">{observedTopics} topics</span>
            </div>
            <div className="mt-5 space-y-4">
              {decision.evidence.map((item) => (
                <div key={item.signal}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="capitalize text-muted-foreground">{item.signal}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.interpretation}</p>
                </div>
              ))}
            </div>
            <div className="mt-7 border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decision priority</p>
              <p className="mt-1 text-2xl font-bold">{decision.priority}</p>
              <p className="mt-1 text-xs text-muted-foreground">Higher means more urgent learning need.</p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="h-64 animate-pulse rounded-3xl border bg-muted/30" />
      )}
    </main>
  );
}
