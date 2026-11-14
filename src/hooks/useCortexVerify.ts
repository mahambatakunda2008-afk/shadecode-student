"use client";

import { useState, useCallback, useEffect } from "react";
import { enqueue, getAll, remove, CortexAttempt } from "../lib/offline/cortex-queue";
import { emitCortexEvent } from "@/lib/cortex/events/emit";
import { createClient } from "@/lib/supabase/client";
import { runHybridJson } from "@/lib/cortex/hybridJson";
import { isValidHelpResult, selectHelpResult, type VerifyHelpLevel } from "@/lib/cortex/verify/help-level";
import { isValidVerifyMarkResult } from "@/lib/cortex/verify/result-contract";
import { getBrowserLocalModelStatus } from "@/lib/cortex/localModel";
import { markWithOfflineRubric, type OfflineVerifyRubric } from "@/lib/cortex/verify/offline-marking";
import { buildOfflineVerifyRubric } from "@/lib/cortex/verify/offline-question-adapter";
import { buildVerifyLearnerContext } from "@/lib/cortex/verify/learner-model";
import { readVerifyLearnerModel, recordVerifyLearningSignal } from "@/lib/cortex/verify/learner-model-store";
import { createVerifyResultCacheKey, getCachedVerifyResult, saveCachedVerifyResult } from "@/lib/cortex/verify/result-cache";
import type { ExamQuestion } from "@/lib/exam/types";

export type VerifyMode = "check" | "help";
export type HelpLevel = "hint" | "method" | "solution";

export type VerifyExtraction = {
  rawText: string;
  confidence: number;
  warnings: string[];
  execution: "online-cloud";
  sourceStored: false;
};

export interface VerifyResult {
  problem: string;
  confidence?: number;
  score?: number;
  correct?: boolean;
  needsRetake?: boolean;
  retakeReason?: string;
  cortexInsight?: string;
  steps?: { description: string; status: string; note?: string }[];
  feedback?: string;
  marksBreakdown?: Array<{ criterion: string; marksLost: number; note?: string }>;
  level?: string;
  hint?: string;
  method?: string;
  solution?: string;
  finalAnswer?: string;
  content?: string;
  execution?: "browser-local" | "browser-local-deterministic" | "cloud" | "cached";
  cachedFromExecution?: "browser-local" | "browser-local-deterministic" | "cloud";
}

const REQUEST_TIMEOUT_MS = 30_000;
const FILE_READ_TIMEOUT_MS = 15_000;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const timeout = window.setTimeout(() => { reader.abort(); reject(new Error("Image processing took too long. Please try again.")); }, FILE_READ_TIMEOUT_MS);
    reader.onload = () => { window.clearTimeout(timeout); resolve(String(reader.result)); };
    reader.onerror = () => { window.clearTimeout(timeout); reject(new Error("Could not read the selected image.")); };
    reader.onabort = () => { window.clearTimeout(timeout); reject(new Error("Image processing was cancelled.")); };
    reader.readAsDataURL(file);
  });
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const external = init?.signal;
  const abortFromExternal = () => controller.abort();
  external?.addEventListener("abort", abortFromExternal, { once: true });
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally {
    window.clearTimeout(timeout);
    external?.removeEventListener("abort", abortFromExternal);
  }
}

async function currentUserId() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Please sign in before using Cortex Verify.");
  return data.user.id;
}

function recordVerifyEvent(attempt: CortexAttempt, result: VerifyResult, topicId?: string) {
  if (attempt.mode === "check" && typeof result.score === "number") {
    const misconceptionTags = (result.marksBreakdown || []).filter(item => item.marksLost > 0).map(item => (item.note || item.criterion).trim()).filter(Boolean).slice(0, 8);
    recordVerifyLearningSignal({ subject: attempt.subject || "General", topic: topicId || "General practice", score: result.score, correct: result.correct, misconceptionTags });
    if (navigator.onLine) {
      void fetch("/api/intelligence/events", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "cortex-verify", sourceEventId: attempt.id, type: "question.attempted",
          subjectId: attempt.subject || "General", topicId, attemptId: attempt.id,
          occurredAt: new Date().toISOString(),
          metadata: { mode: "mark", score: result.score, evidenceScore: result.score,
            correct: result.correct === true || result.score >= 99,
            confidence: typeof result.confidence === "number" ? result.confidence : null,
            misconceptionTags: misconceptionTags.join("; ").slice(0, 500) },
        }),
      }).catch(() => undefined);
    }
  }
  emitCortexEvent({
    id: attempt.id,
    userId: attempt.userId,
    type: "verify.completed",
    source: "verify",
    data: {
      mode: attempt.mode,
      subject: attempt.subject || null,
      score: typeof result.score === "number" ? result.score : null,
      correct: result.correct === true,
      needsRetake: result.needsRetake === true,
      confidence: typeof result.confidence === "number" ? result.confidence : null,
    },
  });
}

async function sendAttemptNow(attempt: CortexAttempt) {
  try {
    const fd = new FormData();
    if (attempt.imageDataUrl) {
      const res = await fetchWithTimeout(attempt.imageDataUrl);
      if (!res.ok) throw new Error("Could not prepare the selected image.");
      fd.append("image", await res.blob(), "upload.jpg");
    }
    fd.append("mode", attempt.mode);
    fd.append("learnerContext", buildVerifyLearnerContext(readVerifyLearnerModel()).slice(0, 3000));
    fd.append("userId", attempt.userId);
    if (attempt.subject) fd.append("subject", attempt.subject);
    if (attempt.question) fd.append("question", attempt.question);
    if (attempt.studentAnswer) fd.append("studentAnswer", attempt.studentAnswer);
    if (attempt.mode === "help" && attempt.level) fd.append("level", attempt.level);

    const requestCloud = async (signal?: AbortSignal) => {
      const response = await fetchWithTimeout("/api/cortex/verify", { method: "POST", body: fd, signal });
      let data: VerifyResult & { error?: string };
      try { data = await response.json(); } catch { throw new Error("Cortex returned an invalid response."); }
      if (!response.ok) throw new Error(data.error || "Cortex provider error.");
      if (!data || typeof data !== "object") throw new Error("Invalid Cortex response.");
      return data as VerifyResult;
    };

    let data: VerifyResult;
    if (!attempt.imageDataUrl) {
      const localPrompt = `You are Cortex Verify.
Mode: ${attempt.mode}
Subject: ${attempt.subject || "General"}
Question: ${attempt.question || ""}
Student working/answer: ${attempt.studentAnswer || ""}
Help level: ${attempt.level || "hint"}

Check the student's reasoning rather than blindly giving an answer. Return ONLY JSON.
For check mode include: problem, confidence, score, correct, needsRetake, retakeReason, cortexInsight, steps, feedback, marksBreakdown, finalAnswer.
For help mode, return ONLY the field matching the selected level: hint for hint, method for method, or solution (and finalAnswer when appropriate) for solution. Never include a solution or finalAnswer for hint/method.
Be accurate and explicit about uncertainty.

${buildVerifyLearnerContext(readVerifyLearnerModel())}\n\nUse this private learner model to adapt explanations and choose fresh practice. Do not repeat an identical question when a new question can test the same skill.\n\nMATHEMATICAL FORMATTING IS MANDATORY: put every equation and mathematical expression inside valid LaTeX delimiters, using \\( ... \\) inline and \\[ ... \\] for display equations. Use proper LaTeX for fractions (\\frac{a}{b}), roots (\\sqrt{10}), powers (r^2), subscripts (x_{B}), coordinates and aligned working. Never output bare or fragmented mathematical notation, detached exponents, missing operators, or variables on separate lines. Define symbols, preserve signs/brackets, show complete substitutions, and use numbered steps. Independently verify every calculation and ensure the final answer agrees with the derivation. If source text or an image is unclear, say so instead of guessing. Keep all delimiters and backslashes intact inside JSON string values.`;
      data = await runHybridJson<VerifyResult>({
        localPrompt,
        validate: (value): value is VerifyResult => {
          const v = value as VerifyResult;
          return !!v && typeof v === "object" &&
            (attempt.mode === "help"
              ? isValidHelpResult(v, (attempt.level || "hint") as VerifyHelpLevel)
              : isValidVerifyMarkResult(v));
        },
        cloud: requestCloud,
        localMaxTokens: 1400,
        preferParallel: true,
      });
    } else {
      data = await requestCloud();
    }
    if (attempt.mode === "help") {
      data = selectHelpResult(data, (attempt.level || "hint") as VerifyHelpLevel) as VerifyResult;
    }
    if (!navigator.onLine) data.execution = "browser-local";
    recordVerifyEvent(attempt, data as VerifyResult, attempt.topicId);
    await remove(attempt.userId, attempt.id);
    return data as VerifyResult;
  } catch (err) {
    try {
      const existing = await getAll(attempt.userId);
      const found = existing.find((x) => x.id === attempt.id);
      if (found) { found.attempts = (found.attempts || 0) + 1; await enqueue(found); }
    } catch { /* preserve original error */ }
    throw err;
  }
}

function errorMessage(err: unknown) {
  if (err instanceof DOMException && err.name === "AbortError") return "The request took too long. It has been kept for retry.";
  return err instanceof Error ? err.message : "The verification request failed.";
}

export function useCortexVerify() {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  const submit = useCallback(async (options: {
    mode: VerifyMode;
    subject?: string;
    topicId?: string;
    question?: string;
    studentAnswer?: string;
    level?: HelpLevel;
    image?: File;
    offlineRubric?: OfflineVerifyRubric;
    /** Trusted downloaded/built-in question metadata; only numeric and keyed MC items are eligible. */
    offlineQuestion?: ExamQuestion;
    /** Locally stored diagram/graph crops. Never queued for later upload. */
    visualEvidence?: Array<{ file: File; label: string; annotation?: string }>;
    visualEvidenceConsent?: boolean;
  }) => {
    setLoading(true); setError(null); setResult(null);
    try {
      const userId = await currentUserId();
      const imageDataUrl = options.image ? await fileToDataUrl(options.image) : null;
      const visualEvidence = options.visualEvidence || [];
      if (visualEvidence.length > 5) throw new Error("Attach no more than five visual regions at a time.");
      if (visualEvidence.length && !options.visualEvidenceConsent) throw new Error("Confirm that you agree to send the selected visual regions to cloud AI.");
      if (visualEvidence.length && !navigator.onLine) throw new Error("Visual evidence cannot be sent while offline. Your local crops have not been uploaded; reconnect and try again.");
      if (visualEvidence.some(item => !["image/webp", "image/png", "image/jpeg"].includes(item.file.type) || item.file.size > 4 * 1024 * 1024)) {
        throw new Error("Each visual crop must be a JPG, PNG or WEBP image no larger than 4 MB.");
      }
      if (visualEvidence.reduce((sum, item) => sum + item.file.size, 0) > 8 * 1024 * 1024) {
        throw new Error("Combined visual evidence must be 8 MB or smaller.");
      }
      // Reuse an exact, owner-scoped result before spending another model call.
      // The cache stores a response and request fingerprint, never source images.
      const cacheKey = await createVerifyResultCacheKey({
        mode: options.mode, subject: options.subject, topicId: options.topicId, question: options.question,
        studentAnswer: options.studentAnswer, level: options.level, image: options.image, visualEvidence,
      });
      const attempt: CortexAttempt = {
        id: `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
        userId,
        mode: options.mode,
        subject: options.subject?.trim() || undefined,
        topicId: options.topicId?.trim() || undefined,
        question: options.question?.trim() || undefined,
        studentAnswer: options.studentAnswer?.trim() || undefined,
        level: options.level,
        imageDataUrl,
        createdAt: new Date().toISOString(),
        attempts: 0,
      };
      if (cacheKey) {
        try {
          const cached = await getCachedVerifyResult(userId, cacheKey);
          if (cached) { setResult(cached); return cached; }
        } catch { /* Cache failure must never block a fresh verification. */ }
      }
      if (visualEvidence.length) {
        const fd = new FormData();
        fd.append("mode", attempt.mode);
        fd.append("learnerContext", buildVerifyLearnerContext(readVerifyLearnerModel()).slice(0, 3000));
        fd.append("userId", attempt.userId);
        fd.append("subject", attempt.subject || "General");
        fd.append("question", attempt.question || "");
        fd.append("studentAnswer", attempt.studentAnswer || "");
        if (imageDataUrl) { const imageResponse = await fetchWithTimeout(imageDataUrl); if (!imageResponse.ok) throw new Error("Could not prepare the selected source image."); fd.append("image", await imageResponse.blob(), options.image?.name || "source-image.jpg"); }
        if (attempt.mode === "help" && attempt.level) fd.append("level", attempt.level);
        fd.append("visualEvidenceConsent", "true");
        visualEvidence.forEach(({ file, label, annotation }) => {
          fd.append("visualEvidence", file, file.name || "visual-evidence.webp");
          fd.append("visualEvidenceContext", JSON.stringify({ label: label.slice(0, 100), annotation: (annotation || "").slice(0, 1000) }));
        });
        const response = await fetchWithTimeout("/api/cortex/verify", { method: "POST", body: fd });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data || typeof data !== "object") throw new Error(data?.error || "Cortex could not assess the visual evidence.");
        const validated = data as VerifyResult;
        if (attempt.mode === "help" ? !isValidHelpResult(validated, (attempt.level || "hint") as VerifyHelpLevel) : !isValidVerifyMarkResult(validated)) {
          throw new Error("Cortex returned an invalid visual verification result.");
        }
        if (attempt.mode === "help") Object.assign(validated, selectHelpResult(validated, (attempt.level || "hint") as VerifyHelpLevel));
        recordVerifyEvent(attempt, validated, options.topicId);
        if (cacheKey) { try { await saveCachedVerifyResult(userId, cacheKey, validated); } catch { /* Best-effort cache. */ } }
        setResult(validated);
        return validated;
      }
      await enqueue(attempt);
      if (navigator.onLine) {
        try {
          const response = await sendAttemptNow(attempt);
          if (cacheKey) { try { await saveCachedVerifyResult(userId, cacheKey, response); } catch { /* Best-effort cache. */ } }
          setResult(response);
          return response;
        }
        catch (err) { setError(`Saved for retry: ${errorMessage(err)}`); return null; }
      }
      // Deterministic Mark Mode is allowed only when the caller supplies an explicit,
      // versioned answer key. Unsupported question types remain queued for cloud review.
      const offlineRubric = options.offlineRubric || (options.offlineQuestion
        ? buildOfflineVerifyRubric(options.offlineQuestion)
        : null);
      if (attempt.mode === "check" && !attempt.imageDataUrl && offlineRubric) {
        const localResult = markWithOfflineRubric(
          options.offlineQuestion?.question || attempt.question || "",
          attempt.studentAnswer || "",
          offlineRubric,
        );
        if (localResult) {
          const response: VerifyResult = { ...localResult, execution: "browser-local-deterministic" };
          recordVerifyEvent(attempt, response, options.topicId);
          await remove(attempt.userId, attempt.id);
          if (cacheKey) { try { await saveCachedVerifyResult(userId, cacheKey, response); } catch { /* Best-effort cache. */ } }
          setResult(response);
          return response;
        }
      }

      // A warm browser-local model may provide Help Mode without network access.
      if (attempt.mode === "help" && !attempt.imageDataUrl && getBrowserLocalModelStatus().status === "ready") {
        try {
          const response = await sendAttemptNow(attempt);
          setResult(response);
          return response;
        } catch (err) {
          setError(`Your help request is saved. The local model could not complete it: ${errorMessage(err)}`);
          return null;
        }
      }
      setError(attempt.mode === "check"
        ? "You're offline. Your marking request is saved for reconnect. Offline marking is not enabled for this response type yet."
        : "You're offline. Your request is saved for reconnect. Load a supported local model to use Help Mode without internet.");
      return null;
    } catch (err) { setError(errorMessage(err)); return null; }
    finally { setLoading(false); }
  }, []);

  const extractImage = useCallback(async (image: File, cloudConsent: boolean): Promise<VerifyExtraction> => {
    if (!cloudConsent) throw new Error("Confirm cloud processing before extracting this image.");
    setExtracting(true);
    setError(null);
    try {
      await currentUserId();
      const form = new FormData();
      form.append("image", image);
      form.append("cloudConsent", "true");
      const response = await fetchWithTimeout("/api/cortex/verify/extract", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Image extraction failed.");
      if (!data || typeof data.rawText !== "string" || typeof data.confidence !== "number" ||
          !Array.isArray(data.warnings) || !data.warnings.every((item: unknown) => typeof item === "string")) {
        throw new Error("Cortex returned an invalid extraction.");
      }
      return {
        rawText: data.rawText,
        confidence: Math.max(0, Math.min(1, data.confidence)),
        warnings: data.warnings,
        execution: "online-cloud",
        sourceStored: false,
      };
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setExtracting(false);
    }
  }, []);

  const check = useCallback((options: Parameters<typeof submit>[0] & { mode: "check" }) => submit(options), [submit]);
  const help = useCallback((options: Parameters<typeof submit>[0] & { mode: "help"; level: HelpLevel }) => submit(options), [submit]);
  const clearResult = useCallback(() => { setResult(null); setError(null); }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    async function processQueueOnce() {
      if (!navigator.onLine) return;
      try {
        const userId = await currentUserId();
        const items = await getAll(userId);
        items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        for (const item of items) {
          if (cancelled) return;
          if ((item.attempts || 0) >= 5) continue;
          try { await sendAttemptNow(item); } catch { /* next pass */ }
        }
      } catch { /* signed-out or storage failure */ }
    }
    const schedule = () => { timer = window.setTimeout(async () => { await processQueueOnce(); if (!cancelled) schedule(); }, 30_000); };
    window.addEventListener("online", processQueueOnce);
    void processQueueOnce();
    schedule();
    return () => { cancelled = true; window.removeEventListener("online", processQueueOnce); if (timer) window.clearTimeout(timer); };
  }, []);

  return { result, loading, error, extracting, extractImage, check, help, clearResult };
}
