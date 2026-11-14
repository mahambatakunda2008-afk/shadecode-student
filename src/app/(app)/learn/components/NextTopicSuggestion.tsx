"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Compass } from "lucide-react";
import { fetchWithTimeout } from "@/lib/async/fetchWithTimeout";
import { parseFirstStep, type FirstStep } from "@/lib/dashboard/firstStep";
import { trackEvent } from "@/lib/traction/client";

interface Props {
  /** Show only while the topic box is empty and the student is online. */
  enabled: boolean;
  token: string | null;
  onPick: (step: FirstStep) => void;
}

/**
 * One-tap "next on your syllabus" suggestion above the topic box, so no student
 * has to invent a topic. Uses the verified curriculum only: if it is unavailable
 * (not selected, unverified, offline, slow) nothing is rendered.
 */
export default function NextTopicSuggestion({ enabled, token, onPick }: Props) {
  const [step, setStep] = useState<FirstStep | null>(null);
  const requested = useRef(false);

  useEffect(() => {
    if (!enabled || requested.current) return;
    requested.current = true;
    let alive = true;
    void (async () => {
      try {
        const res = await fetchWithTimeout(
          "/api/learn/next-objective",
          { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : undefined },
          8000,
        );
        const body = res.ok ? await res.json() : null;
        if (alive) setStep(parseFirstStep(body));
      } catch {
        // No suggestion: the manual topic box still works.
      }
    })();
    return () => { alive = false; };
  }, [enabled, token]);

  if (!enabled || !step) return null;

  return (
    <button
      type="button"
      onClick={() => {
        void trackEvent("learning_action_started", { source: "learn_next_topic", subject: step.subject });
        onPick(step);
      }}
      className="group flex min-h-14 w-full items-center gap-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-glow)] px-4 py-3 text-left transition hover:border-[var(--primary)]"
    >
      <Compass size={18} className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--primary)]">Next on your syllabus · {step.subject}</span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--foreground)]">{step.title}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--primary)]">Use this <ArrowRight size={14} className="transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
    </button>
  );
}
