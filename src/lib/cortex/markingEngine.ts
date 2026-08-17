/**
 * Cortex Marking Engine
 *
 * AI-powered exam marking with bounded execution, partial credit,
 * step-by-step evaluation, feedback, and weak-area identification.
 */

import { callAI } from "@/lib/ai";
import type { ExamQuestion } from "./examGenerator";

export interface MarkingResult {
  questionId: string;
  score: number;
  maxMarks: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  confidence: number;
  provisional?: boolean;
}

export interface ExamMarkingReport {
  results: MarkingResult[];
  totalScore: number;
  totalMaxMarks: number;
  percentage: number;
  overallFeedback: string;
  weakTopics: string[];
  strongTopics: string[];
  recommendedActions: string[];
  provisional: boolean;
}

const MARKING_SYSTEM_PROMPT = `You are an experienced examiner for Shadecode Student.
Mark the given student answer against the model answer. Be fair and consistent.
Award partial credit for partially correct answers.

Return ONLY valid JSON:
{
  "score": 3,
  "maxMarks": 5,
  "feedback": "Detailed feedback on the answer",
  "strengths": ["Good use of terminology"],
  "improvements": ["Could elaborate on the mechanism"],
  "confidence": 0.85
}

Rules:
- Score must be between 0 and maxMarks
- Be generous with partial credit
- Provide actionable feedback
- Identify specific strengths and improvements
- Confidence 0-1 based on how clear the answer is`;

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeResult(question: ExamQuestion, value: unknown): MarkingResult | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const maxMarks = Math.max(0, Number(question.marks) || 0);

  return {
    questionId: question.id,
    score: clampNumber(raw.score, 0, maxMarks, 0),
    maxMarks,
    feedback: typeof raw.feedback === "string" && raw.feedback.trim()
      ? raw.feedback.trim().slice(0, 1500)
      : "Answer evaluated against the available marking criteria.",
    strengths: Array.isArray(raw.strengths)
      ? raw.strengths.filter((x): x is string => typeof x === "string").slice(0, 8)
      : [],
    improvements: Array.isArray(raw.improvements)
      ? raw.improvements.filter((x): x is string => typeof x === "string").slice(0, 8)
      : [],
    confidence: clampNumber(raw.confidence, 0, 1, 0.5),
  };
}

function fallbackMark(questionId: string, maxMarks: number, answer: string): MarkingResult {
  const safeMax = Math.max(0, Number(maxMarks) || 0);
  const hasContent = answer.trim().length > 10;
  return {
    questionId,
    score: 0,
    maxMarks: safeMax,
    feedback: hasContent
      ? "AI marking is temporarily unavailable. No mark was invented for this answer. Retry marking when the service is available or review this answer manually."
      : "No substantial answer provided.",
    strengths: hasContent ? ["Answer provided"] : [],
    improvements: hasContent ? ["Retry AI marking or review the answer manually"] : ["Provide a complete answer"],
    confidence: 0,
    provisional: true,
  };
}

export async function markAnswer(
  question: ExamQuestion,
  studentAnswer: string
): Promise<MarkingResult | null> {
  try {
    const prompt = `${MARKING_SYSTEM_PROMPT}

Question: ${question.question}
${question.options ? `Options: ${question.options.join(", ")}` : ""}
Model Answer: ${question.modelAnswer || "See marking criteria below"}
Marking Criteria: ${question.markingCriteria || "Award marks based on accuracy and completeness"}
Max Marks: ${question.marks}
Type: ${question.type}

Student Answer:
${studentAnswer}

Mark this answer:`;

    const response = await callAI(prompt, 1000, {
      feature: "exam_sim",
      subfeature: "mark_answer",
      maxChainMs: 12000,
      perProviderMaxMs: 5000,
    });

    if (!response) return fallbackMark(question.id, question.marks, studentAnswer);

    const jsonMatch = response.match(/\{[^]*\}/);
    if (!jsonMatch) return fallbackMark(question.id, question.marks, studentAnswer);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return fallbackMark(question.id, question.marks, studentAnswer);
    }

    return normalizeResult(question, parsed) ?? fallbackMark(question.id, question.marks, studentAnswer);
  } catch (error) {
    console.error("[MarkingEngine] Failed:", error);
    return fallbackMark(question.id, question.marks, studentAnswer);
  }
}

/** Mark a complete exam with bounded concurrency. */
export async function generateExamFeedback(
  subject: string,
  questions: ExamQuestion[],
  answers: Record<string, string>
): Promise<ExamMarkingReport | null> {
  const results: MarkingResult[] = [];
  const concurrency = 3;

  for (let i = 0; i < questions.length; i += concurrency) {
    const batch = questions.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((q) => markAnswer(q, answers[q.id] || "")));
    results.push(...batchResults.filter((r): r is MarkingResult => Boolean(r)));
  }

  const provisional = results.some((r) => r.provisional);
  const totalScore = results.reduce((s, r) => s + clampNumber(r.score, 0, r.maxMarks, 0), 0);
  const totalMaxMarks = results.reduce((s, r) => s + Math.max(0, r.maxMarks), 0);
  const percentage = totalMaxMarks > 0 ? Math.round((totalScore / totalMaxMarks) * 100) : 0;

  const weakTopics = results.filter(r => !r.provisional && r.score < r.maxMarks * 0.5).flatMap(r => r.improvements);
  const strongTopics = results.filter(r => !r.provisional && r.score >= r.maxMarks * 0.8).flatMap(r => r.strengths);

  const recommendedActions: string[] = [];
  if (provisional) recommendedActions.push("Some answers could not be AI-marked. Retry marking before relying on the score.");
  if (percentage < 50) recommendedActions.push(`Review the fundamentals of ${subject}`);
  else if (percentage < 75) recommendedActions.push(`Practice more ${subject} problems`);
  else recommendedActions.push(`Challenge yourself with advanced ${subject} topics`);
  if (weakTopics.length > 0) recommendedActions.push(`Focus on: ${[...new Set(weakTopics)].slice(0, 3).join(", ")}`);

  let overallFeedback: string;
  if (provisional) overallFeedback = "Marking completed with some answers requiring review because the AI marker was unavailable.";
  else if (percentage >= 80) overallFeedback = "Excellent performance! You have a strong grasp of the material.";
  else if (percentage >= 60) overallFeedback = "Good effort! There are some areas to review.";
  else if (percentage >= 40) overallFeedback = "You're making progress. Focus on the fundamentals.";
  else overallFeedback = "Keep practicing. Review the core concepts and try again.";

  return {
    results,
    totalScore,
    totalMaxMarks,
    percentage,
    overallFeedback,
    weakTopics: [...new Set(weakTopics)],
    strongTopics: [...new Set(strongTopics)],
    recommendedActions,
    provisional,
  };
}
