"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FamilyLink = {
  relationship_id: string;
  institution_id: string | null;
  student_user_id: string;
  student_display_name: string;
  relationship_type: string;
  relationship_status: string;
  requested_at: string;
};

export default function JoinFamilyPage() {
  const [code, setCode] = useState("");
  const [links, setLinks] = useState<FamilyLink[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadLinks() {
    try {
      const response = await fetch("/api/platform/guardian-links", { cache: "no-store" });
      const result = await response.json();
      if (response.ok) setLinks(result.links ?? []);
      else setMessage(result.error || "Sign in to manage family links.");
    } catch {
      setMessage("Could not load family links. Try again.");
    }
  }

  useEffect(() => { void loadLinks(); }, []);

  async function redeem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/platform/guardian-links/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not redeem this invitation.");
      setCode("");
      setMessage("Invitation received. Your link is pending school verification and approval. No student information is available yet.");
      await loadLinks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not redeem this invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(relationshipId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/platform/guardian-links?relationshipId=${encodeURIComponent(relationshipId)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not revoke this family link.");
      setMessage("Family link revoked. Access through this relationship has ended.");
      await loadLinks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not revoke this family link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <div className="mx-auto max-w-2xl space-y-7">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Shadecode · Family access</p>
          <h1 className="text-3xl font-semibold tracking-tight">Connect to a learner</h1>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Redeem the student-specific invitation provided by their school. The school must verify and approve the relationship before any learner information becomes available.
          </p>
        </header>

        <form onSubmit={redeem} className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
          <label className="block space-y-2 text-sm font-medium">
            Family invitation code
            <input
              required
              minLength={20}
              maxLength={128}
              autoComplete="off"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Paste your one-time invitation code"
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3 font-mono text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
            />
          </label>
          <button disabled={busy || code.trim().length < 20} className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Working…" : "Redeem invitation"}
          </button>
        </form>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your family links</h2>
          {links.length ? links.map((link) => (
            <article key={link.relationship_id} className="space-y-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{link.student_display_name}</h3>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{link.relationship_type} · {link.relationship_status}</p>
                </div>
                <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]">{link.relationship_status === "active" ? "Approved" : link.relationship_status === "pending" ? "Awaiting school" : "Revoked"}</span>
              </div>
              <p className="break-all text-[11px] text-[var(--muted-foreground)]">Student account: {link.student_user_id}</p>
              {link.relationship_status === "active" ? (
                <button type="button" disabled={busy} onClick={() => void revoke(link.relationship_id)} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs font-medium disabled:opacity-50">Revoke family access</button>
              ) : null}
            </article>
          )) : (
            <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-5 text-sm text-[var(--muted-foreground)]">
              No family links yet. Redeem a code from the learner's institution to request a connection.
            </div>
          )}
        </section>

        {message ? <p role="status" className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
        <Link href="/" className="inline-flex text-sm font-medium text-[var(--primary)] hover:underline">Return to Shadecode</Link>
      </div>
    </main>
  );
}
