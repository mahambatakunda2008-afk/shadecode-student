"use client";

import { useState, useCallback, useEffect } from "react";
import { enqueue, getAll, remove, CortexAttempt } from "../lib/offline/cortex-queue";
import { createClient } from "../lib/supabase/client";

export type VerifyMode = "check" | "help";
export type HelpLevel = "hint" | "method" | "solution";

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
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { window.clearTimeout(timeout); }
}

async function currentUserId() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Please sign in before using Cortex Verify.");
  return data.user.id;
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
    fd.append("userId", attempt.userId);
    if (attempt.subject) fd.append("subject", attempt.subject);
    if (attempt.question) fd.append("question", attempt.question);
    if (attempt.studentAnswer) fd.append("studentAnswer", attempt.studentAnswer);
    if (attempt.mode === "help" && attempt.level) fd.append("level", attempt.level);

    const response = await fetchWithTimeout("/api/cortex/verify", { method: "POST", body: fd });
    let data: VerifyResult & { error?: string };
    try { data = await response.json(); } catch { throw new Error("Cortex returned an invalid response."); }
    if (!response.ok) throw new Error(data.error || "Cortex provider error.");
    if (!data || typeof data !== "object") throw new Error("Invalid Cortex response.");
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

  const submit = useCallback(async (options: {
    mode: VerifyMode;
    subject?: string;
    question?: string;
    studentAnswer?: string;
    level?: HelpLevel;
    image?: File;
  }) => {
    setLoading(true); setError(null); setResult(null);
    try {
      const userId = await currentUserId();
      const imageDataUrl = options.image ? await fileToDataUrl(options.image) : null;
      const attempt: CortexAttempt = {
        id: `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
        userId,
        mode: options.mode,
        subject: options.subject?.trim() || undefined,
        question: options.question?.trim() || undefined,
        studentAnswer: options.studentAnswer?.trim() || undefined,
        level: options.level,
        imageDataUrl,
        createdAt: new Date().toISOString(),
        attempts: 0,
      };
      await enqueue(attempt);
      if (navigator.onLine) {
        try { const response = await sendAttemptNow(attempt); setResult(response); return response; }
        catch (err) { setError(`Saved for retry: ${errorMessage(err)}`); return null; }
      }
      setError("You're offline. Saved securely on this account and will retry when you reconnect.");
      return null;
    } catch (err) { setError(errorMessage(err)); return null; }
    finally { setLoading(false); }
  }, []);

  const check = useCallback((options: Parameters<typeof submit>[0] & { mode: "check" }) => submit(options), [submit]);
  const help = useCallback((options: Parameters<typeof submit>[0] & { mode: "help"; level: HelpLevel }) => submit(options), [submit]);

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

  return { result, loading, error, check, help };
}
