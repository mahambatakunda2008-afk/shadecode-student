import { markNumeric } from "@/lib/exam/engine/numeric";

/**
 * Deterministic offline marking for explicitly supported single-answer items.
 * This is deliberately narrow: it never asks a language model to invent a mark.
 */

export type OfflineVerifyRubric =
  | {
      version: 1;
      kind: "exact-number";
      answer: number;
      marks: number;
      tolerance?: number;
      criterion: string;
      explanation?: string;
    }
  | {
      version: 1;
      kind: "multiple-choice";
      answer: string;
      marks: number;
      criterion: string;
      explanation?: string;
    }
  | {
      version: 1;
      kind: "accepted-text";
      answers: string[];
      marks: number;
      criterion: string;
      explanation?: string;
    };

export interface OfflineMarkResult {
  problem: string;
  score: number;
  correct: boolean;
  cortexInsight: string;
  steps: Array<{ description: string; status: "correct" | "incorrect"; note: string }>;
  feedback: string;
  marksBreakdown: Array<{ criterion: string; marksLost: number; note: string }>;
  confidence: 1;
  execution: "browser-local";
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ").replace(/[。.,;:!?]+$/g, "");
}

function validRubric(rubric: OfflineVerifyRubric): boolean {
  if (!rubric || rubric.version !== 1 || !Number.isFinite(rubric.marks) || rubric.marks <= 0 ||
      typeof rubric.criterion !== "string" || !rubric.criterion.trim()) return false;
  if (rubric.kind === "exact-number") {
    return Number.isFinite(rubric.answer) &&
      (rubric.tolerance === undefined || (Number.isFinite(rubric.tolerance) && rubric.tolerance >= 0));
  }
  if (rubric.kind === "multiple-choice") return typeof rubric.answer === "string" && !!rubric.answer.trim();
  return rubric.kind === "accepted-text" && Array.isArray(rubric.answers) &&
    rubric.answers.length > 0 && rubric.answers.every(x => typeof x === "string" && !!x.trim());
}

/** Returns null for unsupported or malformed rubrics. */
export function markWithOfflineRubric(
  question: string,
  studentAnswer: string,
  rubric: OfflineVerifyRubric,
): OfflineMarkResult | null {
  if (!validRubric(rubric) || !question.trim() || !studentAnswer.trim()) return null;

  let correct = false;
  if (rubric.kind === "exact-number") {
    const marked = markNumeric(studentAnswer, {
      exact: rubric.answer,
      tolerance: rubric.tolerance ?? 0,
    });
    // A numeric rubric cannot fairly judge a response that contains no parseable number.
    // Return null so the caller can route it to Help/cloud marking instead of recording a false zero.
    if (marked.matched === null) return null;
    correct = marked.correct;
  } else if (rubric.kind === "multiple-choice") {
    correct = normalized(studentAnswer) === normalized(rubric.answer);
  } else {
    correct = rubric.answers.some(answer => normalized(answer) === normalized(studentAnswer));
  }

  const score = correct ? 100 : 0;
  const note = rubric.explanation?.trim() ||
    (correct ? "The response matches the supplied answer key." : "The response does not match the supplied answer key.");
  const feedback = correct
    ? `Correct. You earned ${rubric.marks}/${rubric.marks} marks for this criterion. ${note}`
    : `Not correct against the supplied answer key. You earned 0/${rubric.marks} marks for this criterion. ${note}`;

  return {
    problem: question.trim(),
    score,
    correct,
    cortexInsight: "Marked locally against a supplied deterministic answer key. No cloud model was used.",
    steps: [{
      description: rubric.criterion.trim(),
      status: correct ? "correct" : "incorrect",
      note,
    }],
    feedback,
    marksBreakdown: [{
      criterion: rubric.criterion.trim(),
      marksLost: correct ? 0 : rubric.marks,
      note,
    }],
    confidence: 1,
    execution: "browser-local",
  };
}
