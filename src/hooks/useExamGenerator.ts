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
    try {
      setGenerating(true);
      setError(null);
      setExam(null);
      setReport(null);

      const res = await fetch("/api/cortex/generate-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topics, difficulty, questionCount }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate exam");
      }

      const data = await res.json();
      setExam(data.exam);
      return data.exam;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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
    try {
      setMarking(true);
      setError(null);

      const res = await fetch("/api/cortex/mark-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, questions, answers }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to mark exam");
      }

      const data = await res.json();
      setReport(data.report);
      return { report: data.report, newAchievements: data.newAchievements };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setMarking(false);
    }
  }, []);

  return { exam, report, generating, marking, error, generateExam, markExam };
}
