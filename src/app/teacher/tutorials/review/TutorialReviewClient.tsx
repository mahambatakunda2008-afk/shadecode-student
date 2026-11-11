"use client";

import { useEffect, useState } from "react";

type Block = { id: string; type: string; content?: string; title?: string; caption?: string; alt?: string; storagePath?: string; provider?: string; providerId?: string };
type Tutorial = { id: string; author_id: string; title: string; subject: string; topic: string | null; summary: string; blocks: Block[]; status: string; version: number; updated_at: string };
const label: Record<string, string> = { in_review: "Awaiting review", verified: "Verified · awaiting publication", published: "Published" };

export function TutorialReviewClient({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<Tutorial[]>([]);
  const [selected, setSelected] = useState<Tutorial | null>(null);
  const [note, setNote] = useState("");
  const [media, setMedia] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    const res = await fetch("/api/teacher/tutorials", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Could not load review queue.");
    setItems(json.tutorials ?? []);
  }
  useEffect(() => { refresh().catch((e) => setError(e.message)); }, []);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    const paths = [...new Set((selected.blocks ?? []).map((b) => b.storagePath).filter((p): p is string => !!p))];
    Promise.all(paths.map(async (path) => {
      const res = await fetch(`/api/teacher/tutorials/media?path=${encodeURIComponent(path)}`);
      const json = await res.json().catch(() => ({}));
      return res.ok && json.signedUrl ? [path, json.signedUrl] as const : null;
    })).then((pairs) => {
      if (active) setMedia(Object.fromEntries(pairs.filter((x): x is readonly [string, string] => !!x)));
    });
    return () => { active = false; };
  }, [selected]);

  async function review(verdict: "verified" | "changes_requested" | "rejected") {
    if (!selected || busy) return;
    if (verdict !== "verified" && !note.trim()) { setError("Add a clear note explaining the required correction."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const res = await fetch(`/api/teacher/tutorials/${selected.id}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: selected.version, verdict, note }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save review.");
      setMessage(verdict === "verified" ? "Tutorial verified. An admin can now publish it." : verdict === "rejected" ? "Tutorial rejected." : "Changes requested from the author.");
      setSelected(null); setNote(""); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save review."); }
    finally { setBusy(false); }
  }

  async function publish() {
    if (!selected || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const res = await fetch(`/api/teacher/tutorials/${selected.id}/publish`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: selected.version }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not publish tutorial.");
      setMessage("Verified tutorial published."); setSelected(null); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not publish tutorial."); }
    finally { setBusy(false); }
  }

  const queue = items.filter((item) => item.status === "in_review" || (isAdmin && item.status === "verified"));

  return (
    <div className="space-y-4">
      <header><h1 className="text-xl font-semibold">Tutorial review</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">Check factual accuracy, syllabus fit, visual clarity, captions and accessibility before publication.</p></header>
      {error && <p role="alert" className="rounded-xl border border-[var(--danger)]/30 p-3 text-sm text-[var(--danger)]">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-[var(--success)]/30 bg-[var(--success-soft)] p-3 text-sm">{message}</p>}
      {!selected ? (
        <div className="space-y-2">
          {queue.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-8 text-center text-sm text-[var(--muted-foreground)]">No tutorials are waiting in your queue.</div>}
          {queue.map((item) => <button key={item.id} onClick={() => { setSelected(item); setError(""); setMessage(""); setMedia({}); }} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-left hover:border-[var(--primary)]">
            <span className="min-w-0"><span className="block truncate font-medium">{item.title}</span><span className="mt-1 block text-xs text-[var(--muted-foreground)]">{item.subject}{item.topic ? ` · ${item.topic}` : ""} · v{item.version}</span></span>
            <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs">{label[item.status]}</span>
          </button>)}
        </div>
      ) : (
        <section className="space-y-4">
          <button onClick={() => setSelected(null)} className="text-sm text-[var(--muted-foreground)]">← Back to queue</button>
          <div className="space-y-1 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <p className="text-xs text-[var(--muted-foreground)]">{selected.subject}{selected.topic ? ` · ${selected.topic}` : ""} · Version {selected.version}</p>
            <h2 className="text-lg font-semibold">{selected.title}</h2>
            {selected.summary && <p className="text-sm text-[var(--muted-foreground)]">{selected.summary}</p>}
          </div>
          <div className="space-y-3">
            {selected.blocks.map((block, index) => <article key={block.id} className="space-y-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">{index + 1}. {block.type}</p>
              {block.type === "text" && <p className="whitespace-pre-wrap text-sm leading-relaxed">{block.content}</p>}
              {["image","diagram","sketch"].includes(block.type) && <div className="space-y-2">
                {block.storagePath && media[block.storagePath] ? <img src={media[block.storagePath]} alt={block.alt ?? ""} className="max-h-96 max-w-full rounded-xl object-contain" /> : <p className="text-xs text-[var(--muted-foreground)]">Loading private visual preview…</p>}
                <p className="text-sm font-medium">{block.alt}</p>{block.caption && <p className="text-sm text-[var(--muted-foreground)]">{block.caption}</p>}
              </div>}
              {block.type === "video" && <div className="space-y-1 text-sm"><p className="font-medium">{block.title}</p><p className="text-xs text-[var(--muted-foreground)]">{block.provider === "youtube" ? "YouTube" : "Google Drive"} video</p><a target="_blank" rel="noreferrer" href={block.provider === "youtube" ? `https://www.youtube.com/watch?v=${block.providerId}` : `https://drive.google.com/file/d/${block.providerId}/view`} className="text-[var(--primary)] underline">Open video in a new tab</a></div>}
            </article>)}
          </div>
          {selected.status === "in_review" && <div className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
            <label className="block space-y-1 text-sm"><span>Reviewer note</span><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={3} placeholder="Explain factual corrections, missing diagrams, syllabus issues or accessibility problems…" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2" /></label>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={() => review("verified")} className="rounded-xl bg-[var(--success)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Verify</button>
              <button disabled={busy} onClick={() => review("changes_requested")} className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm disabled:opacity-50">Request changes</button>
              <button disabled={busy} onClick={() => review("rejected")} className="rounded-xl border border-[var(--danger)]/50 px-3 py-2 text-sm text-[var(--danger)] disabled:opacity-50">Reject</button>
            </div>
          </div>}
          {selected.status === "verified" && isAdmin && <button disabled={busy} onClick={publish} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Publish verified version</button>}
        </section>
      )}
    </div>
  );
}
