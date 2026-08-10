"use client";

import { useState, useCallback, useEffect } from "react";
import { enqueue, getAll, remove, CortexAttempt } from "../lib/offline/cortex-queue";

export type VerifyMode = "check" | "help";
export type HelpLevel = "hint" | "method" | "solution";

export interface VerifyResult {
  problem: string;
  score?: number;
  correct?: boolean;
  cortexInsight?: string;
  steps?: { description: string; status: string; note?: string }[];
  feedback?: string;
  marksBreakdown?: Array<{ criterion: string; marksLost: number; note?: string }>;
}

const REQUEST_TIMEOUT_MS = 30_000;
const FILE_READ_TIMEOUT_MS = 15_000;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const timeout = window.setTimeout(() => {
      reader.abort();
      reject(new Error("Image processing took too long. Please try again."));
    }, FILE_READ_TIMEOUT_MS);

    reader.onload = () => {
      window.clearTimeout(timeout);
      resolve(String(reader.result));
    };
    reader.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("Could not read the selected image."));
    };
    reader.onabort = () => {
      window.clearTimeout(timeout);
      reject(new Error("Image processing was cancelled."));
    };
    reader.readAsDataURL(file);
  });
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function sendAttemptNow(attempt: CortexAttempt) {
  try {
    const fd = new FormData();
    if (attempt.imageDataUrl) {
      const res = await fetchWithTimeout(attempt.imageDataUrl);
      if (!res.ok) throw new Error("Could not prepare the selected image.");
      const blob = await res.blob();
      fd.append("image", blob, "upload.jpg");
    }
    fd.append("mode", attempt.mode);
    if (attempt.subject) fd.append("subject", attempt.subject);
    if (attempt.question) fd.append("question", attempt.question);
    if (attempt.studentAnswer) fd.append("studentAnswer", attempt.studentAnswer);
    if (attempt.mode === "help" && attempt.level) fd.append("level", attempt.level);

    const response = await fetchWithTimeout("/api/cortex/verify", { method: "POST", body: fd });
    let data: VerifyResult & { error?: string };
    try {
      data = await response.json();
    } catch {
      throw new Error("The verification service returned an invalid response.");
    }
    if (!response.ok) throw new Error(data.error || "Provider error");
    if (!data || typeof data !== "object") throw new Error("Invalid provider response");

    await remove(attempt.id);
    return data as VerifyResult;
  } catch (err) {
    try {
      const existing = await getAll();
      const found = existing.find((x) => x.id === attempt.id);
      if (found) {
        found.attempts = (found.attempts || 0) + 1;
        await enqueue(found);
      }
    } catch {
      // Keep the original request failure as the useful signal.
    }
    throw err;
  }
}

function errorMessage(err: unknown) {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "The request took too long. It has been kept for retry. Please try again later.";
  }
  return err instanceof Error ? err.message : "The verification request failed.";
}

export function useCortexVerify() {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (options: {
    mode: "check";
    subject?: string;
    question?: string;
    studentAnswer?: string;
    image?: File;
  }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const imageDataUrl = options.image ? await fileToDataUrl(options.image) : null;
      const attempt: CortexAttempt = {
        id,
        mode: "check",
        subject: options.subject,
        question: options.question,
        studentAnswer: options.studentAnswer,
        imageDataUrl,
        createdAt: new Date().toISOString(),
        attempts: 0,
      };
      await enqueue(attempt);

      if (typeof navigator !== "undefined" && navigator.onLine) {
        try {
          const res = await sendAttemptNow(attempt);
          setResult(res);
          return res;
        } catch (err) {
          setError(`Request queued: ${errorMessage(err)}`);
          return null;
        }
      }

      setError("Offline — request queued and will be sent when online.");
      return null;
    } catch (err) {
      setError(errorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const help = useCallback(async (options: {
    mode: "help";
    subject?: string;
    question?: string;
    level: HelpLevel;
    image?: File;
  }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const imageDataUrl = options.image ? await fileToDataUrl(options.image) : null;
      const attempt: CortexAttempt = {
        id,
        mode: "help",
        subject: options.subject,
        question: options.question,
        level: options.level,
        imageDataUrl,
        createdAt: new Date().toISOString(),
        attempts: 0,
      };
      await enqueue(attempt);

      if (typeof navigator !== "undefined" && navigator.onLine) {
        try {
          const res = await sendAttemptNow(attempt);
          setResult(res);
          return res;
        } catch (err) {
          setError(`Request queued: ${errorMessage(err)}`);
          return null;
        }
      }

      setError("Offline — request queued and will be sent when online.");
      return null;
    } catch (err) {
      setError(errorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function processQueueOnce() {
      try {
        const items = await getAll();
        items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        for (const it of items) {
          if (cancelled) return;
          if ((it.attempts || 0) >= 5) continue;
          try {
            await sendAttemptNow(it);
          } catch {
            continue;
          }
        }
      } catch {
        // Retry on the next scheduled pass.
      }
    }

    function schedule() {
      timer = window.setTimeout(async () => {
        if (navigator.onLine) await processQueueOnce();
        if (!cancelled) schedule();
      }, 30000);
    }

    window.addEventListener("online", processQueueOnce);
    schedule();
    if (navigator.onLine) void processQueueOnce();

    return () => {
      cancelled = true;
      window.removeEventListener("online", processQueueOnce);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return { result, loading, error, check, help };
}
