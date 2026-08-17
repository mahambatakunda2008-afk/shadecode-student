/**
 * Cortex Math Engine
 *
 * AI-powered mathematics problem solver with bounded execution and safe fallback.
 */

import { callAI } from "@/lib/ai";
import { getMemory } from "./memory";

export interface MathSolution { problem: string; subject: string; steps: MathStep[]; finalAnswer: string; conceptsUsed: string[]; difficulty: "easy" | "medium" | "hard"; estimatedAccuracy: number; }
export interface MathStep { description: string; expression?: string; explanation: string; correct: boolean; }
export interface MathCheckResult { correct: boolean; score: number; feedback: string; solution: MathSolution; weakConcepts: string[]; nextSteps: string[]; }

const MATH_SYSTEM_PROMPT = `You are an expert mathematics tutor for Shadecode Student.\nSolve the given math problem step by step. Return ONLY valid JSON.\n\nOutput format:\n{\n  "steps": [{"description":"Step description","expression":"Mathematical expression","explanation":"Why this step works","correct":true}],\n  "finalAnswer":"The final answer","conceptsUsed":["concept1"],"difficulty":"easy|medium|hard","estimatedAccuracy":0.95\n}\n\nRules:\n- Show all working steps\n- Explain the reasoning\n- Identify mathematical concepts\n- Output valid JSON only`;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);
    promise.then(value => {
      clearTimeout(timer);
      resolve(value);
    }).catch(() => {
      clearTimeout(timer);
      resolve(fallback);
    });
  });
}

export async function solveMathProblem(problem: string, subject: string, userId: string): Promise<MathSolution | null> {
  try {
    const memory = await withTimeout(getMemory(userId), 2000, {
      level: 1, streak: 0, xp: 0, totalTasks: 0, completedTasks: 0,
      subjects: [], weakTopics: [], frequentlyStudiedSubjects: [], strongSubjects: [],
      preferredStudyHours: [], averageSessionDuration: 0, totalStudySessions: 0,
      examScores: [], averageExamScore: 0, longestStreak: 0, totalLessonsCompleted: 0,
      totalStudyTimeMinutes: 0,
    });
    const levelContext = `Student math level: ${memory.level}\nPrior math subjects: ${(memory.subjects ?? []).join(", ")}\n${memory.averageExamScore ? `Average score: ${memory.averageExamScore}%` : ""}`;
    const prompt = `${MATH_SYSTEM_PROMPT}\n\nSubject: ${subject}\nProblem: ${problem}\n\nStudent context:\n${levelContext}\n\nSolve this problem:`;
    const response = await withTimeout(
      callAI(prompt, 3000, { userId, feature: "math_engine", subfeature: "solve_problem", maxChainMs: 12000, perProviderMaxMs: 3000 }),
      13000,
      null
    );
    if (!response) return fallbackSolution(problem, subject);
    const jsonMatch = response.match(/\{[^]*\}/);
    if (!jsonMatch) return fallbackSolution(problem, subject);
    const parsed = JSON.parse(jsonMatch[0]) as Partial<MathSolution>;
    const steps = Array.isArray(parsed.steps) ? parsed.steps.filter((s): s is MathStep => Boolean(s && typeof s === "object" && typeof s.description === "string" && typeof s.explanation === "string")).slice(0, 30) : [];
    if (!steps.length || typeof parsed.finalAnswer !== "string" || !parsed.finalAnswer.trim()) return fallbackSolution(problem, subject);
    return { problem, subject, steps, finalAnswer: parsed.finalAnswer.trim(), conceptsUsed: Array.isArray(parsed.conceptsUsed) ? parsed.conceptsUsed.filter((x): x is string => typeof x === "string").slice(0, 20) : [], difficulty: parsed.difficulty === "easy" || parsed.difficulty === "hard" ? parsed.difficulty : "medium", estimatedAccuracy: Number.isFinite(Number(parsed.estimatedAccuracy)) ? Math.min(1, Math.max(0, Number(parsed.estimatedAccuracy))) : 0.5 };
  } catch (error) {
    console.error("[MathEngine] Failed:", error);
    return fallbackSolution(problem, subject);
  }
}

export async function checkStudentAnswer(problem: string, subject: string, studentAnswer: string, userId: string): Promise<MathCheckResult | null> {
  try {
    const solution = await withTimeout(solveMathProblem(problem, subject, userId), 14000, null);
    if (!solution) return null;
    const solutionAnswer = solution.finalAnswer.trim().toLowerCase();
    const studentTrimmed = studentAnswer.trim().toLowerCase();
    const correct = solutionAnswer === studentTrimmed || solutionAnswer.includes(studentTrimmed) || studentTrimmed.includes(solutionAnswer);
    const score = correct ? 100 : 25;
    const weakConcepts = correct ? [] : solution.conceptsUsed;
    const nextSteps = correct ? [`Try a harder ${subject} problem`, `Practice related concepts: ${solution.conceptsUsed.join(", ")}`] : [`Review these concepts: ${solution.conceptsUsed.join(", ")}`, "Try breaking the problem into smaller steps", "Check your working for arithmetic errors"];
    return { correct, score, feedback: correct ? `Correct! The answer is ${solution.finalAnswer}. Good understanding of ${solution.conceptsUsed.join(", ")}.` : `Not quite. The correct answer is ${solution.finalAnswer}. Review the concepts of ${solution.conceptsUsed.join(", ")}.`, solution, weakConcepts, nextSteps };
  } catch (error) {
    console.error("[MathEngine] Check failed:", error);
    return null;
  }
}

function fallbackSolution(problem: string, subject: string): MathSolution {
  return { problem, subject, steps: [{ description: "Analyze the problem", explanation: `Understanding the key concepts in this ${subject} problem.`, correct: true }, { description: "Apply relevant formulas", explanation: "Use the appropriate mathematical methods for this type of problem.", correct: true }, { description: "Verify the solution", explanation: "Check your answer by working backwards or using estimation.", correct: true }], finalAnswer: "Solution requires step-by-step working. Please try again with more details.", conceptsUsed: [subject], difficulty: "medium", estimatedAccuracy: 0.7 };
}
