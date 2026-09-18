"use client";

import { useRef, useState } from "react";
import { Check, FileText, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Question = {
  questionNumber: string;
  sourcePageStart: number;
  sourcePageEnd: number;
  questionText: string;
  marks: number | null;
  extractionConfidence: number;
  extractionMethod: string;
};

export default function PaperStudyLauncher() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pageStart, setPageStart] = useState("1");
  const [pageEnd, setPageEnd] = useState("8");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [inspected, setInspected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetSelection() {
    setQuestions([]);
    setSelectedQuestions([]);
    setInspected(false);
    setError(null);
  }

  async function inspectPaper() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("pageStart", pageStart);
      form.set("pageEnd", pageEnd);
      form.set("inspect", "1");
      const response = await fetch("/api/learn/paper", { method: "POST", body: form, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Couldn't inspect the paper.");
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
      setSelectedQuestions([]);
      setInspected(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't inspect the paper.");
    } finally {
      setBusy(false);
    }
  }

  async function processPaper() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("pageStart", pageStart);
      form.set("pageEnd", pageEnd);
      if (selectedQuestions.length) form.set("questionNumbers", JSON.stringify(selectedQuestions));
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

  function toggleQuestion(number: string) {
    setSelectedQuestions(current => current.includes(number) ? current.filter(item => item !== number) : [...current, number]);
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
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Choose pages first, then choose the exact questions Cortex should teach.</p>
        </div>
        <button type="button" onClick={() => { setOpen(false); setFile(null); resetSelection(); }} className="rounded-lg p-2 hover:bg-[var(--surface)]" aria-label="Close"><X className="h-4 w-4" /></button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--surface)] px-4 text-left hover:border-[var(--primary)]">
          <Upload className="h-5 w-5 shrink-0 text-[var(--primary)]" />
          <span className="min-w-0 truncate text-sm font-semibold">{file ? file.name : "Choose PDF question paper"}</span>
        </button>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); resetSelection(); }} />
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-xs font-semibold">From <input inputMode="numeric" min="1" type="number" value={pageStart} onChange={(e) => { setPageStart(e.target.value); resetSelection(); }} className="w-12 bg-transparent text-center outline-none" /></label>
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 text-xs font-semibold">To <input inputMode="numeric" min="1" type="number" value={pageEnd} onChange={(e) => { setPageEnd(e.target.value); resetSelection(); }} className="w-12 bg-transparent text-center outline-none" /></label>
      </div>

      {!inspected ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--muted-foreground)]">Default: first 8 pages. We inspect numbering before generating anything so question provenance stays explicit.</p>
          <button type="button" onClick={() => void inspectPaper()} disabled={!file || busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] disabled:opacity-50">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading paper…</> : "Read paper"}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{questions.length ? `${questions.length} question${questions.length === 1 ? "" : "s"} found` : "No reliable top-level questions found"}</p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--muted-foreground)]">{questions.length ? "Select specific questions, or leave everything unselected to teach the full page range." : "You can still study these pages. Cortex will explicitly treat question numbering as uncertain."}</p>
              </div>
              {questions.length > 0 && <button type="button" onClick={() => setSelectedQuestions(selectedQuestions.length === questions.length ? [] : questions.map(q => q.questionNumber))} className="rounded-lg px-3 py-2 text-xs font-bold hover:bg-[var(--card)]">{selectedQuestions.length === questions.length ? "Clear selection" : "Select all"}</button>}
            </div>
            {questions.length > 0 && (
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {questions.map(question => {
                  const selected = selectedQuestions.includes(question.questionNumber);
                  const uncertain = question.extractionConfidence < 0.95;
                  return (
                    <label key={question.questionNumber} className="flex cursor-pointer gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
                      <input type="checkbox" checked={selected} onChange={() => toggleQuestion(question.questionNumber)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-bold">
                          Q{question.questionNumber}
                          <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">Pages {question.sourcePageStart}–{question.sourcePageEnd}{question.marks ? ` · ${question.marks} marks` : ""}</span>
                          {uncertain && <span className="rounded-full border border-[var(--card-border)] px-2 py-0.5 text-[9px] font-bold">Check extraction</span>}
                        </span>
                        <span className="mt-1 block line-clamp-3 text-xs leading-5 text-[var(--muted-foreground)]">{question.questionText}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-[var(--muted-foreground)]">{selectedQuestions.length ? `Teaching ${selectedQuestions.length} selected question${selectedQuestions.length === 1 ? "" : "s"} with page context.` : "Teaching the selected page range and all reliably extracted questions."}</p>
            <button type="button" onClick={() => void processPaper()} disabled={!file || busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] disabled:opacity-50">
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Building lesson…</> : <><Check className="h-4 w-4" /> Teach this selection</>}
            </button>
          </div>
        </>
      )}

      {error && <p role="alert" className="mt-3 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3 text-xs font-medium text-[var(--destructive,#ef4444)]">{error}</p>}
    </section>
  );
}
