"use client";

import { useState, useCallback } from "react";

export interface ExamQuestion {
  id: string;
  type: "multiple_choice" | "short_answer" | "structured" | "essay";
  question: string;
  options?: string[];
  marks: number;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  modelAnswer?: string;
}

export interface GeneratedExam {
  subject: string;
  title: string;
  questions: ExamQuestion[];
  totalMarks: number;
  durationMinutes: number;
  difficulty: string;
  topics: string[];
}

export interface MarkingReport {
  results: Array<{
    questionId: string;
    score: number;
    maxMarks: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  }>;
  totalScore: number;
  totalMaxMarks: number;
  percentage: number;
  overallFeedback: string;
  weakTopics: string[];
  strongTopics: string[];
  recommendedActions: string[];
}

const EXAM_CACHE_PREFIX = "shadecode:exam:";
const REPORT_CACHE_PREFIX = "shadecode:exam-report:";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

type CachedValue<T> = { value: T; savedAt: number };

function keyForExam(subject: string, topics: string[], difficulty: string, questionCount: number) {
  return `${EXAM_CACHE_PREFIX}${JSON.stringify({ subject: subject.trim(), topics: [...topics].sort(), difficulty, questionCount })}`;
}

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedValue<T>;
    return Date.now() - cached.savedAt <= CACHE_TTL_MS ? cached.value : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
  } catch {
    // Offline cache is best-effort and must never break an exam.
  }
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export function useExamGenerator() {
  const [exam, setExam] = useState<GeneratedExam | null>(null);
  const [report, setReport] = useState<MarkingReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateExam = useCallback(async (
    subject: string,
    topics: string[],
    difficulty: string = "medium",
    questionCount: number = 10
  ) => {
    const cacheKey = keyForExam(subject, topics, difficulty, questionCount);
    const cachedExam = readCache<GeneratedExam>(cacheKey);

    try {
      setGenerating(true);
      setError(null);
      setReport(null);

      if (cachedExam) {
        setExam(cachedExam);
        if (typeof navigator !== "undefined" && !navigator.onLine) return cachedExam;
      } else if (typeof navigator !== "undefined" && !navigator.onLine) {
        setExam(null);
        setError("This exam has not been downloaded yet. Connect once to generate it, then it will work offline.");
        return null;
      }

      const res = await fetchWithTimeout("/api/cortex/generate-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topics, difficulty, questionCount }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (cachedExam) {
          setExam(cachedExam);
          setError("Showing the saved exam. Fresh generation is unavailable right now.");
          return cachedExam;
        }
        throw new Error(data.error || "Failed to generate exam");
      }

      const data = await res.json();
      setExam(data.exam);
      writeCache(cacheKey, data.exam);
      return data.exam;
    } catch (err) {
      if (cachedExam) {
        setExam(cachedExam);
        setError("Showing the saved exam. Fresh generation is unavailable right now.");
        return cachedExam;
      }
      setError(err instanceof Error ? err.message : "Unable to generate exam");
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const markExam = useCallback(async (
    subject: string,
    questions: ExamQuestion[],
    answers: Record<string, string>
  ) => {
    const reportKey = `${REPORT_CACHE_PREFIX}${JSON.stringify({ subject, questions, answers })}`;
    const cachedReport = readCache<MarkingReport>(reportKey);

    try {
      setMarking(true);
      setError(null);

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (cachedReport) {
          setReport(cachedReport);
          return { report: cachedReport, newAchievements: [] };
        }
        throw new Error("Exam marking needs a connection unless this result was already saved.");
      }

      const res = await fetchWithTimeout("/api/cortex/mark-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, questions, answers }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (cachedReport) {
          setReport(cachedReport);
          setError("Showing the saved marking report. Fresh marking is unavailable right now.");
          return { report: cachedReport, newAchievements: [] };
        }
        throw new Error(data.error || "Failed to mark exam");
      }

      const data = await res.json();
      setReport(data.report);
      writeCache(reportKey, data.report);
      return { report: data.report, newAchievements: data.newAchievements };
    } catch (err) {
      if (cachedReport) {
        setReport(cachedReport);
        setError("Showing the saved marking report. Fresh marking is unavailable right now.");
        return { report: cachedReport, newAchievements: [] };
      }
      setError(err instanceof Error ? err.message : "Unable to mark exam");
      return null;
    } finally {
      setMarking(false);
    }
  }, []);

  return { exam, report, generating, marking, error, generateExam, markExam };
}
