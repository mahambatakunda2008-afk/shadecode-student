"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TutorialStatus } from "@/lib/teacher/tutorial";

export interface MyTutorial { id: string; title: string; status: TutorialStatus; updated_at: string }
export interface PendingTutorial { id: string; title: string; updatedAt: string; correct: number; flagged: number; own: boolean }

const STATUS_LABEL: Record<TutorialStatus, string> = { draft: "Draft", in_review: "In review", verified: "Verified" };

export function TutorialsClient({ mine, pending, isAdmin }: { mine: MyTutorial[]; pending: PendingTutorial[]; isAdmin: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/tutorials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, subject }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.id) throw new Error(json?.error ?? "Could not create the tutorial.");
      router.push(`/teacher/tutorials/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the tutorial.");
      setBusy(false);
    }
  }

  async function decide(id: string, action: "verify" | "send_back") {
    setError(null);
    const res = await fetch(`/api/teacher/tutorials/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    if (res.ok) router.refresh();
    else setError((await res.json().catch(() => ({})))?.error ?? "Could not update.");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Tutorials</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Write a tutorial with text, photos of sketches and diagrams, and video links. Other teachers review it before it is verified.</p>
      </header>

      <section className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Tutorial title, e.g. Balancing chemical equations"
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={80} placeholder="Subject (optional)"
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
        <button onClick={create} disabled={busy || !title.trim()} className="min-h-11 w-full rounded-2xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50" style={{ background: "var(--brand-gradient)" }}>
          {busy ? "Creating…" : "New tutorial"}
        </button>
      </section>
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}

      {isAdmin && pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Waiting for verification</h2>
          <ul className="space-y-2">
            {pending.map((p) => (
              <li key={p.id} className="space-y-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm">
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{p.correct} marked correct · {p.flagged} flagged{p.own ? " · your own tutorial" : ""}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => decide(p.id, "verify")} className="min-h-11 rounded-2xl border border-[var(--success)] px-3 hover:bg-[var(--success-soft)]">Verify</button>
                  <button onClick={() => decide(p.id, "send_back")} className="min-h-11 rounded-2xl border border-[var(--card-border)] px-3 hover:bg-[var(--surface-2)]">Send back</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">My tutorials</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Nothing yet. Create your first one above.</p>
        ) : (
          <ul className="space-y-2">
            {mine.map((t) => (
              <li key={t.id}>
                <Link href={`/teacher/tutorials/${t.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-sm transition hover:border-[var(--primary)]">
                  <span className="min-w-0 truncate">{t.title}</span>
                  <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{STATUS_LABEL[t.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
