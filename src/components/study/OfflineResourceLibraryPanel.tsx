"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, HardDrive, ShieldCheck, Trash2, Upload, WifiOff } from "lucide-react";
import { offlineResourceLibrary, type OfflineResourceMetadata } from "@/lib/shadenet/offline-library";

type Subject = { id: string; name: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function OfflineResourceLibraryPanel({ subjects }: { subjects: Subject[] }) {
  const [resources, setResources] = useState<OfflineResourceMetadata[]>([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(subjects[0]?.name ?? "");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({});
  const [opened, setOpened] = useState<{ metadata: OfflineResourceMetadata; url: string } | null>(null);

  const refresh = useCallback(async () => {
    const [items, estimate] = await Promise.all([
      offlineResourceLibrary.list(),
      offlineResourceLibrary.storageEstimate(),
    ]);
    setResources(items);
    setStorage(estimate);
  }, []);

  useEffect(() => {
    let active = true;
    void refresh().catch(() => { if (active) setMessage("Offline storage is unavailable in this browser."); });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    const url = opened?.url;
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [opened?.url]);

  async function importFiles(files: FileList | null) {
    if (!files?.length || busy) return;
    setBusy(true);
    setMessage("");
    try {
      for (const file of Array.from(files)) {
        await offlineResourceLibrary.importFile(file, {
          title: title.trim() || file.name,
          subject: subject || undefined,
          topic: topic.trim() || undefined,
          source: "Imported from this device",
          trust: "unverified",
        });
      }
      setTitle("");
      setTopic("");
      await offlineResourceLibrary.requestPersistentStorage();
      await refresh();
      setMessage(`${files.length} resource${files.length === 1 ? "" : "s"} saved on this device. They are available without internet.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this resource.");
    } finally {
      setBusy(false);
    }
  }

  async function importPack(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const count = await offlineResourceLibrary.importPack(file);
      await refresh();
      setMessage("Imported " + count + " resource" + (count === 1 ? "" : "s") + ". Pack contents are marked unverified until checked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import this resource pack.");
    } finally { setBusy(false); }
  }

  async function exportPack() {
    setBusy(true);
    setMessage("");
    try {
      const pack = await offlineResourceLibrary.exportPack();
      const url = URL.createObjectURL(pack);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "shadecode-resources.scpack";
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Resource pack exported. Keep a copy somewhere safe or share it with another device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not export this resource pack.");
    } finally { setBusy(false); }
  }

  async function openResource(item: OfflineResourceMetadata) {
    try {
      const stored = await offlineResourceLibrary.open(item.id);
      if (!stored) throw new Error("This resource is no longer stored on this device.");
      if (opened?.url) URL.revokeObjectURL(opened.url);
      const url = URL.createObjectURL(stored.blob);
      setOpened({ metadata: stored.metadata, url });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open this resource.");
    }
  }

  async function removeResource(item: OfflineResourceMetadata) {
    if (!window.confirm(`Remove "${item.title}" from this device?`)) return;
    await offlineResourceLibrary.remove(item.id);
    if (opened?.metadata.id === item.id) {
      URL.revokeObjectURL(opened.url);
      setOpened(null);
    }
    await refresh();
    setMessage("Resource removed from this device.");
  }

  return (
    <section className="mt-8 rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="offline-library-title">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]">
          <HardDrive size={22} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="offline-library-title" className="text-lg font-semibold">My offline resources</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">Keep your own PDFs and notes on this device. Once imported, opening them does not need an internet connection.</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium text-[var(--muted-foreground)]">
            Resource title
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="Use the file name if blank" className="min-h-10 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted-foreground)]">
            Subject
            <select value={subject} onChange={(event) => setSubject(event.target.value)} className="min-h-10 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]">
              <option value="">General resource</option>
              {subjects.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted-foreground)] sm:col-span-2">
            Topic (optional)
            <input value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={160} placeholder="e.g. Waves, Organic chemistry" className="min-h-10 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]">
            <Upload size={16} aria-hidden="true" />
            {busy ? "Working…" : "Import files"}
            <input type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" multiple disabled={busy} className="sr-only" onChange={(event) => { void importFiles(event.target.files); event.currentTarget.value = ""; }} />
          </label>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] px-4 text-sm font-semibold">
            <Upload size={16} aria-hidden="true" />
            Import resource pack
            <input type="file" accept=".scpack,application/vnd.shadecode.resource-pack" disabled={busy} className="sr-only" onChange={(event) => { void importPack(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          </label>
          <button type="button" onClick={() => void exportPack()} disabled={busy || resources.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] px-4 text-sm font-semibold disabled:opacity-50">
            <Download size={16} aria-hidden="true" /> Export all
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">PDFs up to 100 MB and text files up to 5 MB. Resource packs preserve curriculum details and checksums. Imported pack entries are marked unverified until checked by a trusted source.</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-2.5 py-1"><WifiOff size={14} /> Device storage</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-2.5 py-1"><ShieldCheck size={14} /> SHA-256 integrity check</span>
        {storage.usage != null && storage.quota != null && <span>{formatBytes(storage.usage)} used of {formatBytes(storage.quota)} browser storage</span>}
      </div>

      {message && <p className="mt-3 rounded-xl border border-[var(--card-border)] p-3 text-sm" role="status">{message}</p>}

      {resources.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-[var(--card-border)] p-5 text-center text-sm text-[var(--muted-foreground)]">No personal resources saved yet. Import a PDF or set of notes to start your offline library.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {resources.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--card-border)] p-3">
              <FileText className="size-5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.title}</p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{[item.subject, item.topic, formatBytes(item.byteLength), item.trust.replaceAll("-", " ")].filter(Boolean).join(" · ")}</p>
              </div>
              <button type="button" onClick={() => void openResource(item)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 text-xs font-medium"><Download size={14} /> Open</button>
              <button type="button" onClick={() => void removeResource(item)} aria-label={`Remove ${item.title}`} className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--card-border)] text-[var(--muted-foreground)]"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}

      {opened && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--card-border)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] p-3">
            <p className="truncate text-sm font-semibold">{opened.metadata.title}</p>
            <button type="button" onClick={() => { URL.revokeObjectURL(opened.url); setOpened(null); }} className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs">Close</button>
          </div>
          {opened.metadata.mimeType === "application/pdf" ? (
            <iframe title={opened.metadata.title} src={opened.url} className="h-[70vh] w-full bg-white" />
          ) : (
            <OfflineTextReader url={opened.url} />
          )}
        </div>
      )}
    </section>
  );
}

function OfflineTextReader({ url }: { url: string }) {
  const [text, setText] = useState("Loading…");
  useEffect(() => {
    let active = true;
    void fetch(url).then((response) => response.text()).then((value) => { if (active) setText(value); }).catch(() => { if (active) setText("Could not read this file."); });
    return () => { active = false; };
  }, [url]);
  return <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words p-4 text-sm leading-6">{text}</pre>;
}
