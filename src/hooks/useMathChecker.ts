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

const REQUEST_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return typeof data?.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
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

      const res = await fetchWithTimeout("/api/cortex/math-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "solve", problem, subject }),
      });

      if (!res.ok) throw new Error(await readError(res, "Failed to solve problem"));

      const data = await res.json();
      setSolution(data.solution);
      return data.solution;
    } catch (err) {
      const message = err instanceof DOMException && err.name === "AbortError"
        ? "The request took too long. Please try again."
        : err instanceof Error ? err.message : "Unknown error";
      setError(message);
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

      const res = await fetchWithTimeout("/api/cortex/math-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", problem, subject, studentAnswer }),
      });

      if (!res.ok) throw new Error(await readError(res, "Failed to check answer"));

      const data = await res.json();
      setCheckResult(data.result);
      setSolution(data.result.solution);
      return data.result;
    } catch (err) {
      const message = err instanceof DOMException && err.name === "AbortError"
        ? "The request took too long. Please try again."
        : err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { solution, checkResult, loading, error, solve, check };
}
