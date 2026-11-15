"use client";

import { useState } from "react";
import Link from "next/link";

export function InstitutionInviteRedeemer() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ membership_role: string; group_id: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  async function redeem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const response = await fetch("/api/platform/invites/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "This invitation could not be redeemed.");
      setResult(payload.membership);
      setMessage("You're connected to the institution.");
      setCode("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This invitation could not be redeemed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[65vh] w-full max-w-xl items-center px-4 py-10">
      <section className="w-full space-y-5 rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Shadecode Education</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Join your institution</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Enter the one-time invitation code shared by your school or institution administrator. You must be signed in to redeem it.
          </p>
        </div>
        <form onSubmit={redeem} className="space-y-3">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Invitation code</span>
            <input
              required
              minLength={20}
              maxLength={128}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste your invitation code"
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3 font-mono text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
            />
          </label>
          <button disabled={busy || code.trim().length < 20} className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Checking invitation…" : "Join institution"}
          </button>
        </form>
        {message ? <p role="status" className="text-sm text-[var(--muted-foreground)]">{message}</p> : null}
        {result ? (
          <div className="space-y-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
            <p className="text-sm font-semibold">Membership activated</p>
            <p className="text-sm text-[var(--muted-foreground)]">Role: {result.membership_role.replace(/_/g, " ")}</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {result.group_id ? "A class or group assignment was included." : "Your institution membership is active. A class assignment may follow separately."}
            </p>
            <Link href={result.membership_role === "student" ? "/" : "/teacher/classes"} className="inline-flex rounded-xl bg-[var(--primary-glow)] px-3 py-2 text-sm font-medium text-[var(--primary)]">
              Continue
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
