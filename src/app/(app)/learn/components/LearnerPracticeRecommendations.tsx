"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BrainCircuit, RotateCcw } from "lucide-react";
import { readVerifyLearnerModel } from "@/lib/cortex/verify/learner-model-store";
import { recommendVerifyPractice, type VerifyPracticeRecommendation } from "@/lib/cortex/verify/learner-model";

interface Props {
  userId: string | null;
  subject: string;
  onPick: (topic: string) => void;
}

const ACTION_LABELS: Record<VerifyPracticeRecommendation["action"], string> = {
  reteach: "Rebuild the foundations",
  "guided-retry": "Guided practice",
  "transfer-practice": "Apply the skill",
  "spaced-retrieval": "Quick retrieval review",
};

/**
 * Uses only this account's private, device-local marked evidence. These are
 * study suggestions, not verified curriculum mastery or cross-device records.
 */
export default function LearnerPracticeRecommendations({ userId, subject, onPick }: Props) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  const recommendations = useMemo(() => {
    if (!userId || !subject.trim()) return [];
    const model = readVerifyLearnerModel(userId);
    return recommendVerifyPractice(model, { subject, limit: 3 });
  }, [userId, subject, revision]);

  if (!recommendations.length) return null;

  return (
    <section aria-label="Your practice priorities" className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-[var(--primary-glow)] p-2 text-[var(--primary)]"><BrainCircuit size={18} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">Your next practice priorities</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Based on marked attempts saved on this device. Estimates guide practice, they do not certify mastery.</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {recommendations.map(item => (
          <button key={item.topic} type="button" onClick={() => onPick(item.topic)} className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-left transition hover:border-[var(--primary)]">
            <RotateCcw size={15} className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{item.topic}</span>
              <span className="mt-0.5 block text-[11px] text-[var(--muted-foreground)]">{ACTION_LABELS[item.action]} · priority {item.priority}/100</span>
            </span>
            <ArrowRight size={15} className="shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
