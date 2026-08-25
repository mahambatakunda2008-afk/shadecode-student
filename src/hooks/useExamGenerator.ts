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
  diagram?: unknown;
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
  results: Array<{ questionId: string; score: number; maxMarks: number; feedback: string; strengths: string[]; improvements: string[] }>;
  totalScore: number;
  totalMaxMarks: number;
  percentage: number;
  overallFeedback: string;
  weakTopics: string[];
  strongTopics: string[];
  recommendedActions: string[];
}

const EXAM_CACHE_PREFIX = "shadecode:exam:v5:";
const REPORT_CACHE_PREFIX = "shadecode:exam-report:v2:";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 50000;

type CachedValue<T> = { value: T; savedAt: number };

function normalizeTopics(topics: string[]) {
  return [...new Set(topics.map((topic) => topic.trim()).filter(Boolean))].sort();
}

function keyForExam(subject: string, topics: string[], difficulty: string, questionCount: number) {
  return `${EXAM_CACHE_PREFIX}${JSON.stringify({ subject: subject.trim(), topics: normalizeTopics(topics), difficulty, questionCount })}`;
}

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedValue<T>;
    if (!cached || typeof cached.savedAt !== "number") return null;
    return Date.now() - cached.savedAt <= CACHE_TTL_MS ? cached.value : null;
  } catch { return null; }
}

function writeCache<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() })); } catch { /* best effort */ }
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { window.clearTimeout(timer); }
}

function validateExam(exam: unknown, requestedCount: number): exam is GeneratedExam {
  if (!exam || typeof exam !== "object") return false;
  const candidate = exam as GeneratedExam;
  if (!Array.isArray(candidate.questions) || candidate.questions.length !== requestedCount) return false;
  return candidate.questions.every((q) =>
    typeof q?.id === "string" && q.id.length > 0 &&
    typeof q?.question === "string" && q.question.trim().length > 10 &&
    Number.isFinite(q?.marks) && q.marks > 0 &&
    typeof q?.topic === "string" && q.topic.trim().length > 0
  );
}

function getError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "error" in data) {
    const value = (data as { error?: unknown }).error;
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

export function useExamGenerator() {
  const [exam, setExam] = useState<GeneratedExam | null>(null);
  const [report, setReport] = useState<MarkingReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateExam = useCallback(async (subject: string, topics: string[], difficulty: string = "medium", questionCount: number = 10) => {
    const safeSubject = subject.trim();
    const safeTopics = normalizeTopics(topics);
    const safeCount = Math.min(30, Math.max(1, Math.round(questionCount)));
    if (!safeSubject || safeTopics.length === 0) {
      setError("Choose a subject and at least one topic before generating an exam.");
      return null;
    }

    const cacheKey = keyForExam(safeSubject, safeTopics, difficulty, safeCount);
    const cachedExam = readCache<GeneratedExam>(cacheKey);

    try {
      setGenerating(true); setError(null); setReport(null);
      if (cachedExam && validateExam(cachedExam, safeCount)) {
        setExam(cachedExam);
        if (typeof navigator !== "undefined" && !navigator.onLine) return cachedExam;
      } else if (typeof navigator !== "undefined" && !navigator.onLine) {
        setExam(null); setError("This exam has not been downloaded yet. Connect once to generate it, then it will work offline."); return null;
      }

      let res: Response;
      try {
        res = await fetchWithTimeout("/api/cortex/generate-exam", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: safeSubject, topics: safeTopics, difficulty, questionCount: safeCount }),
        });
      } catch (err) {
        if (cachedExam && validateExam(cachedExam, safeCount)) {
          setExam(cachedExam); setError("Fresh generation timed out. Showing your saved verified exam."); return cachedExam;
        }
        throw new Error(err instanceof DOMException && err.name === "AbortError" ? "Exam generation is taking longer than expected. Please try again." : "Unable to reach exam generation.");
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (cachedExam && validateExam(cachedExam, safeCount)) {
          setExam(cachedExam); setError("Fresh generation is unavailable right now. Showing your saved verified exam."); return cachedExam;
        }
        throw new Error(getError(data, `Exam generation failed (${res.status}).`));
      }

      if (!validateExam(data?.exam, safeCount)) {
        if (cachedExam && validateExam(cachedExam, safeCount)) {
          setExam(cachedExam); setError("The generated response failed validation. Showing your saved verified exam."); return cachedExam;
        }
        throw new Error("The generated exam did not pass validation. No incomplete paper was shown.");
      }

      setExam(data.exam); writeCache(cacheKey, data.exam); return data.exam;
    } catch (err) {
      if (cachedExam && validateExam(cachedExam, safeCount)) {
        setExam(cachedExam); setError("Showing the saved verified exam because fresh generation failed."); return cachedExam;
      }
      setError(err instanceof Error ? err.message : "Unable to generate exam"); return null;
    } finally { setGenerating(false); }
  }, []);

  const markExam = useCallback(async (subject: string, questions: ExamQuestion[], answers: Record<string, string>) => {
    const reportKey = `${REPORT_CACHE_PREFIX}${JSON.stringify({ subject, questions, answers })}`;
    const cachedReport = readCache<MarkingReport>(reportKey);
    try {
      setMarking(true); setError(null);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (cachedReport) { setReport(cachedReport); return { report: cachedReport, newAchievements: [] }; }
        throw new Error("Exam marking needs a connection unless this result was already saved.");
      }
      const res = await fetchWithTimeout("/api/cortex/mark-exam", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, questions, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (cachedReport) { setReport(cachedReport); setError("Showing the saved marking report. Fresh marking is unavailable right now."); return { report: cachedReport, newAchievements: [] }; }
        throw new Error(getError(data, `Exam marking failed (${res.status}).`));
      }
      if (!data?.report || !Array.isArray(data.report.results)) throw new Error("The marking response could not be validated.");
      setReport(data.report); writeCache(reportKey, data.report);
      return { report: data.report, newAchievements: data.newAchievements ?? [] };
    } catch (err) {
      if (cachedReport) { setReport(cachedReport); setError("Showing the saved marking report. Fresh marking is unavailable right now."); return { report: cachedReport, newAchievements: [] }; }
      setError(err instanceof Error ? err.message : "Unable to mark exam"); return null;
    } finally { setMarking(false); }
  }, []);

  return { exam, report, generating, marking, error, generateExam, markExam };
}
