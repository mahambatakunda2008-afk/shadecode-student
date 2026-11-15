"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RosterMembershipActions({
  institutionId,
  groupId,
  targetUserId,
}: {
  institutionId: string;
  groupId: string;
  targetUserId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function update(status: "suspended" | "revoked") {
    const verb = status === "suspended" ? "suspend" : "revoke";
    if (!window.confirm(`Are you sure you want to ${verb} this class membership? This removes their active class access.`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/platform/memberships/status", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ institutionId, targetUserId, groupId, status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Membership could not be changed.");
      setMessage(status === "suspended" ? "Access suspended." : "Access revoked.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Membership could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" disabled={busy} onClick={() => update("suspended")} className="rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] disabled:opacity-50">
        Suspend
      </button>
      <button type="button" disabled={busy} onClick={() => update("revoked")} className="rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50">
        Revoke
      </button>
      {message ? <span role="status" className="text-xs text-[var(--muted-foreground)]">{message}</span> : null}
    </div>
  );
}
