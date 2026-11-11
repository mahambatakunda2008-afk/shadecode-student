"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { MAX_BLOCKS, parseVideoUrl, type TutorialBlock, type TutorialStatus } from "@/lib/teacher/tutorial";

export interface EditorTutorial { id: string; title: string; subject: string | null; topic: string | null; blocks: TutorialBlock[]; status: TutorialStatus }
export interface Feedback { verdict: string; note: string | null }

type EditorBlock =
  | { key: string; type: "text"; title: string; content: string }
  | { key: string; type: "image"; url: string; alt: string }
  | { key: string; type: "video"; sourceUrl: string; title: string };

const STATUS_LABEL: Record<TutorialStatus, string> = { draft: "Draft", in_review: "In review", verified: "Verified" };
const VERDICT_LABEL: Record<string, string> = { correct: "Correct", wrong_answer: "Factual error", ambiguous: "Unclear", out_of_syllabus: "Out of syllabus" };
const uid = () => Math.random().toString(36).slice(2);

function toEditor(blocks: TutorialBlock[]): EditorBlock[] {
  return blocks.map((b): EditorBlock =>
    b.type === "text" ? { key: uid(), type: "text", title: b.title ?? "", content: b.content }
    : b.type === "image" ? { key: uid(), type: "image", url: b.url, alt: b.alt }
    : { key: uid(), type: "video", sourceUrl: b.sourceUrl, title: b.title });
}

function toPayload(blocks: EditorBlock[]) {
  return blocks.map(({ key: _key, ...rest }) => rest);
}

/** Shrinks phone photos before upload: saves the teacher's data and keeps students' pages light. */
async function shrinkImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (blob && blob.size < file.size) return new File([blob], "image.webp", { type: "image/webp" });
  } catch {
    // Fall back to the original file.
  }
  return file;
}

export function EditorClient({ tutorial, feedback }: { tutorial: EditorTutorial; feedback: Feedback[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(tutorial.title);
  const [subject, setSubject] = useState(tutorial.subject ?? "");
  const [topic, setTopic] = useState(tutorial.topic ?? "");
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => toEditor(tutorial.blocks));
  const [status, setStatus] = useState(tutorial.status);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const edit = (fn: (b: EditorBlock[]) => EditorBlock[]) => { setBlocks(fn); setDirty(true); setMessage(null); };
  const update = (key: string, patch: Partial<EditorBlock>) => edit((bs) => bs.map((b) => (b.key === key ? ({ ...b, ...patch } as EditorBlock) : b)));
  const move = (i: number, d: -1 | 1) => edit((bs) => { const j = i + d; if (j < 0 || j >= bs.length) return bs; const c = [...bs]; [c[i], c[j]] = [c[j], c[i]]; return c; });
  const add = (b: EditorBlock) => edit((bs) => (bs.length >= MAX_BLOCKS ? bs : [...bs, b]));

  async function save(): Promise<boolean> {
    setBusy("save");
    try {
      const res = await fetch(`/api/teacher/tutorials/${tutorial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subject, topic, blocks: toPayload(blocks) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Could not save.");
      setDirty(false);
      setMessage({ kind: "ok", text: "Saved." });
      return true;
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Could not save." });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(action: "submit" | "withdraw") {
    if (dirty && !(await save())) return;
    setBusy(action);
    try {
      const res = await fetch(`/api/teacher/tutorials/${tutorial.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Could not update.");
      setStatus(json.status);
      setMessage({ kind: "ok", text: action === "submit" ? "Submitted. Other teachers can now review it." : "Moved back to draft." });
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Could not update." });
    } finally {
      setBusy(null);
    }
  }

  async function upload(file: File) {
    setBusy("upload");
    setMessage(null);
    try {
      const small = await shrinkImage(file);
      const form = new FormData();
      form.append("file", small);
      const res = await fetch("/api/teacher/media", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json?.error ?? "Upload failed.");
      add({ key: uid(), type: "image", url: json.url, alt: "" });
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Upload failed." });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove() {
    if (!window.confirm("Delete this draft tutorial? This cannot be undone.")) return;
    const res = await fetch(`/api/teacher/tutorials/${tutorial.id}`, { method: "DELETE" });
    if (res.ok) router.replace("/teacher/tutorials");
    else setMessage({ kind: "error", text: "Only drafts can be deleted." });
  }

  const input = "w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]";
  const btn = "min-h-11 rounded-2xl border border-[var(--card-border)] px-3 text-sm transition hover:bg-[var(--surface-2)] disabled:opacity-50";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <Link href="/teacher/tutorials" className="hover:text-[var(--foreground)]">← Tutorials</Link>
        <span>{STATUS_LABEL[status]}{dirty ? " · unsaved changes" : ""}</span>
      </div>

      {feedback.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm">
          <h2 className="font-medium">Reviewer feedback</h2>
          <ul className="space-y-1">
            {feedback.map((f, i) => (
              <li key={i} className="text-[var(--muted-foreground)]"><span className="text-[var(--foreground)]">{VERDICT_LABEL[f.verdict] ?? f.verdict}</span>{f.note ? ` — ${f.note}` : ""}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
        <input className={input} value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} maxLength={160} placeholder="Title" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={input} value={subject} onChange={(e) => { setSubject(e.target.value); setDirty(true); }} maxLength={80} placeholder="Subject" />
          <input className={input} value={topic} onChange={(e) => { setTopic(e.target.value); setDirty(true); }} maxLength={120} placeholder="Topic" />
        </div>
      </section>

      <ol className="space-y-3">
        {blocks.map((b, i) => (
          <li key={b.key} className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>{b.type === "text" ? "Text" : b.type === "image" ? "Image" : "Video"}</span>
              <span className="flex gap-3">
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="disabled:opacity-30">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Move down" className="disabled:opacity-30">↓</button>
                <button onClick={() => edit((bs) => bs.filter((x) => x.key !== b.key))} className="text-[var(--danger)]">Remove</button>
              </span>
            </div>

            {b.type === "text" && (
              <>
                <input className={input} value={b.title} onChange={(e) => update(b.key, { title: e.target.value })} maxLength={120} placeholder="Heading (optional)" />
                <textarea className={input} rows={5} value={b.content} onChange={(e) => update(b.key, { content: e.target.value })} maxLength={5000} placeholder="Write your explanation…" />
              </>
            )}

            {b.type === "image" && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.url} alt={b.alt || "Tutorial image"} className="max-h-72 w-full rounded-xl border border-[var(--card-border)] object-contain" />
                <input className={input} value={b.alt} onChange={(e) => update(b.key, { alt: e.target.value })} maxLength={300} placeholder="Describe the image (helps students who cannot see it)" />
              </>
            )}

            {b.type === "video" && (
              <>
                <input className={input} value={b.sourceUrl} onChange={(e) => update(b.key, { sourceUrl: e.target.value })} placeholder="Paste a YouTube or Google Drive video link" />
                <input className={input} value={b.title} onChange={(e) => update(b.key, { title: e.target.value })} maxLength={160} placeholder="Video title (optional)" />
                {b.sourceUrl && !parseVideoUrl(b.sourceUrl) && <p className="text-xs text-[var(--danger)]">Use a YouTube or Google Drive link that starts with https://.</p>}
                {parseVideoUrl(b.sourceUrl) && (
                  <div className="aspect-video overflow-hidden rounded-xl border border-[var(--card-border)]">
                    <iframe src={parseVideoUrl(b.sourceUrl)!.embedUrl} title={b.title || "Tutorial video"} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="h-full w-full" />
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-3 gap-2">
        <button className={btn} onClick={() => add({ key: uid(), type: "text", title: "", content: "" })} disabled={blocks.length >= MAX_BLOCKS}>+ Text</button>
        <button className={btn} onClick={() => fileRef.current?.click()} disabled={busy === "upload" || blocks.length >= MAX_BLOCKS}>{busy === "upload" ? "Uploading…" : "+ Image"}</button>
        <button className={btn} onClick={() => add({ key: uid(), type: "video", sourceUrl: "", title: "" })} disabled={blocks.length >= MAX_BLOCKS}>+ Video</button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">Tip: photograph a whiteboard sketch or diagram with your phone and add it as an image. Large photos are shrunk automatically.</p>

      {message && <p role={message.kind === "error" ? "alert" : "status"} className={`text-sm ${message.kind === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{message.text}</p>}

      <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t border-[var(--card-border)] bg-[var(--surface)] px-4 py-3">
        <button className={btn} onClick={save} disabled={!dirty || busy !== null}>{busy === "save" ? "Saving…" : "Save"}</button>
        {status === "draft" ? (
          <button onClick={() => changeStatus("submit")} disabled={busy !== null} className="min-h-11 rounded-2xl px-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--brand-gradient)" }}>Submit for review</button>
        ) : status === "in_review" ? (
          <button className={btn} onClick={() => changeStatus("withdraw")} disabled={busy !== null}>Withdraw</button>
        ) : (
          <span className="flex min-h-11 items-center justify-center text-sm text-[var(--success)]">Verified</span>
        )}
      </div>
      {status === "draft" && <button onClick={remove} className="w-full text-center text-xs text-[var(--danger)]">Delete this draft</button>}
    </div>
  );
}
