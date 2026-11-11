"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, FileText, Image as ImageIcon, Loader2, Play, Table2, Video } from "lucide-react";

type TutorialSummary = { id: string; title: string; subject: string; topic: string | null; summary: string | null; published_at: string | null };
type TutorialBlock = { id: string; type: string; title?: string; content?: string; caption?: string; alt?: string; transcript?: string; provider?: "youtube" | "drive"; providerId?: string; data?: Record<string, unknown>; mediaUrl?: string | null };
type Tutorial = TutorialSummary & { blocks: TutorialBlock[]; version: number };

function VideoBlock({ block }: { block: TutorialBlock }) {
  const [started, setStarted] = useState(false);
  const source = block.provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(block.providerId ?? "")}?autoplay=1&rel=0`
    : `https://drive.google.com/file/d/${encodeURIComponent(block.providerId ?? "")}/preview`;
  return <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
    <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Video size={16} />{block.title || "Video tutorial"}</div>
    {started ? <iframe title={block.title || "Teacher video tutorial"} src={source} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="aspect-video w-full rounded-xl border-0" /> :
      <button type="button" onClick={() => setStarted(true)} className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-[var(--surface-2)] text-sm font-semibold hover:bg-[var(--interactive-hover)]">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]"><Play size={23} fill="currentColor" /></span>
        Load video only when ready
      </button>}
    {block.transcript && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Read transcript</summary><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted-foreground)]">{block.transcript}</p></details>}
  </section>;
}

function GraphBlock({ block }: { block: TutorialBlock }) {
  const raw = block.data?.points;
  const points = Array.isArray(raw) ? raw.filter((p): p is { x: number; y: number; label?: string } => !!p && typeof p === "object" && Number.isFinite((p as {x:number}).x) && Number.isFinite((p as {y:number}).y)) : [];
  if (points.length < 2) return <pre className="overflow-auto rounded-xl bg-[var(--surface-2)] p-3 text-xs">{JSON.stringify(block.data, null, 2)}</pre>;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const x = (v: number) => 24 + (v - minX) / (maxX - minX || 1) * 352;
  const y = (v: number) => 176 - (v - minY) / (maxY - minY || 1) * 152;
  return <svg viewBox="0 0 400 200" role="img" aria-label={block.title || "Teacher graph"} className="w-full rounded-xl bg-[var(--surface-2)] p-2"><path d="M24 12V176H380" stroke="currentColor" opacity=".5" fill="none" /><polyline points={points.map(p => `${x(p.x)},${y(p.y)}`).join(" ")} stroke="var(--primary)" strokeWidth="3" fill="none" />{points.map((p,i)=><circle key={i} cx={x(p.x)} cy={y(p.y)} r="4" fill="var(--primary)" />)}</svg>;
}

function TableBlock({ block }: { block: TutorialBlock }) {
  const headers = Array.isArray(block.data?.headers) ? block.data?.headers as unknown[] : [];
  const rows = Array.isArray(block.data?.rows) ? block.data?.rows as unknown[][] : [];
  if (!headers.length) return <pre className="overflow-auto rounded-xl bg-[var(--surface-2)] p-3 text-xs">{JSON.stringify(block.data, null, 2)}</pre>;
  return <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]"><table className="w-full border-collapse text-left text-sm"><thead className="bg-[var(--surface-2)]"><tr>{headers.map((h,i)=><th key={i} className="p-3 font-semibold">{String(h)}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i} className="border-t border-[var(--card-border)]">{headers.map((_,j)=><td key={j} className="p-3">{String(row?.[j] ?? "")}</td>)}</tr>)}</tbody></table></div>;
}

function Block({ block }: { block: TutorialBlock }) {
  if (block.type === "video") return <VideoBlock block={block} />;
  if (["image", "diagram", "sketch"].includes(block.type)) return <figure className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-3">
    {block.mediaUrl ? <img src={block.mediaUrl} alt={block.alt || block.title || "Teacher-provided visual"} loading="lazy" className="mx-auto max-h-[620px] w-full rounded-xl object-contain" /> : <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]"><ImageIcon size={18} />Visual unavailable while offline</div>}
    {block.caption && <figcaption className="pt-2 text-center text-sm text-[var(--muted-foreground)]">{block.caption}</figcaption>}
  </figure>;
  if (block.type === "audio") return <div className="rounded-2xl border border-[var(--card-border)] p-4"><p className="mb-2 text-sm font-semibold">{block.title || "Audio explanation"}</p>{block.mediaUrl ? <audio controls preload="none" className="w-full" src={block.mediaUrl} /> : <p className="text-sm text-[var(--muted-foreground)]">Audio unavailable offline.</p>}</div>;
  if (block.type === "graph") return <section className="rounded-2xl border border-[var(--card-border)] p-4"><h3 className="mb-3 font-semibold">{block.title || "Graph"}</h3><GraphBlock block={block} />{block.caption && <p className="mt-2 text-sm text-[var(--muted-foreground)]">{block.caption}</p>}</section>;
  if (block.type === "table") return <section className="rounded-2xl border border-[var(--card-border)] p-4"><h3 className="mb-3 font-semibold">{block.title || "Data table"}</h3><TableBlock block={block} /></section>;
  return <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><h3 className="mb-2 font-semibold">{block.title || "Teacher explanation"}</h3><div className="whitespace-pre-wrap text-sm leading-7 text-[var(--muted-foreground)]">{block.content}</div></section>;
}

export default function TeacherTutorials({ subject }: { subject: string }) {
  const [items, setItems] = useState<TutorialSummary[]>([]);
  const [selected, setSelected] = useState<Tutorial | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);
  const title = useMemo(() => `Teacher tutorials for ${subject}`, [subject]);

  useEffect(() => {
    let active = true;
    setSelected(null); setError("");
    fetch(`/api/learn/tutorials?subject=${encodeURIComponent(subject)}`, { cache: "no-store" })
      .then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.error || "Tutorials unavailable."); return body; })
      .then(body => { if (active) setItems(Array.isArray(body.tutorials) ? body.tutorials : []); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Tutorials unavailable."); });
    return () => { active = false; };
  }, [subject]);

  async function openTutorial(id: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/learn/tutorials/${encodeURIComponent(id)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Tutorial could not be opened.");
      setSelected(body.tutorial as Tutorial);
    } catch (e) { setError(e instanceof Error ? e.message : "Tutorial could not be opened."); }
    finally { setBusy(false); }
  }

  if (!items.length && !error) return null;
  return <section className="mt-8 rounded-3xl border border-[var(--card-border)] bg-[var(--surface-raised)] p-4 sm:p-6" aria-label={title}>
    <button type="button" onClick={() => setExpanded(v => !v)} className="flex w-full items-center justify-between gap-3 text-left">
      <span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><BookOpen size={19}/></span><span><strong className="block text-base">Teacher tutorials</strong><span className="text-xs text-[var(--muted-foreground)]">{subject} · reviewed classroom resources</span></span></span>
      {expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
    </button>
    {expanded && <div className="mt-4 space-y-3">
      {error && <p role="status" className="text-sm text-amber-600">{error}</p>}
      {items.map(item=><button key={item.id} type="button" onClick={() => void openTutorial(item.id)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4 text-left hover:border-[var(--primary)]"><span className="min-w-0"><strong className="block truncate text-sm">{item.title}</strong><span className="mt-1 block text-xs text-[var(--muted-foreground)]">{item.topic || item.subject}{item.summary ? ` · ${item.summary}` : ""}</span></span><ExternalLink size={16} className="shrink-0 text-[var(--muted-foreground)]"/></button>)}
      {busy && <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Loader2 size={15} className="animate-spin"/>Opening tutorial…</p>}
      {selected && <article className="mt-4 space-y-4 border-t border-[var(--card-border)] pt-5"><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">{selected.subject}{selected.topic ? ` · ${selected.topic}` : ""}</p><h2 className="mt-1 text-xl font-bold">{selected.title}</h2>{selected.summary && <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{selected.summary}</p>}</div>{selected.blocks.map(block=><Block key={block.id} block={block}/>)}</article>}
    </div>}
  </section>;
}
