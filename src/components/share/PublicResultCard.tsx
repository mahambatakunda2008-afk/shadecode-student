"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/BrandMark";
import { trackEvent } from "@/lib/traction/client";
import { formatDuration, resultShareText, type PublicResult } from "@/lib/share/publicResult";

const GRADE_TEXT: Record<string, string> = {
  "A*": "text-emerald-400", A: "text-emerald-400", B: "text-blue-400", C: "text-yellow-400",
  D: "text-orange-400", E: "text-orange-400", U: "text-red-400",
};

interface Props {
  result: PublicResult;
  sharePath: string;
}

export function PublicResultCard({ result, sharePath }: Props) {
  const [copied, setCopied] = useState(false);
  const duration = formatDuration(result.timeSeconds);
  const stats = [
    { label: "Questions", value: String(result.total) },
    { label: "Correct", value: String(result.correct) },
    ...(duration ? [{ label: "Time", value: duration }] : []),
  ];
  const fullUrl = () => `${window.location.origin}${sharePath}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl());
      setCopied(true);
      void trackEvent("result_shared", { channel: "copy" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const whatsapp = () => {
    void trackEvent("result_shared", { channel: "whatsapp" });
    window.open(`https://wa.me/?text=${encodeURIComponent(resultShareText(result, fullUrl()))}`, "_blank", "noopener,noreferrer");
  };

  return (
    <article className="w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl overflow-hidden" aria-label={`${result.subject} result`}>
      <div className="h-1 w-full" style={{ background: "var(--brand-gradient)" }} aria-hidden="true" />
      <div className="flex items-center justify-between gap-3 px-6 pt-5">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          <BrandMark width={18} height={18} aria-hidden="true" /> Shadecode Student
        </span>
        <span className="rounded-full border border-[var(--card-border)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)]">{result.difficulty}</span>
      </div>
      <div className="space-y-6 px-6 py-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">{result.subject}</h1>
          {result.topic && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{result.topic}</p>}
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-5xl font-black text-[var(--foreground)]">{result.percentage}<span className="text-2xl font-semibold text-[var(--muted-foreground)]">%</span></p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{result.correct}/{result.total} correct</p>
          </div>
          <p className={cn("text-6xl font-black", GRADE_TEXT[result.grade] ?? "text-slate-300")} aria-label={`Grade ${result.grade}`}>{result.grade}</p>
        </div>
        <dl className={cn("grid gap-3", stats.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 text-center">
              <dt className="text-xs text-[var(--muted-foreground)]">{s.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="space-y-3 px-6 pb-6">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={copy} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium", copied ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400" : "border-[var(--card-border)] bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]")}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button type="button" onClick={whatsapp} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/15 px-3 text-sm font-medium text-[#25D366] hover:bg-[#25D366]/25">
            <Share2 className="h-4 w-4" aria-hidden="true" /> WhatsApp
          </button>
        </div>
        <a href="/auth/signup" className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]">
          Beat this score — start free
        </a>
      </div>
    </article>
  );
}
