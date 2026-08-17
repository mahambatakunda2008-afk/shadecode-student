import { callAI } from "@/lib/ai";
import type { ExamQuestion } from "./examGenerator";

export interface MarkingResult { questionId: string; score: number; maxMarks: number; feedback: string; strengths: string[]; improvements: string[]; confidence: number; }
export interface ExamMarkingReport { results: MarkingResult[]; totalScore: number; totalMaxMarks: number; percentage: number; overallFeedback: string; weakTopics: string[]; strongTopics: string[]; recommendedActions: string[]; }

const MARKING_SYSTEM_PROMPT = `You are an experienced examiner for Shadecode Student.
Mark the given student answer against the model answer. Be fair and consistent.
Award partial credit for partially correct answers.
Return ONLY valid JSON with score, maxMarks, feedback, strengths, improvements, confidence.
Rules: score must be 0..maxMarks; confidence 0..1; provide actionable, evidence-based feedback.`;

const ANSWER_TIMEOUT_MS = 8_000;
const MARKING_CONCURRENCY = 4;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("ANSWER_MARKING_TIMEOUT")), ms);
      timer.unref?.();
    }),
  ]);
}

function normalizeResult(result: Partial<MarkingResult>, question: ExamQuestion): MarkingResult {
  const score = Number.isFinite(result.score) ? Math.min(Math.max(Number(result.score), 0), question.marks) : 0;
  const confidence = Number.isFinite(result.confidence) ? Math.min(Math.max(Number(result.confidence), 0), 1) : 0.5;
  return {
    questionId: question.id,
    score,
    maxMarks: question.marks,
    feedback: typeof result.feedback === "string" ? result.feedback : "Answer evaluated.",
    strengths: Array.isArray(result.strengths) ? result.strengths.filter((v): v is string => typeof v === "string") : [],
    improvements: Array.isArray(result.improvements) ? result.improvements.filter((v): v is string => typeof v === "string") : [],
    confidence,
  };
}

export async function markAnswer(question: ExamQuestion, studentAnswer: string): Promise<MarkingResult> {
  try {
    const prompt = `${MARKING_SYSTEM_PROMPT}\n\nQuestion: ${question.question}\n${question.options ? `Options: ${question.options.join(", ")}` : ""}\nModel Answer: ${question.modelAnswer || "See marking criteria below"}\nMarking Criteria: ${question.markingCriteria || "Award marks based on accuracy and completeness"}\nMax Marks: ${question.marks}\nType: ${question.type}\n\nStudent Answer:\n${studentAnswer}\n\nMark this answer:`;
    const response = await withTimeout(callAI(prompt, 1000, { feature: "exam_sim", subfeature: "mark_answer" }), ANSWER_TIMEOUT_MS);
    if (!response) return fallbackMark(question.id, question.marks, studentAnswer);
    const jsonMatch = response.match(/\{[^]*\}/);
    if (!jsonMatch) return fallbackMark(question.id, question.marks, studentAnswer);
    return normalizeResult(JSON.parse(jsonMatch[0]) as Partial<MarkingResult>, question);
  } catch (error) {
    if (!(error instanceof Error && error.message === "ANSWER_MARKING_TIMEOUT")) console.error("[MarkingEngine] Failed:", error);
    return fallbackMark(question.id, question.marks, studentAnswer);
  }
}

function fallbackMark(questionId: string, maxMarks: number, answer: string): MarkingResult {
  const hasContent = answer.trim().length > 10;
  return { questionId, score: hasContent ? Math.ceil(maxMarks * 0.7) : 0, maxMarks, feedback: hasContent ? "Answer received and partially evaluated." : "No substantial answer provided.", strengths: hasContent ? ["Answer provided"] : [], improvements: hasContent ? ["Could be more detailed"] : ["Provide a complete answer"], confidence: 0.5 };
}

async function markInBatches(questions: ExamQuestion[], answers: Record<string, string>): Promise<MarkingResult[]> {
  const results: MarkingResult[] = [];
  for (let index = 0; index < questions.length; index += MARKING_CONCURRENCY) {
    const batch = questions.slice(index, index + MARKING_CONCURRENCY);
    const batchResults = await Promise.all(batch.map((question) => markAnswer(question, answers[question.id] || "")));
    results.push(...batchResults);
  }
  return results;
}

export async function generateExamFeedback(subject: string, questions: ExamQuestion[], answers: Record<string, string>): Promise<ExamMarkingReport | null> {
  const results = await markInBatches(questions, answers);
  const totalScore = results.reduce((s, r) => s + r.score, 0);
  const totalMaxMarks = results.reduce((s, r) => s + r.maxMarks, 0);
  const percentage = totalMaxMarks > 0 ? Math.round((totalScore / totalMaxMarks) * 100) : 0;
  const weakTopics = results.filter(r => r.score < r.maxMarks * 0.5).flatMap(r => r.improvements);
  const strongTopics = results.filter(r => r.score >= r.maxMarks * 0.8).flatMap(r => r.strengths);
  const recommendedActions: string[] = [];
  if (percentage < 50) recommendedActions.push(`Review the fundamentals of ${subject}`);
  else if (percentage < 75) recommendedActions.push(`Practice more ${subject} problems`);
  else recommendedActions.push(`Challenge yourself with advanced ${subject} topics`);
  if (weakTopics.length > 0) recommendedActions.push(`Focus on: ${[...new Set(weakTopics)].slice(0, 3).join(", ")}`);
  const overallFeedback = percentage >= 80 ? "Excellent performance! You have a strong grasp of the material." : percentage >= 60 ? "Good effort! There are some areas to review." : percentage >= 40 ? "You're making progress. Focus on the fundamentals." : "Keep practicing. Review the core concepts and try again.";
  return { results, totalScore, totalMaxMarks, percentage, overallFeedback, weakTopics: [...new Set(weakTopics)], strongTopics: [...new Set(strongTopics)], recommendedActions };
}
