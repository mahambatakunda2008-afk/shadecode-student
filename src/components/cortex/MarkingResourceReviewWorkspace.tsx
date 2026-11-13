"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AlertTriangle, FileText, Loader2, Save, ScanSearch, ShieldCheck } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { prepareMarkingResourceImport } from "@/lib/cortex/verify/marking-resource-import";
import { saveImportedMarkingResource } from "@/lib/cortex/verify/marking-resource-import-store";
import { extractImportedMarkingResource, type MarkingResourceExtraction } from "@/lib/cortex/verify/marking-resource-extraction";
import { saveMarkingResourceReviewDraft } from "@/lib/cortex/verify/marking-resource-review-store";
import { extractImageLocally, isBrowserLocalOcrAvailable } from "@/lib/cortex/verify/web-local-extraction";
import type { LocalVerifyExtraction } from "@/lib/cortex/verify/local-extraction-contract";
import type { MarkingResourceKind } from "@/lib/cortex/verify/marking-resource";

const fieldClass = "mt-1 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)]";
const kinds: Array<{ value: MarkingResourceKind; label: string }> = [
  { value: "official_mark_scheme", label: "Official mark scheme" },
  { value: "examiner_report", label: "Examiner report" },
  { value: "teacher_authored_scheme", label: "Teacher-authored scheme" },
  { value: "teacher_notes", label: "Teacher notes" },
  { value: "question_bank", label: "Question bank" },
  { value: "other", label: "Other resource" },
];

export default function MarkingResourceReviewWorkspace() {
  const { user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<MarkingResourceKind>("official_mark_scheme");
  const [boardId, setBoardId] = useState("cambridge");
  const [qualificationId, setQualificationId] = useState("AS");
  const [level, setLevel] = useState("AS Level");
  const [subjectId, setSubjectId] = useState("9702");
  const [syllabusId, setSyllabusId] = useState("9702");
  const [syllabusVersion, setSyllabusVersion] = useState("2025-2027");
  const [examYear, setExamYear] = useState("");
  const [paperComponentId, setPaperComponentId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [attribution, setAttribution] = useState("");
  const [extraction, setExtraction] = useState<MarkingResourceExtraction | null>(null);
  const [correctedLines, setCorrectedLines] = useState<Array<{ page: number; line: number; text: string }>>([]);
  const [localOcr, setLocalOcr] = useState<LocalVerifyExtraction | null>(null);
  const [correctedRegions, setCorrectedRegions] = useState<LocalVerifyExtraction["regions"]>([]);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [resourceId, setResourceId] = useState("");

  useEffect(() => {
    if (!file) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isPdf = file?.name.toLowerCase().endsWith(".pdf");
  const isImage = !!file && /\.(jpe?g|png|webp)$/i.test(file.name);
  const lineCount = correctedLines.length;

  async function importAndExtract() {
    if (!user?.id || !file) return;
    setBusy(true); setMessage(""); setExtraction(null); setCorrectedLines([]); setLocalOcr(null); setCorrectedRegions([]);
    try {
      const resource = await prepareMarkingResourceImport(user.id, {
        file, kind, boardId, qualificationId, level, subjectId, syllabusId, syllabusVersion,
        ...(examYear.trim() ? { examYear: Number(examYear) } : {}),
        ...(paperComponentId.trim() ? { paperComponentId } : {}),
        ...(sourceUrl.trim() ? { sourceUrl } : {}),
        ...(attribution.trim() ? { attribution } : {}),
      });
      const saved = await saveImportedMarkingResource(user.id, resource);
      const result = await extractImportedMarkingResource(saved);
      setResourceId(saved.id);
      setExtraction(result);
      setCorrectedLines(result.lines.map(line => ({ ...line })));
      setMessage("Original source saved on this device and text extraction completed. The source remains unverified.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import this resource.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCorrections() {
    if (!user?.id || !extraction || !resourceId) return;
    setBusy(true); setMessage("");
    try {
      await saveMarkingResourceReviewDraft(user.id, { resourceId, extraction, correctedLines, ...(localOcr ? { localOcr: { ...localOcr, regions: correctedRegions, rawText: correctedRegions.map(region => region.text).join("\\n") } } : {}) });
      setMessage("Your review draft and corrected text were saved locally. This does not verify the source or approve a marking rubric.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save review corrections.");
    } finally {
      setBusy(false);
    }
  }

  function updateLine(index: number, text: string) {
    setCorrectedLines(current => current.map((line, itemIndex) => itemIndex === index ? { ...line, text } : line));
  }

  return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Cortex Verify · Resource intake</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Marking evidence review</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Import a resource, preserve its original file, inspect extracted text against the source, and save corrections. Nothing becomes a trusted answer key automatically.</p>
    </div>

    <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-2"><FileText size={18} /><h2 className="font-bold">1. Resource and syllabus identity</h2></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold">Resource file<input className={fieldClass} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.txt,application/pdf,image/jpeg,image/png,image/webp,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => { setFile(event.target.files?.[0] || null); setExtraction(null); setResourceId(""); }} /></label>
        <label className="text-xs font-semibold">Resource type<select className={fieldClass} value={kind} onChange={event => setKind(event.target.value as MarkingResourceKind)}>{kinds.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="text-xs font-semibold">Exam board<input className={fieldClass} value={boardId} onChange={event => setBoardId(event.target.value)} /></label>
        <label className="text-xs font-semibold">Qualification<input className={fieldClass} value={qualificationId} onChange={event => setQualificationId(event.target.value)} /></label>
        <label className="text-xs font-semibold">Level<input className={fieldClass} value={level} onChange={event => setLevel(event.target.value)} /></label>
        <label className="text-xs font-semibold">Subject code<input className={fieldClass} value={subjectId} onChange={event => setSubjectId(event.target.value)} /></label>
        <label className="text-xs font-semibold">Syllabus ID<input className={fieldClass} value={syllabusId} onChange={event => setSyllabusId(event.target.value)} /></label>
        <label className="text-xs font-semibold">Syllabus version<input className={fieldClass} value={syllabusVersion} onChange={event => setSyllabusVersion(event.target.value)} /></label>
        <label className="text-xs font-semibold">Exam year (optional)<input className={fieldClass} inputMode="numeric" value={examYear} onChange={event => setExamYear(event.target.value)} placeholder="2026" /></label>
        <label className="text-xs font-semibold">Paper/component (optional)<input className={fieldClass} value={paperComponentId} onChange={event => setPaperComponentId(event.target.value)} placeholder="e.g. 9702/42" /></label>
        <label className="text-xs font-semibold sm:col-span-2">Original source URL (optional)<input className={fieldClass} type="url" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} placeholder="https://" /></label>
        <label className="text-xs font-semibold sm:col-span-2">Attribution / permission notes (optional)<input className={fieldClass} value={attribution} onChange={event => setAttribution(event.target.value)} placeholder="Who supplied it, licence, or permission reference" /></label>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted-foreground)]">Maximum file size: 20 MB. Rights default to unknown.</p>
        <button type="button" onClick={() => void importAndExtract()} disabled={!user?.id || !file || busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <ScanSearch size={16} />} Import and extract</button>
      </div>
      {!user?.id && <p className="mt-3 text-xs text-amber-600">Sign in to store resources in your private local account space.</p>}
    </section>

    {message && <p role="status" className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-sm">{message}</p>}

    {extraction && file && <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="min-w-0 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-bold">2. Original source evidence</h2><span className="text-xs text-[var(--muted-foreground)]">{file.name}</span></div>
        {isPdf && <iframe title="Original PDF source" src={previewUrl} className="h-[70vh] min-h-[480px] w-full rounded-xl border border-[var(--card-border)] bg-white" />}
        {isImage && <div className="relative mx-auto w-full overflow-hidden rounded-xl border border-[var(--card-border)] bg-white" style={imageDimensions ? { aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}` } : undefined}><Image src={previewUrl} alt="Original uploaded marking resource" width={imageDimensions?.width || 1200} height={imageDimensions?.height || 900} unoptimized onLoad={event => setImageDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} className="block h-auto max-h-[70vh] w-full object-contain" />{localOcr && correctedRegions.map((region, index) => <div key={region.id} className="pointer-events-none absolute border-2 border-cyan-500/90 bg-cyan-400/10" style={{ left: `${region.bounds.x * 100}%`, top: `${region.bounds.y * 100}%`, width: `${region.bounds.width * 100}%`, height: `${region.bounds.height * 100}%` }}><span className="absolute -top-5 left-0 rounded bg-cyan-700 px-1 text-[9px] text-white">{index + 1}</span></div>)}</div>}
        {!isPdf && !isImage && <div className="rounded-xl bg-[var(--muted)] p-5 text-sm text-[var(--muted-foreground)]">Original file is preserved in local resource storage. Browser preview is not available for this file type.</div>}
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5"><AlertTriangle size={15} className="mr-2 inline" />The uploaded source and your syllabus selection have not been independently authenticated. Visual interpretation still requires human review.</div>
      </section>

      <section className="min-w-0 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">3. Extracted text and corrections</h2><span className="text-xs text-[var(--muted-foreground)]">{lineCount} lines · {extraction.textCharacterCount.toLocaleString()} characters</span></div>
        <div className="mb-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[var(--muted)] px-2.5 py-1">{extraction.format.toUpperCase()}</span><span className="rounded-full bg-[var(--muted)] px-2.5 py-1">{extraction.status.replace("_", " ")}</span><span className="rounded-full bg-[var(--muted)] px-2.5 py-1">{extraction.pageCount ?? "?"} pages</span></div>
        {extraction.warnings.map((warning, index) => <p key={index} className="mb-2 rounded-lg bg-amber-500/10 p-2.5 text-xs leading-5 text-amber-700 dark:text-amber-300">{warning}</p>)}
        {extraction.markers.length > 0 && <div className="mb-4 rounded-xl bg-[var(--muted)] p-3"><p className="mb-2 text-xs font-bold">Detected navigation hints, not approved marking criteria</p><div className="flex flex-wrap gap-1.5">{extraction.markers.slice(0, 30).map((marker, index) => <span key={index} className="rounded-md border border-[var(--card-border)] bg-[var(--card)] px-2 py-1 text-[10px]">{marker.type} · p.{marker.page}</span>)}</div></div>}
        {localOcr && <div className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3"><p className="mb-1 text-xs font-bold">On-device OCR · {localOcr.engine}</p><p className="mb-3 text-xs text-[var(--muted-foreground)]">No image upload was performed by this OCR step. Bounding boxes are shown on the original image. OCR confidence is {localOcr.confidence === null ? "not supplied by this browser" : `${Math.round(localOcr.confidence * 100)}%`}.</p>{correctedRegions.map((region, index) => <label key={region.id} className="mb-3 block text-xs font-semibold"><span className="mb-1 block text-[var(--muted-foreground)]">Region {index + 1} · {Math.round(region.bounds.x * 100)}%, {Math.round(region.bounds.y * 100)}%</span><textarea className={fieldClass + " min-h-14 resize-y"} value={region.text} onChange={event => updateRegion(index, event.target.value)} /></label>)}{localOcr.warnings.map((warning, index) => <p key={index} className="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-300">{warning}</p>)}</div>}{correctedLines.length ? <div className="max-h-[56vh] space-y-3 overflow-y-auto pr-1">{correctedLines.map((line, index) => <label key={index} className="block text-xs font-semibold"><span className="mb-1 block text-[var(--muted-foreground)]">Page {line.page} · line {line.line}</span><textarea className={fieldClass + " min-h-16 resize-y leading-5"} value={line.text} onChange={event => updateLine(index, event.target.value)} /></label>)}</div> : <p className="rounded-xl bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)]">No text lines were extracted. Use the original page and OCR/visual review workflow.</p>}
        <button type="button" onClick={() => void saveCorrections()} disabled={busy} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-bold disabled:opacity-50"><Save size={16} /> Save review draft locally</button>
      </section>
    </div>}

    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--muted)] p-4 text-xs leading-5 text-[var(--muted-foreground)]"><ShieldCheck size={17} className="mt-0.5 shrink-0" /><p>Local intake and text correction only. This workspace does not grant copyright permission, authenticate exam-board documents, approve a rubric, or enable offline marking. A verified reviewer and rights decision are still required.</p></div>
  </main>;
}
