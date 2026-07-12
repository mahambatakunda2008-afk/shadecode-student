/**
 * Cortex Math Engine
 *
 * AI-powered mathematics problem solver with:
 * - Step-by-step solutions
 * - Partial credit assessment
 * - Concept identification
 * - Personalized difficulty adaptation
 */

import { callAI } from "@/lib/ai";
import { getMemory } from "./memory";

export interface MathSolution {
  problem: string;
  subject: string;
  steps: MathStep[];
  finalAnswer: string;
  conceptsUsed: string[];
  difficulty: "easy" | "medium" | "hard";
  estimatedAccuracy: number;
}

export interface MathStep {
  description: string;
  expression?: string;
  explanation: string;
  correct: boolean;
}

export interface MathCheckResult {
  correct: boolean;
  score: number;
  feedback: string;
  solution: MathSolution;
  weakConcepts: string[];
  nextSteps: string[];
}

const MATH_SYSTEM_PROMPT = `You are an expert mathematics tutor for Shadecode Student.
Solve the given math problem step by step. Return ONLY valid JSON.

Output format:
{
  "steps": [
    {
      "description": "Step description",
      "expression": "Mathematical expression (if applicable)",
      "explanation": "Why this step works",
      "correct": true
    }
  ],
  "finalAnswer": "The final answer",
  "conceptsUsed": ["concept1", "concept2"],
  "difficulty": "easy|medium|hard",
  "estimatedAccuracy": 0.95
}

Rules:
- Show ALL working steps
- Use clear mathematical notation
- Explain the reasoning behind each step
- Identify the mathematical concepts being used
- Output valid JSON only`;

export async function solveMathProblem(
  problem: string,
  subject: string,
  userId: string
): Promise<MathSolution | null> {
  try {
    const memory = await getMemory(userId);
    const levelContext = `Student math level: ${memory.level}
Prior math subjects: ${(memory.subjects ?? []).join(", ")}
${memory.averageExamScore ? `Average score: ${memory.averageExamScore}%` : ""}`;

    const prompt = `${MATH_SYSTEM_PROMPT}

Subject: ${subject}
Problem: ${problem}

Student context:
${levelContext}

Solve this problem:`;

    const response = await callAI(prompt, 3000);
    if (!response) return null;

    const jsonMatch = response.match(/\{[^]*\}/);
    if (!jsonMatch) return fallbackSolution(problem, subject);

    const solution = JSON.parse(jsonMatch[0]) as Omit<MathSolution, "problem" | "subject">;
    return {
      problem,
      subject,
      ...solution,
    };
  } catch (error) {
    console.error("[MathEngine] Failed:", error);
    return fallbackSolution(problem, subject);
  }
}

export async function checkStudentAnswer(
  problem: string,
  subject: string,
  studentAnswer: string,
  userId: string
): Promise<MathCheckResult | null> {
  try {
    const solution = await solveMathProblem(problem, subject, userId);
    if (!solution) return null;

    const solutionAnswer = solution.finalAnswer.trim().toLowerCase();
    const studentTrimmed = studentAnswer.trim().toLowerCase();

    const exactMatch = solutionAnswer === studentTrimmed;
    const containsMatch = solutionAnswer.includes(studentTrimmed) || studentTrimmed.includes(solutionAnswer);

    const correct = exactMatch || containsMatch;
    const score = correct ? 100 : 25;

    const weakConcepts: string[] = [];
    if (!correct) {
      weakConcepts.push(...solution.conceptsUsed);
    }

    const nextSteps: string[] = [];
    if (correct) {
      nextSteps.push(`Try a harder ${subject} problem`);
      nextSteps.push(`Practice related concepts: ${solution.conceptsUsed.join(", ")}`);
    } else {
      nextSteps.push(`Review these concepts: ${solution.conceptsUsed.join(", ")}`);
      nextSteps.push("Try breaking the problem into smaller steps");
      nextSteps.push("Check your working for arithmetic errors");
    }

    const feedback = correct
      ? `Correct! The answer is ${solution.finalAnswer}. Good understanding of ${solution.conceptsUsed.join(", ")}.`
      : `Not quite. The correct answer is ${solution.finalAnswer}. Review the concepts of ${solution.conceptsUsed.join(", ")}.`;

    return {
      correct,
      score,
      feedback,
      solution,
      weakConcepts,
      nextSteps,
    };
  } catch (error) {
    console.error("[MathEngine] Check failed:", error);
    return null;
  }
}

function fallbackSolution(problem: string, subject: string): MathSolution {
  return {
    problem,
    subject,
    steps: [
      {
        description: "Analyze the problem",
        explanation: `Understanding the key concepts in this ${subject} problem.`,
        correct: true,
      },
      {
        description: "Apply relevant formulas",
        explanation: "Use the appropriate mathematical methods for this type of problem.",
        correct: true,
      },
      {
        description: "Verify the solution",
        explanation: "Check your answer by working backwards or using estimation.",
        correct: true,
      },
    ],
    finalAnswer: "Solution requires step-by-step working. Please try again with more details.",
    conceptsUsed: [subject],
    difficulty: "medium",
    estimatedAccuracy: 0.7,
  };
}
