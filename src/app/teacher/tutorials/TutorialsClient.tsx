"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Block = {
  id: string;
  type: "text" | "image" | "diagram" | "sketch" | "video";
  content?: string;
  title?: string;
  caption?: string;
  alt?: string;
  storagePath?: string;
  provider?: "youtube" | "drive";
  providerId?: string;
};
type Tutorial = {
  id: string; author_id: string; title: string; subject: string; topic: string | null; summary: string;
  blocks: Block[]; status: string; version: number; updated_at: string;
};

const statusLabel: Record<string, string> = {
  draft: "Draft", in_review: "In review", verified: "Verified", published: "Published",
  changes_requested: "Changes requested", rejected: "Rejected",
};

function parseVideo(value: string): { provider: "youtube" | "drive"; providerId: string } | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(url.hostname)) {
      const id = url.hostname === "youtu.be"
        ? url.pathname.split("/").filter(Boolean)[0]
        : url.pathname === "/watch" ? url.searchParams.get("v") ?? ""
        : url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/)?.[1] ?? "";
      return id && /^[\w-]{11}$/.test(id) ? { provider: "youtube", providerId: id } : null;
    }
    if (["drive.google.com", "docs.google.com"].includes(url.hostname)) {
      const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1]
        ?? url.pathname.match(/\/document\/d\/([\w-]+)/)?.[1]
        ?? url.searchParams.get("id") ?? "";
      return /^[\w-]{10,200}$/.test(id) ? { provider: "drive", providerId: id } : null;
    }
  } catch {}
  return null;
}

export function TutorialsClient() {
  const [items, setItems] = useState<Tutorial[]>([]);
  const [current, setCurrent] = useState<Tutorial | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [summary, setSummary] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mediaKind, setMediaKind] = useState<"image" | "diagram" | "sketch">("image");
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadItems() {
    const res = await fetch("/api/teacher/tutorials", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Could not load tutorials.");
    setItems(json.tutorials ?? []);
  }

  useEffect(() => { loadItems().catch((e) => setError(e.message)); }, []);

  function openItem(item: Tutorial) {
    setCurrent(item); setTitle(item.title); setSubject(item.subject); setTopic(item.topic ?? "");
    setSummary(item.summary ?? ""); setBlocks(item.blocks ?? []); setError(""); setMessage("");
  }

  function resetEditor() {
    setCurrent(null); setTitle(""); setSubject(""); setTopic(""); setSummary(""); setBlocks([]);
    setError(""); setMessage("");
  }

  async function createDraft() {
    setBusy(true); setError("");
    try {
      const initialBlock: Block = { id: crypto.randomUUID(), type: "text", content: "Start writing your explanation here." };
      const res = await fetch("/api/teacher/tutorials", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New tutorial", subject: "General", blocks: [initialBlock] }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not create draft.");
      await loadItems(); openItem(json.tutorial);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create draft."); }
    finally { setBusy(false); }
  }

  async function save(submit = false) {
    if (!current || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const res = await fetch(`/api/teacher/tutorials/${current.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subject, topic, summary, blocks, status: submit ? "in_review" : "draft" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save tutorial.");
      setCurrent(json.tutorial); setBlocks(json.tutorial.blocks);
      await loadItems();
      setMessage(submit ? "Submitted for review. Your version is now locked while reviewers assess it." : "Draft saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save tutorial."); }
    finally { setBusy(false); }
  }

  function updateBlock(index: number, patch: Partial<Block>) {
    setBlocks((old) => old.map((block, i) => i === index ? { ...block, ...patch } : block));
  }
  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((old) => {
      const next = [...old]; const target = index + direction;
      if (target < 0 || target >= next.length) return old;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function addText() { setBlocks((old) => [...old, { id: crypto.randomUUID(), type: "text", content: "" }]); }

  async function addVideo() {
    const parsed = parseVideo(videoUrl);
    if (!parsed) { setError("Use a valid HTTPS YouTube or Google Drive video link."); return; }
    setBlocks((old) => [...old, { id: crypto.randomUUID(), type: "video", ...parsed, title: videoTitle.trim() || "Video tutorial" }]);
    setVideoUrl(""); setVideoTitle(""); setError("");
  }

  async function uploadImage(file?: File) {
    if (!file || !current) return;
    if (!file.type.startsWith("image/") || file.size > 50 * 1024 * 1024) {
      setError("Choose a supported image smaller than 50 MiB."); return;
    }
    setBusy(true); setError("");
    try {
      const prepared = await fetch("/api/teacher/tutorials/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorialId: current.id, mimeType: file.type, size: file.size }),
      });
      const signed = await prepared.json().catch(() => ({}));
      if (!prepared.ok) throw new Error(signed.error ?? "Could not prepare upload.");
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage.from("teacher-media").uploadToSignedUrl(
        signed.path, signed.token, file, { contentType: file.type, upsert: false },
      );
      if (uploadError) throw uploadError;
      setBlocks((old) => [...old, {
        id: crypto.randomUUID(), type: mediaKind, storagePath: signed.path,
        alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), caption: "",
      }]);
      setMessage("Image uploaded to private teacher storage. Add a descriptive caption before submission.");
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  const editable = current && ["draft", "changes_requested"].includes(current.status);
  const wordCount = useMemo(() => blocks.reduce((n, b) => n + (b.content?.trim().split(/\s+/).filter(Boolean).length ?? 0), 0), [blocks]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tutorial studio</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Build lessons with explanations, visuals and video. Every submission goes through review.</p>
        </div>
        {!current && <button onClick={createDraft} disabled={busy} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">＋ New tutorial</button>}
        {current && <button onClick={resetEditor} className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm">Back to tutorials</button>}
      </header>

      {error && <p role="alert" className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-3 text-sm text-[var(--danger)]">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-[var(--success)]/30 bg-[var(--success-soft)] p-3 text-sm">{message}</p>}

      {!current ? (
        <section className="space-y-3">
          {items.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-8 text-center text-sm text-[var(--muted-foreground)]">No tutorials yet. Create your first draft to start teaching.</div>}
          {items.map((item) => (
            <button key={item.id} onClick={() => openItem(item)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-left hover:border-[var(--primary)]">
              <span className="min-w-0"><span className="block truncate font-medium">{item.title}</span><span className="mt-1 block text-xs text-[var(--muted-foreground)]">{item.subject} · v{item.version} · {new Date(item.updated_at).toLocaleDateString()}</span></span>
              <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs">{statusLabel[item.status] ?? item.status}</span>
            </button>
          ))}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs">
            <span>{statusLabel[current.status] ?? current.status} · Version {current.version}</span>
            <span>{wordCount} words · {blocks.length} blocks</span>
          </div>
          {!editable && <p className="rounded-xl border border-[var(--card-border)] p-3 text-sm text-[var(--muted-foreground)]">This version is locked while it is being reviewed or after verification. Review feedback will appear here when available.</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm"><span>Title</span><input disabled={!editable} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 disabled:opacity-60" /></label>
            <label className="space-y-1 text-sm"><span>Subject</span><input disabled={!editable} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 disabled:opacity-60" /></label>
            <label className="space-y-1 text-sm"><span>Topic</span><input disabled={!editable} value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={180} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 disabled:opacity-60" /></label>
            <label className="space-y-1 text-sm sm:col-span-2"><span>Short description</span><textarea disabled={!editable} value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} maxLength={1200} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 disabled:opacity-60" /></label>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Lesson content</h2><span className="text-xs text-[var(--muted-foreground)]">Reorder blocks to control the lesson flow.</span></div>
            {blocks.map((block, index) => (
              <article key={block.id} className="space-y-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{block.type} · {index + 1}</span><div className="flex gap-1">
                  <button disabled={!editable || index === 0} onClick={() => moveBlock(index, -1)} className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-xs disabled:opacity-30" aria-label="Move block up">↑</button>
                  <button disabled={!editable || index === blocks.length - 1} onClick={() => moveBlock(index, 1)} className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-xs disabled:opacity-30" aria-label="Move block down">↓</button>
                  <button disabled={!editable} onClick={() => setBlocks((old) => old.filter((_, i) => i !== index))} className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-xs disabled:opacity-30">Remove</button>
                </div></div>
                {block.type === "text" ? <textarea disabled={!editable} value={block.content ?? ""} onChange={(e) => updateBlock(index, { content: e.target.value })} rows={5} maxLength={20000} placeholder="Explain the concept clearly. Include worked steps and examples." className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm leading-relaxed disabled:opacity-60" /> : null}
                {["image","diagram","sketch"].includes(block.type) ? <div className="space-y-2">
                  <input disabled={!editable} value={block.alt ?? ""} onChange={(e) => updateBlock(index, { alt: e.target.value })} placeholder="Describe what the image shows (required for accessibility)" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <input disabled={!editable} value={block.caption ?? ""} onChange={(e) => updateBlock(index, { caption: e.target.value })} placeholder="Caption / labels / source" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <p className="text-xs text-[var(--muted-foreground)]">Private media path: {block.storagePath}</p>
                </div> : null}
                {block.type === "video" ? <div className="space-y-1"><p className="font-medium text-sm">{block.title}</p><p className="break-all text-xs text-[var(--muted-foreground)]">{block.provider === "youtube" ? "YouTube" : "Google Drive"} · {block.providerId}</p><p className="text-xs text-[var(--muted-foreground)]">Student playback will be click-to-load with no autoplay.</p></div> : null}
              </article>
            ))}
          </div>

          {editable && <div className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3">
            <h3 className="text-sm font-semibold">Add content</h3>
            <button onClick={addText} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm">＋ Text block</button>
            <div className="flex flex-wrap items-center gap-2">
              <select value={mediaKind} onChange={(e) => setMediaKind(e.target.value as typeof mediaKind)} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-2 py-2 text-sm"><option value="image">Image</option><option value="diagram">Diagram</option><option value="sketch">Sketch / whiteboard photo</option></select>
              <button onClick={() => fileRef.current?.click()} disabled={!current || busy} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm disabled:opacity-50">Upload visual</button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => uploadImage(e.target.files?.[0])} />
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Video title" className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm" />
              <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube or Google Drive link" className="min-w-0 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm" />
              <button onClick={addVideo} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm">Add video</button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">Uploads are private and limited to 50 MiB. Video links are validated and do not load a player in the editor.</p>
          </div>}

          {editable && <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--card-border)] pt-4">
            <button onClick={() => save(false)} disabled={busy} className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm disabled:opacity-50">{busy ? "Saving…" : "Save draft"}</button>
            <button onClick={() => save(true)} disabled={busy || blocks.length === 0} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Submit for review"}</button>
          </div>}
        </section>
      )}
    </div>
  );
}
