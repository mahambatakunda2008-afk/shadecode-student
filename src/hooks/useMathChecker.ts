"use client";

import { useState, useCallback } from "react";

export interface MathSolution {
  problem: string;
  subject: string;
  steps: Array<{
    description: string;
    expression?: string;
    explanation: string;
    correct: boolean;
  }>;
  finalAnswer: string;
  conceptsUsed: string[];
  difficulty: "easy" | "medium" | "hard";
  estimatedAccuracy: number;
}

export interface MathCheckResult {
  correct: boolean;
  score: number;
  feedback: string;
  solution: MathSolution;
  weakConcepts: string[];
  nextSteps: string[];
}

export function useMathChecker() {
  const [solution, setSolution] = useState<MathSolution | null>(null);
  const [checkResult, setCheckResult] = useState<MathCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solve = useCallback(async (problem: string, subject: string) => {
    try {
      setLoading(true);
      setError(null);
      setCheckResult(null);

      const res = await fetch("/api/cortex/math-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "solve", problem, subject }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to solve problem");
      }

      const data = await res.json();
      setSolution(data.solution);
      return data.solution;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const check = useCallback(async (
    problem: string,
    subject: string,
    studentAnswer: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/cortex/math-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", problem, subject, studentAnswer }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to check answer");
      }

      const data = await res.json();
      setCheckResult(data.result);
      setSolution(data.result.solution);
      return data.result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { solution, checkResult, loading, error, solve, check };
}
