"use client";

import { useState } from "react";

export function GuardianInviteAction({
  institutionId,
  studentUserId,
  studentName,
}: {
  institutionId: string;
  studentUserId: string;
  studentName: string;
}) {
  const [relationshipType, setRelationshipType] = useState("guardian");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createInvite() {
    setBusy(true);
    setCode("");
    setMessage("");
    try {
      const response = await fetch("/api/platform/guardian-links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ institutionId, studentUserId, relationshipType }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create family invitation.");
      setCode(result.code);
      setMessage("One-time invitation created. Share it with the verified adult.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create family invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Invitation code copied.");
    } catch {
      setMessage("Copy was blocked. Select and copy the code manually.");
    }
  }

  return (
    <div className="mt-2 max-w-md space-y-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3">
      <p className="text-xs font-semibold">Family access · {studentName}</p>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Family relationship" value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-2 py-2 text-xs">
          <option value="parent">Parent</option>
          <option value="guardian">Guardian</option>
        </select>
        <button type="button" disabled={busy} onClick={() => void createInvite()} className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {busy ? "Creating…" : "Create family invite"}
        </button>
      </div>
      {code ? (
        <div className="space-y-2">
          <code className="block break-all text-xs">{code}</code>
          <button type="button" onClick={() => void copyCode()} className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs">Copy code</button>
        </div>
      ) : null}
      {message ? <p role="status" className="text-xs text-[var(--muted-foreground)]">{message}</p> : null}
    </div>
  );
}
