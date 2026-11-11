"use client";

import { useState } from "react";

export interface InviteRow {
  id: string;
  note: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

function status(row: InviteRow): "Used" | "Expired" | "Unused" {
  if (row.used_at) return "Used";
  return new Date(row.expires_at).getTime() < Date.now() ? "Expired" : "Unused";
}

export function InvitesClient({ initial }: { initial: InviteRow[] }) {
  const [rows, setRows] = useState(initial);
  const [note, setNote] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/teacher/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.code) throw new Error(json?.error ?? "Could not create invite.");
      setLink(`${window.location.origin}/join-teacher?code=${json.code}`);
      setRows((prev) => [
        { id: crypto.randomUUID(), note: note.trim() || null, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 14 * 864e5).toISOString(), used_at: null },
        ...prev,
      ]);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create invite.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Could not copy. Select the link and copy it manually.");
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/teacher/invites?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
    else setError("Could not revoke that invite.");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Teacher invites</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Create a single-use link and send it to a teacher. It works once and expires after 14 days.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="Who is this for? (optional, e.g. Mr Moyo, Biology)"
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        />
        <button
          onClick={create}
          disabled={busy}
          className="min-h-11 w-full rounded-2xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ background: "var(--brand-gradient)" }}
        >
          {busy ? "Creating…" : "Create invite link"}
        </button>
        {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}

        {link && (
          <div className="space-y-2 rounded-xl border border-[var(--primary)] bg-[var(--primary-glow)] p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Copy it now. For security the link is shown only once.</p>
            <p className="break-all text-sm">{link}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={copy} className="min-h-11 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm">
                {copied ? "Copied" : "Copy link"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`You're invited to review content on Shadecode Student: ${link}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm"
              >
                Send on WhatsApp
              </a>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Invites</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No invites yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const s = status(r);
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{r.note || "No note"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--muted-foreground)]">{s}</span>
                    {s === "Unused" && (
                      <button onClick={() => revoke(r.id)} className="text-xs text-[var(--danger)]">Revoke</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
