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
  // additional fields for non-math subjects
  feedback?: string;
  marksBreakdown?: Array<{ criterion: string; marksLost: number; note?: string }>;
}

export function useCortexVerify() {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendAttemptNow(attempt: CortexAttempt) {
    // Build FormData and POST to API
    try {
      const fd = new FormData();
      if (attempt.imageDataUrl) {
        // convert dataURL to blob
        const res = await fetch(attempt.imageDataUrl);
        const blob = await res.blob();
        fd.append('image', blob, 'upload.jpg');
      }
      fd.append('mode', attempt.mode);
      if (attempt.subject) fd.append('subject', attempt.subject);
      if (attempt.question) fd.append('question', attempt.question);
      if (attempt.studentAnswer) fd.append('studentAnswer', attempt.studentAnswer);
      if (attempt.mode === 'help' && attempt.level) fd.append('level', attempt.level);

      const response = await fetch('/api/cortex/verify', { method: 'POST', body: fd });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Provider error');
      // Basic validation of returned shape
      if (!data || typeof data !== 'object') throw new Error('Invalid provider response');
      // On success remove from queue
      await remove(attempt.id);
      return data as VerifyResult;
    } catch (err) {
      // increment attempts counter stored in queue
      try {
        const existing = await getAll();
        const found = existing.find((x) => x.id === attempt.id);
        if (found) {
          found.attempts = (found.attempts || 0) + 1;
          await enqueue(found);
        }
      } catch {
        // ignore
      }
      throw err;
    }
  }

  const check = useCallback(async (options: {
    mode: 'check';
    subject?: string;
    question?: string;
    studentAnswer?: string;
    image?: File;
  }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Persist attempt locally first
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      let imageDataUrl: string | null = null;
      if (options.image) {
        imageDataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(options.image as File);
        });
      }
      const attempt: CortexAttempt = {
        id,
        mode: 'check',
        subject: options.subject,
        question: options.question,
        studentAnswer: options.studentAnswer,
        imageDataUrl,
        createdAt: new Date().toISOString(),
        attempts: 0,
      };
      await enqueue(attempt);

      // Try send immediately if online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const res = await sendAttemptNow(attempt);
          setResult(res as VerifyResult);
          return res as VerifyResult;
        } catch (err) {
          // keep queued and inform user
          setError('Request queued due to temporary error; it will retry automatically.');
          return null;
        }
      }

      setError('Offline — request queued and will be sent when online.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const help = useCallback(async (options: {
    mode: 'help';
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
      let imageDataUrl: string | null = null;
      if (options.image) {
        imageDataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(options.image as File);
        });
      }
      const attempt: CortexAttempt = {
        id,
        mode: 'help',
        subject: options.subject,
        question: options.question,
        level: options.level,
        imageDataUrl,
        createdAt: new Date().toISOString(),
        attempts: 0,
      };
      await enqueue(attempt);

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const res = await sendAttemptNow(attempt);
          setResult(res as VerifyResult);
          return res as VerifyResult;
        } catch (err) {
          setError('Request queued due to temporary error; it will retry automatically.');
          return null;
        }
      }

      setError('Offline — request queued and will be sent when online.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Background sync: attempt queued items when online or every 30s
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function processQueueOnce() {
      try {
        const items = await getAll();
        // sort oldest first
        items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        for (const it of items) {
          if (cancelled) return;
          // simple backoff: skip if attempts > 5
          if ((it.attempts || 0) >= 5) continue;
          try {
            await sendAttemptNow(it);
          } catch (err) {
            // if provider failure, leave in queue
            continue;
          }
        }
      } catch (e) {
        // ignore local queue errors — will retry next tick
      }
    }

    function schedule() {
      timer = window.setTimeout(async () => {
        if (navigator.onLine) await processQueueOnce();
        if (!cancelled) schedule();
      }, 30000);
    }

    window.addEventListener('online', processQueueOnce);
    schedule();
    // also run once at mount
    if (navigator.onLine) processQueueOnce();

    return () => {
      cancelled = true;
      window.removeEventListener('online', processQueueOnce);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { result, loading, error, check, help };
}
