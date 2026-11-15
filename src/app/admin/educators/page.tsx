"use client";

import { useCallback, useEffect, useState } from "react";

type Application = {
  user_id: string; display_name: string; educator_type: string; bio: string;
  subjects: string[]; levels: string[]; experience_years: number | null;
  status: string; review_note: string | null; created_at: string;
};

export default function AdminEducatorApplicationsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/educators/applications", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load applications.");
      setItems(body.applications ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load applications."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(item: Application, status: "approved" | "changes_requested" | "rejected") {
    const note = notes[item.user_id] ?? "";
    if (status === "changes_requested" && !note.trim()) { setError("Add a note explaining what needs to change."); return; }
    setBusy(item.user_id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/educators/applications", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: item.user_id, status, note }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Review failed.");
      setMessage(`${item.display_name}: ${status.replaceAll("_", " ")}.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Review failed."); }
    finally { setBusy(null); }
  }

  return <main className="mx-auto max-w-5xl space-y-5 p-5 sm:p-8">
    <header><p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Administration</p><h1 className="mt-1 text-2xl font-bold">Independent educator applications</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">Review independent tutors, subject specialists and educational creators. Approval grants content-authoring eligibility only, never school or student-record access.</p></header>
    {error && <p role="alert" className="rounded-xl bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-[var(--success)]/10 p-3 text-sm">{message}</p>}
    {loading ? <p className="text-sm text-[var(--muted-foreground)]">Loading applications…</p> : items.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--card-border)] p-8 text-center text-sm text-[var(--muted-foreground)]">No applications awaiting review.</p> : items.map(item=><article key={item.user_id} className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{item.display_name}</h2><p className="text-xs text-[var(--muted-foreground)]">{item.educator_type.replaceAll("_"," ")} · {item.experience_years == null ? "Experience not stated" : `${item.experience_years} years experience`}</p></div><span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs capitalize">{item.status.replaceAll("_"," ")}</span></div>
      <p className="text-sm leading-6">{item.bio || "No introduction supplied."}</p>
      <div className="grid gap-2 text-sm sm:grid-cols-2"><p><strong>Subjects:</strong> {item.subjects.join(", ")}</p><p><strong>Levels:</strong> {item.levels.join(", ")}</p></div>
      <p className="text-xs text-[var(--muted-foreground)]">Applied {new Date(item.created_at).toLocaleString()} · Account {item.user_id}</p>
      <textarea value={notes[item.user_id] ?? ""} onChange={e=>setNotes(old=>({...old,[item.user_id]:e.target.value}))} maxLength={1200} rows={2} placeholder="Review note (required when requesting changes)" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      <div className="flex flex-wrap gap-2"><button disabled={busy===item.user_id} onClick={()=>void decide(item,"approved")} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-50">Approve educator</button><button disabled={busy===item.user_id} onClick={()=>void decide(item,"changes_requested")} className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm disabled:opacity-50">Request changes</button><button disabled={busy===item.user_id} onClick={()=>void decide(item,"rejected")} className="rounded-xl border border-[var(--danger)]/40 px-4 py-2 text-sm text-[var(--danger)] disabled:opacity-50">Reject</button></div>
    </article>)}
  </main>;
}
