"use client";

import { useState } from "react";
import { Check, Link2, MessageCircle } from "lucide-react";
import { trackEvent } from "@/lib/traction/client";
import { LESSON_QUIZ_LABEL, resultShareText, type PublicResult } from "@/lib/share/publicResult";

interface Props {
  attemptId: string;
  subject: string;
  correct: number;
  total: number;
  percentage: number;
  grade: string;
}

/** WhatsApp + copy-link sharing for a finished lesson quiz. Links to the public /results/[id] card. */
export function ShareQuizResult({ attemptId, subject, correct, total, percentage, grade }: Props) {
  const [copied, setCopied] = useState(false);
  if (!attemptId || total === 0) return null;

  const summary: PublicResult = {
    subject: subject || "a lesson quiz",
    topic: null,
    difficulty: LESSON_QUIZ_LABEL,
    percentage,
    correct,
    total,
    grade,
    timeSeconds: null,
    completedAt: null,
  };
  const url = () => `${window.location.origin}/results/${attemptId}`;

  const whatsapp = () => {
    void trackEvent("result_shared", { channel: "whatsapp", source: "lesson_quiz" });
    window.open(`https://wa.me/?text=${encodeURIComponent(resultShareText(summary, url()))}`, "_blank", "noopener,noreferrer");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      void trackEvent("result_shared", { channel: "copy", source: "lesson_quiz" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mb-6 flex gap-2.5">
      <button type="button" onClick={whatsapp} className="ssc-button min-h-12 flex-1 font-semibold">
        <MessageCircle size={16} aria-hidden="true" /> Share on WhatsApp
      </button>
      <button type="button" onClick={copy} className="ssc-button ssc-button-secondary min-h-12 flex-1 font-semibold" aria-live="polite">
        {copied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />} {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
