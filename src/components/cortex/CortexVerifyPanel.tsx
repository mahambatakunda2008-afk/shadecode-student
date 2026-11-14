"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Camera, CheckCircle2, ImagePlus, Lightbulb, Loader2, RotateCcw, ShieldCheck, Sparkles, WifiOff, XCircle } from "lucide-react";
import { useCortexVerify, type VerifyMode, type VerifyResult } from "@/hooks/useCortexVerify";
import { createClient } from "@/lib/supabase/client";
import { getAll } from "@/lib/offline/cortex-queue";
import { trackEvent } from "@/lib/traction/client";
import { deleteVerifyArtifact, listVerifyArtifacts, saveVerifyArtifact, type VerifyArtifact } from "@/lib/cortex/verify/artifact-store";
import { extractImageLocally, isBrowserLocalOcrAvailable } from "@/lib/cortex/verify/web-local-extraction";
import { listImportedMarkingResources } from "@/lib/cortex/verify/marking-resource-import-store";
import { getMarkingResourceReviewDraft } from "@/lib/cortex/verify/marking-resource-review-store";
import type { ImportedMarkingResource } from "@/lib/cortex/verify/marking-resource-import";

function StatusIcon({ status }: { status: string }) {
  const value = status.toLowerCase();
  if (value === "correct") return <CheckCircle2 size={18} aria-hidden />;
  if (value === "partial") return <AlertTriangle size={18} aria-hidden />;
  return <XCircle size={18} aria-hidden />;
}

function ResultCard({ result, mode, onRetry, onHelp }: { result: VerifyResult; mode: VerifyMode; onRetry: () => void; onHelp: () => void }) {
  if (result.needsRetake) return <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 text-amber-500" /><div><h3 className="font-bold">I need a clearer look</h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">{result.retakeReason || "The image was not clear enough to verify fairly."}</p></div></div><button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white"><RotateCcw size={16} /> Retake photo</button></div>;
  const isHelp = mode === "help";
  const correct = !isHelp && result.correct === true;
  const partial = !isHelp && !correct && typeof result.score === "number" && result.score > 0;
  const label = isHelp ? "Guidance ready" : correct ? "Correct" : partial ? "Almost there" : "Needs another look";
  const confidence = typeof result.confidence === "number" ? Math.round(Math.max(0, Math.min(1, result.confidence)) * 100) : null;
  return <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm"><div className="border-b border-[var(--card-border)] bg-gradient-to-br from-[var(--primary-glow)] via-[var(--accent-soft)] to-[var(--primary-glow)] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="rounded-2xl bg-gradient-to-br from-[var(--primary-glow)] to-[var(--accent-soft)] p-2.5">{isHelp ? <Lightbulb size={18} aria-hidden /> : <StatusIcon status={correct ? "correct" : partial ? "partial" : "incorrect"} />}</div><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{isHelp ? "Cortex guidance" : "Cortex verdict"}</p>{result.execution === "browser-local" && <span className="rounded-full border border-[var(--primary)]/30 bg-[var(--primary-glow)] px-2 py-1 text-[10px] font-bold text-[var(--primary)]">On-device · AI-assisted</span>}{result.execution === "browser-local-deterministic" && <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600">On-device · Answer-key check</span>}</div><h3 className="mt-1 text-2xl font-black tracking-tight">{label}</h3></div></div><div className="flex gap-2">{!isHelp && typeof result.score === "number" && <div className="text-right"><div className="text-3xl font-black">{Math.round(result.score)}%</div><p className="text-xs text-[var(--muted-foreground)]">{result.execution === "browser-local-deterministic" ? "answer-key match" : "estimated score"}</p></div>}{confidence !== null && result.execution !== "browser-local" && <div className="border-l border-[var(--card-border)] pl-3 text-right"><div className="text-3xl font-black">{confidence}%</div><p className="text-xs text-[var(--muted-foreground)]">confidence</p></div>}</div></div>{result.cortexInsight && <p className="mt-5 rounded-2xl bg-[var(--muted)] p-4 text-sm leading-6">{result.cortexInsight}</p>}</div>{result.steps?.length ? <div className="p-5 sm:p-6"><h4 className="font-bold">Step-by-step check</h4><div className="mt-4 space-y-3">{result.steps.map((step, index) => <div key={`${index}-${step.description}`} className="flex gap-3 rounded-2xl border border-[var(--card-border)] p-3.5"><div className="mt-0.5"><StatusIcon status={step.status} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">Step {index + 1}</p><span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-bold uppercase">{step.status}</span></div><p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{step.description}</p>{step.note && <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{step.note}</p>}</div></div>)}</div></div> : null}{!isHelp && result.marksBreakdown?.length ? <div className="border-t border-[var(--card-border)] p-5 sm:p-6"><h4 className="font-bold">Marking breakdown</h4><div className="mt-4 space-y-2">{result.marksBreakdown.map((mark, index) => <div key={`${index}-${mark.criterion}`} className="flex items-start justify-between gap-3 rounded-2xl bg-[var(--muted)] p-3"><div><p className="text-sm font-semibold">{mark.criterion}</p>{mark.note && <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{mark.note}</p>}</div><span className="shrink-0 rounded-full bg-[var(--card)] px-2 py-1 text-xs font-black">-{mark.marksLost}</span></div>)}</div></div> : null}{!isHelp && result.feedback && <div className="border-t border-[var(--card-border)] p-5 sm:p-6"><h4 className="font-bold">What to improve</h4><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{result.feedback}</p></div>}{(result.hint || result.method || result.solution || result.content) && <div className="border-t border-[var(--card-border)] p-5 sm:p-6"><div className="flex items-center gap-2 font-bold"><Lightbulb size={18} /> Cortex guidance</div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--muted-foreground)]">{result.hint || result.method || result.solution || result.content}</p>{result.finalAnswer && <div className="mt-4 rounded-2xl bg-[var(--muted)] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Final answer</p><p className="mt-1 text-sm font-bold">{result.finalAnswer}</p></div>}</div>}<div className="flex flex-wrap gap-2 border-t border-[var(--card-border)] p-5 sm:p-6"><button onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-bold"><RotateCcw size={16} /> Try again</button><button onClick={onHelp} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white">{isHelp ? "Ask another question" : "Get help"} <ArrowRight size={16} /></button></div></div>;
}

export default function CortexVerifyPanel() {
  const [mode, setMode] = useState<"check" | "help">("check");
  const [helpLevel, setHelpLevel] = useState<"hint" | "method" | "solution">("hint");
  const [subject, setSubject] = useState("Mathematics");
  const [question, setQuestion] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [image, setImage] = useState<File>();
  const [cloudConsent, setCloudConsent] = useState(false);
  const [rawExtractedText, setRawExtractedText] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [extractionNote, setExtractionNote] = useState("");
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [artifactSaved, setArtifactSaved] = useState(false);
  const [artifactOwner, setArtifactOwner] = useState<string | null>(null);
  const [savedArtifacts, setSavedArtifacts] = useState<VerifyArtifact[]>([]);
  const pendingArtifactId = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [localOcrSupported, setLocalOcrSupported] = useState(false);
  const [localExtracting, setLocalExtracting] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [reviewResources, setReviewResources] = useState<ImportedMarkingResource[]>([]);
  const [selectedReviewResourceId, setSelectedReviewResourceId] = useState("");
  const [visualEvidenceOptions, setVisualEvidenceOptions] = useState<Array<{ id: string; file: File; label: string; annotation?: string; previewUrl: string }>>([]);
  const [selectedVisualEvidence, setSelectedVisualEvidence] = useState<Array<{ file: File; label: string; annotation?: string }>>([]);
  const [visualEvidenceLoading, setVisualEvidenceLoading] = useState(false);
  const [visualEvidenceError, setVisualEvidenceError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { result, loading, error, extracting, extractImage, check, help, clearResult } = useCortexVerify();
  useEffect(() => { setLocalOcrSupported(isBrowserLocalOcrAvailable()); }, []);
  useEffect(() => {
    if (!userId) { setReviewResources([]); setSelectedReviewResourceId(""); setSelectedVisualEvidence([]); return; }
    let cancelled = false;
    void listImportedMarkingResources(userId).then(items => { if (!cancelled) setReviewResources(items); }).catch(() => { if (!cancelled) setReviewResources([]); });
    return () => { cancelled = true; };
  }, [userId]);
  useEffect(() => {
    if (!userId || !selectedReviewResourceId) {
      setVisualEvidenceOptions([]);
      setSelectedVisualEvidence([]);
      return;
    }
    let cancelled = false;
    const objectUrls: string[] = [];
    setVisualEvidenceLoading(true);
    setVisualEvidenceError(null);
    setSelectedVisualEvidence([]);
    void getMarkingResourceReviewDraft(userId, selectedReviewResourceId).then(draft => {
      if (cancelled) return;
      const regions = draft?.manualVisualRegions || [];
      const options = regions.filter(region => region.crop instanceof Blob && region.crop.size > 0).map((region, index) => {
        const mime = region.crop!.type || "image/webp";
        const extension = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
        const linkedOcrText = (draft?.localOcr?.regions || []).filter(ocrRegion => region.linkedOcrRegionIds?.includes(ocrRegion.id)).map(ocrRegion => ocrRegion.text).filter(Boolean).join(" | ");
        const notes = [region.annotation || "", linkedOcrText ? `Linked OCR labels: ${linkedOcrText}` : ""].filter(Boolean).join("\\n");
        const file = new File([region.crop!], `visual-region-${index + 1}.${extension}`, { type: mime });
        const previewUrl = URL.createObjectURL(region.crop!);
        objectUrls.push(previewUrl);
        return { id: region.id, file, label: region.label || "Visual region", annotation: notes, previewUrl };
      });
      setVisualEvidenceOptions(options);
      if (!options.length) setVisualEvidenceError("No saved visual crops found. Select and save regions in Resource review first.");
    }).catch(err => { if (!cancelled) setVisualEvidenceError(err instanceof Error ? err.message : "Could not load saved visual regions."); })
      .finally(() => { if (!cancelled) setVisualEvidenceLoading(false); });
    return () => {
      cancelled = true;
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [userId, selectedReviewResourceId]);

  useEffect(() => { const update = () => setOnline(navigator.onLine); const refresh = async () => { try { const { data } = await createClient().auth.getUser(); const id = data.user?.id || null; setUserId(id); if (id) setQueueCount((await getAll(id)).length); } catch {} }; update(); void refresh(); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  useEffect(() => {
    if (!userId) { setSavedArtifacts([]); return; }
    let cancelled = false;
    void listVerifyArtifacts(userId).then((items) => { if (!cancelled) setSavedArtifacts(items); }).catch(() => { if (!cancelled) setSavedArtifacts([]); });
    return () => { cancelled = true; };
  }, [userId]);
  useEffect(() => {
    if (!image || !userId || pendingArtifactId.current) return;
    const id = pendingArtifactId.current || crypto.randomUUID();
    pendingArtifactId.current = id;
    setArtifactId(id);
    let cancelled = false;
    void saveVerifyArtifact(userId, { title: image.name, sourceImage: image, mimeType: image.type, sourceName: image.name }, id)
      .then(async () => { if (!cancelled) { setArtifactSaved(true); setArtifactOwner(userId); setSavedArtifacts(await listVerifyArtifacts(userId)); } })
      .catch((err) => { if (!cancelled) setFileError(err instanceof Error ? err.message : "Could not save this capture locally."); });
    return () => { cancelled = true; };
  }, [image, userId]);
  const onFile = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFileError("Choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setFileError("That image is larger than 4 MB. Choose a smaller image.");
      return;
    }
    setFileError(null);
    setCloudConsent(false);
    setArtifactId(null);
    pendingArtifactId.current = null;
    setArtifactSaved(false);
    setRawExtractedText("");
    setExtractedText("");
    setExtractionNote("");
    setImage(file);
    const reader = new FileReader();
    reader.onerror = () => setFileError("This image could not be opened. Try another image.");
    reader.onload = (e) => setPreview(String(e.target?.result || ""));
    reader.readAsDataURL(file);
  };
  const clearImage = () => { setImage(undefined); setPreview(null); setFileError(null); setCloudConsent(false); setArtifactId(null); pendingArtifactId.current = null; setArtifactSaved(false); if (fileRef.current) fileRef.current.value = ""; };
  const reset = () => { setQuestion(""); setStudentAnswer(""); setRawExtractedText(""); setExtractedText(""); setExtractionNote(""); clearImage(); };
  useEffect(() => {
    if (!userId || !artifactOwner || artifactOwner === userId) return;
    setImage(undefined);
    setPreview(null);
    setArtifactId(null);
    pendingArtifactId.current = null;
    setArtifactSaved(false);
    setArtifactOwner(null);
    setRawExtractedText("");
    setExtractedText("");
    setExtractionNote("");
    setCloudConsent(false);
  }, [userId, artifactOwner]);
  const persistCurrentArtifact = async (updates: Parameters<typeof saveVerifyArtifact>[1] = {}) => {
    if (!userId || !image || !artifactId) return;
    try {
      await saveVerifyArtifact(userId, {
        title: image.name,
        sourceImage: image,
        mimeType: image.type,
        sourceName: image.name,
        rawExtractedText,
        editedText: extractedText,
        extractionExecution: rawExtractedText ? "online-cloud" : "none",
        ...updates,
      }, artifactId);
      setArtifactSaved(true);
      setArtifactOwner(userId);
      setSavedArtifacts(await listVerifyArtifacts(userId));
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Could not save this capture locally.");
    }
  };
  const restoreOriginalExtraction = () => {
    setExtractedText(rawExtractedText);
    void persistCurrentArtifact({ editedText: rawExtractedText });
  };
  const clearExtraction = () => {
    setRawExtractedText("");
    setExtractedText("");
    setExtractionNote("");
    void persistCurrentArtifact({
      rawExtractedText: "",
      editedText: "",
      extractionConfidence: undefined,
      extractionWarnings: [],
      extractionExecution: "none",
    });
  };
  const extractCurrentImage = async () => {
    if (!image || !cloudConsent || !online) return;
    try {
      const extracted = await extractImage(image, cloudConsent);
      setRawExtractedText(extracted.rawText);
      setExtractedText(extracted.rawText);
      void persistCurrentArtifact({
        rawExtractedText: extracted.rawText,
        editedText: extracted.rawText,
        extractionConfidence: extracted.confidence,
        extractionWarnings: extracted.warnings,
        extractionExecution: "online-cloud",
      });
      const confidence = Math.round(extracted.confidence * 100);
      setExtractionNote(`Cloud extraction complete · ${confidence}% confidence · source image not stored by the extraction service${extracted.warnings.length ? ` · ${extracted.warnings.join(" ")}` : ""}`);
    } catch { /* the hook exposes the actionable error */ }
  };
  const extractCurrentImageLocally = async () => {
    if (!image || !localOcrSupported || !artifactSaved) return;
    setLocalExtracting(true);
    setFileError(null);
    try {
      const extracted = await extractImageLocally(image);
      setRawExtractedText(extracted.rawText);
      setExtractedText(extracted.rawText);
      await persistCurrentArtifact({
        rawExtractedText: extracted.rawText,
        editedText: extracted.rawText,
        extractionConfidence: extracted.confidence,
        extractionWarnings: extracted.warnings,
        extractionEngine: extracted.engine,
        extractionPlatform: extracted.platform,
        extractionRegions: extracted.regions,
        extractionExecution: "local",
      });
      setExtractionNote(`Local extraction complete · ${extracted.regions.length} text regions · confidence not provided by this browser${extracted.warnings.length ? ` · ${extracted.warnings.join(" ")}` : ""}`);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Local OCR could not process this image.");
    } finally {
      setLocalExtracting(false);
    }
  };
  const submit = async () => {
    const combinedAnswer = [studentAnswer.trim(), extractedText.trim() ? `Reviewed extracted source text:\n${extractedText.trim()}` : ""].filter(Boolean).join("\n\n");
    void trackEvent("cortex_verify_used", { mode, subject, helpLevel: mode === "help" ? helpLevel : null, hasImage: Boolean(image && cloudConsent), hasQuestion: Boolean(question.trim()), hasStudentAnswer: Boolean(combinedAnswer) });
    const options = { subject, question, studentAnswer: combinedAnswer, image: image && cloudConsent ? image : undefined, visualEvidence: selectedVisualEvidence, visualEvidenceConsent: cloudConsent };
    return mode === "check" ? await check({ mode: "check", ...options }) : await help({ mode: "help", ...options, level: helpLevel });
  };
  return <section className="space-y-5"><div className="relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm sm:p-7"><div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[var(--primary-glow)] blur-3xl" /><div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[var(--accent-soft)] blur-3xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/25 bg-[var(--primary-glow)] px-3 py-1.5 text-xs font-bold text-[var(--primary)]"><Sparkles size={14} /> CORTEX VERIFY</div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">Mark your work. Understand more.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">Show Cortex your question and working. It checks the reasoning, points out where things went off track, and helps you fix it.</p></div><div className="flex flex-wrap items-center gap-3"><Link href="/cortex-verify/resources" className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--primary-glow)]">Resource review</Link><div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]"><span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`} />{online ? "Online" : "Offline"}{queueCount > 0 && <span>· {queueCount} queued</span>}</div></div></div><div className="relative mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--muted)] p-1.5"><button type="button" onClick={() => { setCloudConsent(false); setMode("check"); }} aria-pressed={mode === "check"} className={`min-h-11 rounded-xl px-3 py-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${mode === "check" ? "bg-[var(--card)] shadow-sm ring-1 ring-[var(--primary)]/15" : "text-[var(--muted-foreground)]"}`}>Mark my work</button><button type="button" onClick={() => { setCloudConsent(false); setMode("help"); }} aria-pressed={mode === "help"} className={`min-h-11 rounded-xl px-3 py-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${mode === "help" ? "bg-[var(--card)] shadow-sm ring-1 ring-violet-500/15" : "text-[var(--muted-foreground)]"}`}>Help me understand</button></div></div><div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm sm:p-7"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Subject<select value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted)] px-3 py-3 text-sm"><option>Mathematics</option><option>Physics</option><option>Chemistry</option><option>Computer Science</option><option>Biology</option><option>English</option><option>Other</option></select></label>{mode === "help" && <label className="text-sm font-bold">Help level<select value={helpLevel} onChange={(e) => setHelpLevel(e.target.value as typeof helpLevel)} className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted)] px-3 py-3 text-sm"><option value="hint">Give me a hint</option><option value="method">Show me the method</option><option value="solution">Full solution</option></select></label>}</div><label className="mt-5 block text-sm font-bold">Question<textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder="Paste or type the question here…" className="mt-2 w-full resize-y rounded-2xl border border-[var(--card-border)] bg-[var(--muted)] p-4 text-sm leading-6" /></label><label className="mt-4 block text-sm font-bold">{mode === "check" ? "Your answer / working" : "What have you tried? (optional)"}<textarea value={studentAnswer} onChange={(e) => setStudentAnswer(e.target.value)} rows={5} placeholder={mode === "check" ? "Show your working or type your answer…" : "Share any steps you have tried. You can leave this blank if you are stuck at the start."} className="mt-2 w-full resize-y rounded-2xl border border-[var(--card-border)] bg-[var(--muted)] p-4 text-sm leading-6" /></label><div className="mt-5 rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--muted)]/50 p-4">{preview ? <div><img src={preview} alt="Preview of submitted schoolwork" className="max-h-80 w-full rounded-xl object-contain bg-[var(--card)]" /><div className="mt-3 flex gap-2"><button onClick={() => fileRef.current?.click()} className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-xs font-bold">Replace image</button><button onClick={clearImage} className="rounded-xl px-3 py-2 text-xs font-bold text-[var(--danger)]">Remove</button></div></div> : <div className="flex flex-col items-center py-6 text-center"><ImagePlus size={22} /><p className="mt-3 text-sm font-bold">Add a photo of your work</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Good lighting and all working visible gives Cortex the best chance of grading fairly.</p><button onClick={() => fileRef.current?.click()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--card)] px-3.5 py-2.5 text-xs font-bold"><Camera size={16} /> Camera / photo</button></div>}<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Choose a photo of your work" onChange={(e) => onFile(e.target.files?.[0])} className="hidden" /><div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
  <p className="text-sm font-bold">Attach reviewed diagrams and graphs</p>
  <select aria-label="Choose a reviewed resource" value={selectedReviewResourceId} onChange={e => { setSelectedReviewResourceId(e.target.value); setCloudConsent(false); }} className="mt-3 w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted)] px-3 py-2.5 text-sm">
    <option value="">Choose a resource from Resource review…</option>
    {reviewResources.map(resource => <option key={resource.id} value={resource.id}>{resource.title}</option>)}
  </select>
  {visualEvidenceLoading && <p className="mt-2 text-xs text-[var(--muted-foreground)]">Loading locally saved crops…</p>}
  {visualEvidenceError && <p className="mt-2 text-xs text-amber-600">{visualEvidenceError}</p>}
  {visualEvidenceOptions.length > 0 && <div className="mt-3 space-y-2"><p className="text-xs font-semibold">Choose up to five crops to attach</p>{visualEvidenceOptions.map(option => {
    const selected = selectedVisualEvidence.some(item => item.file.name === option.file.name && item.label === option.label);
    return <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-[var(--muted)] p-3">
      <input type="checkbox" checked={selected} disabled={!selected && selectedVisualEvidence.length >= 5} onChange={event => {
        setCloudConsent(false);
        setSelectedVisualEvidence(current => event.target.checked
          ? current.length < 5 ? [...current, { file: option.file, label: option.label, annotation: option.annotation }] : current
          : current.filter(item => item.file !== option.file));
      }} className="mt-1" />
      <img src={option.previewUrl} alt={`Preview: ${option.label}`} className="h-20 w-24 shrink-0 rounded-lg bg-[var(--card)] object-contain" />
      <span className="min-w-0"><span className="block text-xs font-semibold">{option.label}</span><span className="mt-1 block text-[11px] text-[var(--muted-foreground)]">{option.annotation || "No interpretation notes"}</span><span className="mt-1 block text-[10px] text-[var(--muted-foreground)]">{(option.file.size / 1024).toFixed(0)} KB</span></span>
    </label>;
  })}</div>}
  <p className="mt-2 text-xs text-[var(--muted-foreground)]">{selectedVisualEvidence.length} of 5 crops selected. Only selected crops are attached. They stay on this device unless you explicitly consent to cloud processing.</p>
  {selectedVisualEvidence.length > 0 && <label className="mt-3 flex items-start gap-2 text-xs leading-5"><input type="checkbox" checked={cloudConsent} onChange={e => setCloudConsent(e.target.checked)} className="mt-0.5" /><span>I agree to send these visual crops, labels and notes, together with my question and working, to Shadecode cloud AI for this request. Visual evidence is never queued for later upload.</span></label>}
</div>{fileError && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{fileError}</p>}{image && <div className="mt-4 space-y-3 border-t border-[var(--card-border)] pt-4"><div className="space-y-2"><button type="button" onClick={() => void extractCurrentImageLocally()} disabled={!localOcrSupported || !artifactSaved || localExtracting} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--card)] px-4 py-2 text-xs font-bold disabled:opacity-50">{localExtracting ? <><Loader2 size={16} className="animate-spin" /> Extracting on this device…</> : "Extract locally (no upload)"}</button>{!localOcrSupported && <p className="text-xs leading-5 text-[var(--muted-foreground)]">This browser does not expose a supported local OCR engine. Your image stays on this device. Use the Android app for bundled on-device OCR, or choose cloud extraction below only if you consent.</p>}</div><label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" checked={cloudConsent} onChange={(e) => setCloudConsent(e.target.checked)} className="mt-0.5" /><span>I agree to send this image and my submitted work to Shadecode cloud AI for extraction, marking or help when connected. Offline, supported text-only answer-key checks can run locally, and Help can use a compatible model already loaded on this device. Unsupported requests may be saved for reconnect. Images are not processed by cloud AI until I am online.</span></label><button type="button" onClick={() => void extractCurrentImage()} disabled={!cloudConsent || !online || !artifactSaved || extracting} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-xs font-bold disabled:opacity-50">{extracting ? <><Loader2 size={16} className="animate-spin" /> Extracting online…</> : "Extract text for review"}</button></div>}{(rawExtractedText || extractedText) && <div className="mt-4 border-t border-[var(--card-border)] pt-4"><label className="block text-sm font-bold">SNAP & EXTRACT · Review extracted text<textarea value={extractedText} onChange={(e) => setExtractedText(e.target.value)} onBlur={() => void persistCurrentArtifact({ editedText: extractedText })} rows={7} className="mt-2 w-full resize-y rounded-2xl border border-[var(--card-border)] bg-[var(--muted)] p-4 text-sm leading-6" /></label><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={restoreOriginalExtraction} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs font-bold">Restore original extraction</button><button type="button" onClick={clearExtraction} className="rounded-lg px-3 py-2 text-xs font-bold text-[var(--danger)]">Clear extraction</button></div>{extractionNote && <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{extractionNote}</p>}<p className="mt-2 text-xs text-[var(--muted-foreground)]">Review and correct this transcription before using it in Mark Mode or Help Mode. It is an AI-assisted cloud transcription, not verified OCR.</p><p className="mt-2 text-xs text-[var(--muted-foreground)]">{artifactSaved ? "Source image and extraction saved privately on this device." : "Saving this capture locally…"}</p></div>}</div>{savedArtifacts.length > 0 && <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--muted)]/40 p-4"><p className="text-sm font-bold">Saved captures on this device</p><div className="mt-3 space-y-2">{savedArtifacts.map((artifact) => <div key={artifact.id} className="flex items-center gap-2 rounded-xl bg-[var(--card)] p-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{artifact.title}</p><p className="text-[11px] text-[var(--muted-foreground)]">{new Date(artifact.updatedAt).toLocaleString()}</p></div><button type="button" onClick={() => { const restored = new File([artifact.sourceImage], artifact.sourceName, { type: artifact.mimeType }); setImage(restored); const reader = new FileReader(); reader.onload = (event) => setPreview(String(event.target?.result || "")); reader.readAsDataURL(restored); setArtifactId(artifact.id); pendingArtifactId.current = artifact.id; setArtifactOwner(userId); setArtifactSaved(true); setCloudConsent(false); setRawExtractedText(artifact.rawExtractedText); setExtractedText(artifact.editedText); setExtractionNote(artifact.extractionExecution === "online-cloud" ? "Restored a cloud-extracted capture. Review its transcription before use." : "Restored a saved capture."); }} className="rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs font-bold">Open</button><button type="button" onClick={() => { void deleteVerifyArtifact(userId!, artifact.id).then(async () => { setSavedArtifacts(await listVerifyArtifacts(userId!)); if (artifactId === artifact.id) { setImage(undefined); setPreview(null); setArtifactId(null); pendingArtifactId.current = null; setArtifactSaved(false); setRawExtractedText(""); setExtractedText(""); setExtractionNote(""); } }); }} className="rounded-lg px-2 py-1.5 text-xs font-bold text-[var(--danger)]">Delete</button></div>)}</div></div>}{!online && <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[var(--muted)] p-4"><WifiOff size={18} /><div><p className="text-sm font-bold">Offline mode</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">You can capture work, edit extracted text and reopen saved captures offline. Text-only Help can run on this device when a compatible local model is already loaded. Mark Mode can check supported numeric and multiple-choice answers locally when a trusted answer key is available. This is a narrow answer-key check, not full working/partial-credit marking. Other response types are saved for reconnect. Image-based cloud processing waits until you are online.</p></div></div>}{error && <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--card-border)] p-4 text-sm"><AlertTriangle size={18} /><span>{error}</span></div>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={reset} disabled={loading} className="min-h-11 rounded-xl px-4 py-3 text-sm font-bold text-[var(--muted-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">Clear</button><button type="button" onClick={() => void submit()} disabled={loading || extracting || localExtracting || !userId || (mode === "check" ? (!question.trim() && !studentAnswer.trim() && !extractedText.trim() && !(image && cloudConsent) && selectedVisualEvidence.length === 0) : (!question.trim() && !extractedText.trim() && !(image && cloudConsent) && selectedVisualEvidence.length === 0))} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:opacity-50">{loading ? <><Loader2 size={18} className="animate-spin" /> {mode === "check" ? "Cortex is marking…" : "Cortex is helping…"}</> : mode === "check" ? <>Mark my work <ArrowRight size={18} /></> : <>Get help <Lightbulb size={18} /></>}</button></div>{!userId && <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">Sign in to use Cortex Verify and keep your offline work private.</p>}<div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[var(--muted-foreground)]"><ShieldCheck size={14} /> Your offline submissions stay scoped to your account.</div></div>{result && <ResultCard result={result} mode={mode} onRetry={clearResult} onHelp={() => { clearResult(); setMode("help"); }} />}</section>;
}
