"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PaperStudyLauncher() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pageStart, setPageStart] = useState("1");
  const [pageEnd, setPageEnd] = useState("8");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function processPaper() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("pageStart", pageStart);
      form.set("pageEnd", pageEnd);
      const response = await fetch("/api/learn/paper", { method: "POST", body: form, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.id) throw new Error(data.error || "Couldn't process the paper.");
      router.push(`/learn/paper/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't process the paper.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 text-sm font-bold transition hover:border-[var(--primary)]">
        <FileText className="h-4 w-4 text-[var(--primary)]" /> Study from a paper
      </button>
    );
  }

  return (
    <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm sm:p-6" aria-label="Study from a paper">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4 text-[var(--primary)]" /> Study from a paper</div>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Upload a question paper and choose exactly what you want Cortex to teach.</p>
        </div>
        <button type="button" onClick={() => { setOpen(false); setFile(null); setError(null); }} className="rounded-lg p-2 hover:bg-[var(--surface)]" aria-label="Close"><X className="h-4 w-4" /></button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--surface)] px-4 text-left hover:border-[var(--primary)]">
          <Upload className="h-5 w-5 shrink-0 text-[var(--primary)]" />
          <span className="min-w-0 truncate text-sm font-semibold">{file ? file.name : "Choose PDF question paper"}</span>
        </button>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-xs font-semibold">From <input inputMode="numeric" min="1" type="number" value={pageStart} onChange={(e) => setPageStart(e.target.value)} className="w-12 bg-transparent text-center outline-none" /></label>
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-xs font-semibold">To <input inputMode="numeric" min="1" type="number" value={pageEnd} onChange={(e) => setPageEnd(e.target.value)} className="w-12 bg-transparent text-center outline-none" /></label>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-[var(--muted-foreground)]">Default: first 8 pages. Text extraction is grounded in your uploaded source.</p>
        <button type="button" onClick={() => void processPaper()} disabled={!file || busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] disabled:opacity-50">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Building lesson…</> : "Teach me these pages"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3 text-xs font-medium text-[var(--destructive,#ef4444)]">{error}</p>}
    </section>
  );
}
