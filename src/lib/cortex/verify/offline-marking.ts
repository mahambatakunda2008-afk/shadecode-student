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
    }
  | {
      version: 1;
      kind: "structured-points";
      criteria: Array<{ id: string; description: string; marks: number; acceptedAnswers: string[] }>;
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
  if (rubric.kind === "accepted-text") return Array.isArray(rubric.answers) &&
    rubric.answers.length > 0 && rubric.answers.every(x => typeof x === "string" && !!x.trim());
  return rubric.kind === "structured-points" && Array.isArray(rubric.criteria) && rubric.criteria.length > 0 &&
    rubric.criteria.every(item => typeof item.id === "string" && !!item.id.trim() &&
      typeof item.description === "string" && !!item.description.trim() && Number.isFinite(item.marks) && item.marks > 0 &&
      Array.isArray(item.acceptedAnswers) && item.acceptedAnswers.length > 0 &&
      item.acceptedAnswers.every(value => typeof value === "string" && !!value.trim())) &&
    Math.abs(rubric.criteria.reduce((sum, item) => sum + item.marks, 0) - rubric.marks) < 1e-8;
}

/** Returns null for unsupported or malformed rubrics. */
export function markWithOfflineRubric(
  question: string,
  studentAnswer: string,
  rubric: OfflineVerifyRubric,
): OfflineMarkResult | null {
  if (!validRubric(rubric) || !question.trim() || !studentAnswer.trim()) return null;

  let correct = false;
  let score = 0;
  let steps: OfflineMarkResult["steps"];
  let marksBreakdown: OfflineMarkResult["marksBreakdown"];
  if (rubric.kind === "structured-points") {
    const answer = normalized(studentAnswer);
    const matched = (phrase: string) => {
      const escaped = phrase.trim().replace(/[.*+?^${}()|[\\]\\]/g, "\\\\  let correct = false;
  if (rubric.kind === "exact-number") {").replace(/\\s+/g, "\\\\s+");
      return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(answer);
    };
    const outcomes = rubric.criteria.map(item => ({ item, earned: item.acceptedAnswers.some(matched) }));
    score = outcomes.reduce((sum, outcome) => sum + (outcome.earned ? outcome.item.marks : 0), 0);
    correct = score === rubric.marks;
    steps = outcomes.map(({ item, earned }) => ({ description: item.description, status: earned ? "correct" : "incorrect", note: earned ? `Matched this criterion and earned ${item.marks} marks.` : `No approved answer phrase matched. ${item.marks} marks not awarded.` }));
    marksBreakdown = outcomes.map(({ item, earned }) => ({ criterion: item.description, marksLost: earned ? 0 : item.marks, note: earned ? "Criterion matched using the curated answer phrases." : "Criterion not matched using the curated answer phrases." }));
  } else if (rubric.kind === "exact-number") {
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

  if (rubric.kind !== "structured-points") score = correct ? 100 : 0;
  const note = rubric.kind === "structured-points" ? `Earned ${score}/${rubric.marks} marks using the explicit offline marking points.` : rubric.explanation?.trim() ||
    (correct ? "The response matches the supplied answer key." : "The response does not match the supplied answer key.");
  const feedback = correct
    ? `Correct. You earned ${rubric.marks}/${rubric.marks} marks for this criterion. ${note}`
    : `Not correct against the supplied answer key. You earned 0/${rubric.marks} marks for this criterion. ${note}`;

  return {
    problem: question.trim(),
    score: rubric.kind === "structured-points" ? Math.round((score / rubric.marks) * 100) : score,
    correct,
    cortexInsight: "Marked locally against a supplied deterministic answer key. No cloud model was used.",
    steps: steps ?? [{
      description: rubric.kind === "structured-points" ? "Structured marking" : rubric.criterion.trim(),
      status: correct ? "correct" : "incorrect",
      note,
    }],
    feedback,
    marksBreakdown: marksBreakdown ?? [{
      criterion: rubric.criterion.trim(),
      marksLost: correct ? 0 : rubric.marks,
      note,
    }],
    confidence: 1,
    execution: "browser-local",
  };
}
