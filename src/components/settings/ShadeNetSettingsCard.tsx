"use client";

import { useState } from "react";
import { Check, Network, Shield } from "lucide-react";
import { getShadeNetRuntime, setShadeNetEnabled } from "@/lib/shadenet/runtime";

export function ShadeNetSettingsCard() {
  const [enabled, setEnabled] = useState(() => getShadeNetRuntime().enabled);
  const [busy, setBusy] = useState(false);

  const toggle = () => {
    setBusy(true);
    try {
      const next = !enabled;
      setShadeNetEnabled(next);
      setEnabled(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ssc-card p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]">
          <Network size={22} />
        </div>
        <div>
          <h2 className="text-xl">ShadeNet</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Optional peer-assisted educational content. Your private study data stays on your device.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={enabled}
        className="flex w-full items-center justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4 text-left"
      >
        <span>
          <span className="block font-semibold">Allow peer networking</span>
          <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
            {enabled ? "Discovery is enabled. Sharing still follows your resource policy." : "Off by default. No peer discovery or advertising is enabled."}
          </span>
        </span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${enabled ? "bg-[var(--primary)] text-white" : "bg-[var(--surface)] text-[var(--muted-foreground)]"}`}>
          {enabled ? <Check size={16} /> : <Shield size={16} />}
        </span>
      </button>
    </div>
  );
}
