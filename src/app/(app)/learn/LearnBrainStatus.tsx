"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, CheckCircle2, Download, LoaderCircle, ShieldCheck, WifiOff } from "lucide-react";
import {
  getBrowserLocalModelStatus,
  isBrowserLocalModelAvailable,
  subscribeBrowserLocalModelStatus,
  warmBrowserLocalModel,
  type LocalModelStatus,
} from "@/lib/cortex/localModel";

export default function LearnBrainStatus() {
  const [status, setStatus] = useState<LocalModelStatus>("available");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Check whether this device can run Cortex locally.");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeBrowserLocalModelStatus((nextStatus, nextProgress) => {
      setStatus(nextStatus);
      setProgress(nextProgress);
      if (nextStatus === "ready") setMessage("Cortex local AI is ready on this device.");
      else if (nextStatus === "loading") setMessage("Downloading and preparing the local model. Keep this tab open.");
      else if (nextStatus === "unsupported") setMessage("This browser or device does not expose a compatible WebGPU device.");
      else if (nextStatus === "error") setMessage("Local model setup failed. Learn can still use online and verified-curriculum lanes.");
    });
    void isBrowserLocalModelAvailable().finally(() => setChecking(false));
    return () => { unsubscribe(); };
  }, []);

  async function enableLocalBrain() {
    setMessage("Preparing Cortex local AI. The first setup downloads approximately 1.1 GB.");
    const ready = await warmBrowserLocalModel();
    const current = getBrowserLocalModelStatus();
    setStatus(current.status);
    setProgress(current.progress);
    setMessage(ready
      ? "Cortex local AI is ready. Future lessons can use this device's model."
      : "Local AI could not start on this device. Learn will keep using the available recovery lanes.");
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6 lg:px-8" aria-label="Cortex local AI">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-xl border border-[var(--border-subtle)] p-2.5 text-[var(--primary)]">
              <BrainCircuit size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Cortex local AI</h2>
                {status === "ready" && <span className="inline-flex items-center gap-1 text-xs text-[var(--primary)]"><CheckCircle2 size={13} /> Ready</span>}
                {status === "loading" && <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]"><LoaderCircle size={13} className="animate-spin" /> Setting up</span>}
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--muted-foreground)]">{message}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                The model runs on this device after setup. Your learner memory syncs through your account when online; the model is not retrained from private activity.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {status === "loading" && (
              <div className="w-full sm:w-44" role="progressbar" aria-label="Local AI setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                  <div className="h-full rounded-full bg-[var(--primary)] transition-[width]" style={{ width: `${Math.round(progress)}%` }} />
                </div>
                <p className="mt-1 text-right text-xs tabular-nums text-[var(--muted-foreground)]">{Math.round(progress)}%</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => void enableLocalBrain()}
              disabled={checking || status === "unsupported" || status === "loading" || status === "ready"}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "ready" ? <ShieldCheck size={16} /> : status === "loading" ? <LoaderCircle size={16} className="animate-spin" /> : status === "unsupported" ? <WifiOff size={16} /> : <Download size={16} />}
              {checking ? "Checking device…" : status === "ready" ? "Local AI ready" : status === "unsupported" ? "Not supported here" : status === "loading" ? "Preparing model…" : "Enable local AI"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
