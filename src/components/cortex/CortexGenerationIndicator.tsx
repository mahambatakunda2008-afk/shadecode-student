"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";
import { getActiveGenerationJobs, subscribeGenerationJobs, type GenerationJob } from "@/lib/cortex/generationJob";

function labelFor(kind: GenerationJob["kind"]) {
  if (kind === "lesson") return "lesson";
  if (kind === "course") return "course";
  if (kind === "revision") return "revision pack";
  return "exam";
}

export default function CortexGenerationIndicator() {
  const [jobs, setJobs] = useState<GenerationJob<unknown, unknown>[]>([]);

  useEffect(() => {
    const sync = () => setJobs(getActiveGenerationJobs());
    sync();
    return subscribeGenerationJobs(sync);
  }, []);

  if (!jobs.length) return null;

  const primary = jobs[0];
  const count = jobs.length;
  const text = count === 1
    ? `Cortex is building your ${labelFor(primary.kind)}`
    : `Cortex is building ${count} things`;
  const detail = primary.status === "queued"
    ? "Queued safely on this device"
    : primary.status === "warming"
      ? `Preparing your device · ${primary.progress}%`
      : "Writing your lesson locally";

  return (
    <div className="pointer-events-none fixed bottom-[88px] right-4 z-[10000] md:bottom-5" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-3 shadow-lg backdrop-blur">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]">
          <BrainCircuit className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold leading-5">{text}</span>
          <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">{detail}</span>
        </span>
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" aria-hidden="true" />
      </div>
    </div>
  );
}
