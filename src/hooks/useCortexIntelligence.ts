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

export function useCortexIntelligence() {
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [patterns, setPatterns] = useState<StudyPatterns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchIntelligence = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/cortex/intelligence");
      if (!res.ok) throw new Error("Failed to fetch intelligence");

      const data = await res.json();
      setReport(data.report);
      setPatterns(data.patterns);
    } catch (err) {
      console.error("[useCortexIntelligence] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  return { report, patterns, loading, error, refresh: fetchIntelligence };
}
