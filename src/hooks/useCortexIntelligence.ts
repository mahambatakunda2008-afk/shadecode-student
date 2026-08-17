"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface IntelligenceReport {
  learningInsight: string;
  recommendation: string;
  focus: string;
  weakAreas: string[];
  strongAreas: string[];
  nextAction: string;
}

export interface StudyPatterns {
  preferredTimeOfDay: string;
  averageSessionMinutes: number;
  consistencyScore: number;
  subjectBalance: string;
  trend: "improving" | "declining" | "stable";
}

type CachedIntelligence = {
  report: IntelligenceReport | null;
  patterns: StudyPatterns | null;
  savedAt: number;
};

const CACHE_PREFIX = "shadecode:cortex:intelligence:";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 4500;

function cacheKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

function readCached(userId: string): CachedIntelligence | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedIntelligence;
    if (!cached.savedAt || Date.now() - cached.savedAt > CACHE_TTL_MS) return null;
    return cached;
  } catch {
    return null;
  }
}

function writeCached(userId: string, report: IntelligenceReport | null, patterns: StudyPatterns | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cacheKey(userId), JSON.stringify({ report, patterns, savedAt: Date.now() }));
  } catch {
    // Storage is an optimization, never a requirement for Cortex.
  }
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export function useCortexIntelligence() {
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [patterns, setPatterns] = useState<StudyPatterns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntelligence = useCallback(async () => {
    const supabase = createClient();

    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const cached = readCached(userId);
      if (cached) {
        setReport(cached.report);
        setPatterns(cached.patterns);
        setLoading(false);
      } else {
        setLoading(true);
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (!cached) setError("Cortex intelligence is not downloaded yet. Connect once to make it available offline.");
        return;
      }

      const res = await fetchWithTimeout("/api/cortex/intelligence");
      if (!res.ok) throw new Error(`Failed to fetch intelligence (${res.status})`);

      const data = await res.json();
      const nextReport = data.report ?? null;
      const nextPatterns = data.patterns ?? null;
      setReport(nextReport);
      setPatterns(nextPatterns);
      writeCached(userId, nextReport, nextPatterns);
    } catch (err) {
      console.error("[useCortexIntelligence] Error:", err);
      if (!report) {
        setError(typeof navigator !== "undefined" && !navigator.onLine
          ? "Cortex is offline. Connect once to refresh intelligence."
          : err instanceof Error ? err.message : "Unable to refresh Cortex intelligence");
      }
    } finally {
      setLoading(false);
    }
  }, [report]);

  useEffect(() => {
    void fetchIntelligence();
  }, [fetchIntelligence]);

  useEffect(() => {
    const refresh = () => void fetchIntelligence();
    window.addEventListener("online", refresh);
    return () => window.removeEventListener("online", refresh);
  }, [fetchIntelligence]);

  return { report, patterns, loading, error, refresh: fetchIntelligence };
}
