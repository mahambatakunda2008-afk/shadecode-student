"use client";

import { useState } from "react";

export default function ExperimentToggle({ id, active }: { id: string; active: boolean }) {
  const [enabled, setEnabled] = useState(active);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/experiments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !enabled }),
      });
      if (!response.ok) throw new Error("update failed");
      const data = await response.json();
      setEnabled(Boolean(data?.experiment?.active));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={toggle} disabled={busy} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 ${enabled ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/5 text-zinc-400"}`}>
      {busy ? "Saving…" : enabled ? "Pause" : "Activate"}
    </button>
  );
}
