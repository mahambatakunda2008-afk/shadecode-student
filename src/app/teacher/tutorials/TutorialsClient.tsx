"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SketchWorkspace } from "./SketchWorkspace";

type Block = {
  id: string;
  type: "text" | "image" | "diagram" | "sketch" | "video" | "audio" | "graph" | "table";
  content?: string;
  title?: string;
  caption?: string;
  alt?: string;
  storagePath?: string;
  provider?: "youtube" | "drive";
  providerId?: string;
  transcript?: string;
  data?: Record<string, unknown>;
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


type GraphPoint = { x: number; y: number };
type TableData = { headers: string[]; rows: string[][] };

function readGraphPoints(data: Record<string, unknown> | undefined): GraphPoint[] {
  const raw = data?.points;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((point) => {
    if (!point || typeof point !== "object") return [];
    const candidate = point as Record<string, unknown>;
    return typeof candidate.x === "number" && Number.isFinite(candidate.x)
      && typeof candidate.y === "number" && Number.isFinite(candidate.y)
      ? [{ x: candidate.x, y: candidate.y }] : [];
  });
}

function GraphEditor({ data, disabled, onChange }: {
  data: Record<string, unknown> | undefined; disabled: boolean;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const points = readGraphPoints(data);
  const xLabel = typeof data?.xLabel === "string" ? data.xLabel : "";
  const yLabel = typeof data?.yLabel === "string" ? data.yLabel : "";
  const xMin = points.length ? Math.min(...points.map((p) => p.x)) : 0;
  const xMax = points.length ? Math.max(...points.map((p) => p.x)) : 1;
  const yMin = points.length ? Math.min(...points.map((p) => p.y)) : 0;
  const yMax = points.length ? Math.max(...points.map((p) => p.y)) : 1;
  const spanX = xMax - xMin || 1;
  const spanY = yMax - yMin || 1;
  const plotted = points.map((p) => `${40 + ((p.x - xMin) / spanX) * 320},${190 - ((p.y - yMin) / spanY) * 160}`).join(" ");
  const updatePoint = (index: number, key: "x" | "y", value: number) => {
    const next = [...points]; next[index] = { ...next[index], [key]: value };
    onChange({ ...(data ?? {}), points: next });
  };
  return <div className="space-y-3">
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="space-y-1 text-xs"><span>X-axis label</span><input disabled={disabled} value={xLabel} onChange={(e) => onChange({ ...(data ?? {}), xLabel: e.target.value, points })} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-2 py-2 text-sm" /></label>
      <label className="space-y-1 text-xs"><span>Y-axis label</span><input disabled={disabled} value={yLabel} onChange={(e) => onChange({ ...(data ?? {}), yLabel: e.target.value, points })} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-2 py-2 text-sm" /></label>
    </div>
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-2">
      <svg viewBox="0 0 400 220" role="img" aria-label={`Graph preview: ${points.length} plotted points`} className="h-auto w-full">
        {[30, 70, 110, 150, 190].map((y) => <line key={y} x1="40" y1={y} x2="360" y2={y} stroke="currentColor" opacity=".13" strokeDasharray="3 4" />)}
        {[40, 120, 200, 280, 360].map((x) => <line key={x} x1={x} y1="30" x2={x} y2="190" stroke="currentColor" opacity=".13" strokeDasharray="3 4" />)}
        <path d="M40 30 V190 H360" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {points.length > 1 && <polyline points={plotted} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((p, i) => <circle key={i} cx={40 + ((p.x - xMin) / spanX) * 320} cy={190 - ((p.y - yMin) / spanY) * 160} r="4" fill="var(--primary)" />)}
        <text x="200" y="215" textAnchor="middle" fontSize="10" fill="currentColor">{xLabel || "X"}</text>
        <text x="12" y="110" textAnchor="middle" fontSize="10" fill="currentColor" transform="rotate(-90 12 110)">{yLabel || "Y"}</text>
      </svg>
      <p className="text-center text-xs text-[var(--muted-foreground)]">Live preview · axes scale to the entered data</p>
    </div>
    <div className="space-y-2">
      <div className="flex items-center justify-between"><span className="text-sm font-medium">Data points</span><button type="button" disabled={disabled || points.length >= 100} onClick={() => onChange({ ...(data ?? {}), points: [...points, { x: points.length ? points[points.length - 1].x + 1 : 0, y: 0 }] })} className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-xs disabled:opacity-40">＋ Add point</button></div>
      {points.map((point, index) => <div key={index} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
        <span className="text-xs text-[var(--muted-foreground)]">{index + 1}</span>
        <label className="text-xs">X<input type="number" step="any" disabled={disabled} value={point.x} onChange={(e) => updatePoint(index, "x", Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-2 py-2 text-sm" /></label>
        <label className="text-xs">Y<input type="number" step="any" disabled={disabled} value={point.y} onChange={(e) => updatePoint(index, "y", Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-2 py-2 text-sm" /></label>
        <button type="button" disabled={disabled || points.length <= 1} onClick={() => onChange({ ...(data ?? {}), points: points.filter((_, i) => i !== index) })} aria-label={`Remove point ${index + 1}`} className="mt-4 rounded-lg border border-[var(--card-border)] px-2 py-2 text-xs disabled:opacity-30">×</button>
      </div>)}
      {points.length === 0 && <p className="text-xs text-[var(--muted-foreground)]">Add points to start plotting.</p>}
    </div>
  </div>;
}

function TableEditor({ data, disabled, onChange }: {
  data: Record<string, unknown> | undefined; disabled: boolean;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const headers = Array.isArray(data?.headers) ? data.headers.map(String) : ["Column 1", "Column 2"];
  const rows = Array.isArray(data?.rows) ? data.rows.map((row) => Array.isArray(row) ? row.map(String) : []) : [["", ""]];
  const update = (nextHeaders: string[], nextRows: string[][]) => onChange({ ...(data ?? {}), headers: nextHeaders, rows: nextRows });
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">Table editor</span><div className="flex gap-2">
      <button type="button" disabled={disabled || headers.length >= 12} onClick={() => update([...headers, `Column ${headers.length + 1}`], rows.map((row) => [...row, ""]))} className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-xs disabled:opacity-40">＋ Column</button>
      <button type="button" disabled={disabled || rows.length >= 100} onClick={() => update(headers, [...rows, headers.map(() => "")])} className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-xs disabled:opacity-40">＋ Row</button>
    </div></div>
    <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
      <table className="w-full min-w-[360px] border-collapse text-sm"><thead><tr>{headers.map((header, col) => <th key={col} className="border-b border-[var(--card-border)] bg-[var(--surface-2)] p-2 text-left">
        <input disabled={disabled} value={header} onChange={(e) => { const next = [...headers]; next[col] = e.target.value; update(next, rows); }} aria-label={`Column ${col + 1} heading`} className="w-full min-w-20 bg-transparent font-semibold outline-none" />
      </th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, col) => <td key={col} className="border-t border-[var(--card-border)] p-1">
        <input disabled={disabled} value={row[col] ?? ""} onChange={(e) => { const next = rows.map((r) => [...r]); next[rowIndex] = [...(next[rowIndex] ?? [])]; next[rowIndex][col] = e.target.value; update(headers, next); }} aria-label={`Row ${rowIndex + 1}, column ${col + 1}`} className="w-full min-w-20 rounded-md bg-transparent px-2 py-2 outline-none focus:bg-[var(--surface-2)]" />
      </td>)}</tr>)}</tbody></table>
    </div>
    <p className="text-xs text-[var(--muted-foreground)]">Edit cells directly. The table stays structured for accessible rendering in the student lesson.</p>
  </div>;
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
  const [mediaKind, setMediaKind] = useState<"image" | "diagram" | "sketch" | "audio">("image");
  const [showSketch, setShowSketch] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadItems() {
    const res = await fetch("/api/teacher/tutorials", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Could not load tutorials.");
    setItems(json.tutorials ?? []);
  }

  useEffect(() => { loadItems().catch((e) => setError(e.message)); }, []);

  async function openItem(item: Tutorial) {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/teacher/tutorials/${item.id}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not open tutorial.");
      const full = json.tutorial as Tutorial;
      setCurrent(full); setTitle(full.title); setSubject(full.subject); setTopic(full.topic ?? "");
      setSummary(full.summary ?? ""); setBlocks(full.blocks ?? []); setMessage("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not open tutorial."); }
    finally { setBusy(false); }
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

  async function uploadImage(file?: File, kindOverride?: "image" | "diagram" | "sketch" | "audio") {
    if (!file || !current) return;
    const kind = kindOverride ?? mediaKind;
    const supported = kind === "audio" ? ["audio/mpeg", "audio/mp4", "audio/webm"].includes(file.type) : ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type);
    if (!supported || file.size > 50 * 1024 * 1024) {
      setError(kind === "audio" ? "Choose MP3, M4A or WebM audio smaller than 50 MiB." : "Choose JPEG, PNG, WebP or AVIF smaller than 50 MiB."); return;
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
        id: crypto.randomUUID(), type: kind, storagePath: signed.path,
        ...(kind === "audio" ? {} : { alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") }), caption: "",
      }]);
      setMessage(kind === "sketch" ? "Sketch saved to private teacher storage. Add a descriptive caption before submission." : kind === "audio" ? "Audio uploaded to private teacher storage." : "Image uploaded to private teacher storage. Add a descriptive caption before submission.");
      if (kind === "sketch") setShowSketch(false);
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
        {!current && <Link href="/teacher/tutorials/review" className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm">Review queue</Link>}
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
                {["graph", "table"].includes(block.type) ? <div className="space-y-3">
                  <input disabled={!editable} value={block.title ?? ""} onChange={(e) => updateBlock(index, { title: e.target.value })} placeholder="Visual title" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  {block.type === "graph"
                    ? <GraphEditor data={block.data} disabled={!editable} onChange={(data) => updateBlock(index, { data })} />
                    : <TableEditor data={block.data} disabled={!editable} onChange={(data) => updateBlock(index, { data })} />}
                </div> : null}
                {block.type === "audio" ? <div className="space-y-2"><input disabled={!editable} value={block.title ?? ""} onChange={(e) => updateBlock(index, { title: e.target.value })} placeholder="Audio title" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm" /><textarea disabled={!editable} value={block.transcript ?? ""} onChange={(e) => updateBlock(index, { transcript: e.target.value })} rows={3} maxLength={20000} placeholder="Audio transcript (recommended for accessibility and offline study)" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm" /></div> : null}
                {block.type === "video" ? <div className="space-y-1"><p className="font-medium text-sm">{block.title}</p><p className="break-all text-xs text-[var(--muted-foreground)]">{block.provider === "youtube" ? "YouTube" : "Google Drive"} · {block.providerId}</p><p className="text-xs text-[var(--muted-foreground)]">Student playback will be click-to-load with no autoplay.</p></div> : null}
              </article>
            ))}
          </div>

          {editable && <div className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3">
            <h3 className="text-sm font-semibold">Add content</h3>
            <button onClick={addText} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm">＋ Text block</button>
            <button onClick={() => setBlocks(old => [...old, { id: crypto.randomUUID(), type: "graph", title: "Graph", data: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] } }])} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm">＋ Graph</button>
            <button onClick={() => setBlocks(old => [...old, { id: crypto.randomUUID(), type: "table", title: "Data table", data: { headers: ["Column 1", "Column 2"], rows: [["", ""]] } }])} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm">＋ Table</button>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setShowSketch((open) => !open)} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm">{showSketch ? "Close sketch workspace" : "＋ Draw a diagram / sketch"}</button>
              <select value={mediaKind} onChange={(e) => setMediaKind(e.target.value as typeof mediaKind)} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-2 py-2 text-sm"><option value="image">Image</option><option value="diagram">Diagram</option><option value="sketch">Sketch / whiteboard photo</option><option value="audio">Audio explanation</option></select>
              <button onClick={() => fileRef.current?.click()} disabled={!current || busy} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm disabled:opacity-50">Upload visual</button>
              <input ref={fileRef} type="file" accept={mediaKind === "audio" ? "audio/mpeg,audio/mp4,audio/webm" : "image/jpeg,image/png,image/webp,image/avif"} hidden onChange={(e) => uploadImage(e.target.files?.[0])} />
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Video title" className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm" />
              <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube or Google Drive link" className="min-w-0 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm" />
              <button onClick={addVideo} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm">Add video</button>
            </div>
            {showSketch && <SketchWorkspace onSave={(file) => uploadImage(file, "sketch")} onCancel={() => setShowSketch(false)} saving={busy} />}
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
