"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JoinClient({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(code ? null : "This link is missing its invite code. Ask for a new one.");

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Could not accept the invite.");
      router.replace("/teacher");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept the invite.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={accept}
        disabled={busy || !code}
        className="min-h-11 w-full rounded-2xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
        style={{ background: "var(--brand-gradient)" }}
      >
        {busy ? "Joining…" : "Accept invite"}
      </button>
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
