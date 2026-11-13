import { markNumeric } from "@/lib/exam/engine/numeric";

/** Deterministic offline marking. Only explicit, versioned answer keys are accepted. */
export type OfflineVerifyRubric =
  | { version: 1; kind: "exact-number"; answer: number; marks: number; tolerance?: number; criterion: string; explanation?: string }
  | { version: 1; kind: "multiple-choice"; answer: string; marks: number; criterion: string; explanation?: string }
  | { version: 1; kind: "accepted-text"; answers: string[]; marks: number; criterion: string; explanation?: string }
  | { version: 1; kind: "structured-points"; marks: number; criteria: Array<{ id: string; description: string; marks: number; acceptedAnswers: string[] }> };

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
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ").replace(/[。.,;:!?]+$/g, "");
}

function validRubric(rubric: OfflineVerifyRubric): boolean {
  if (!rubric || rubric.version !== 1 || !Number.isFinite(rubric.marks) || rubric.marks <= 0) return false;
  if (rubric.kind === "exact-number") return Number.isFinite(rubric.answer) &&
    typeof rubric.criterion === "string" && !!rubric.criterion.trim() &&
    (rubric.tolerance === undefined || (Number.isFinite(rubric.tolerance) && rubric.tolerance >= 0));
  if (rubric.kind === "multiple-choice") return typeof rubric.answer === "string" && !!rubric.answer.trim() &&
    typeof rubric.criterion === "string" && !!rubric.criterion.trim();
  if (rubric.kind === "accepted-text") return Array.isArray(rubric.answers) && rubric.answers.length > 0 &&
    rubric.answers.every(value => typeof value === "string" && !!value.trim()) &&
    typeof rubric.criterion === "string" && !!rubric.criterion.trim();
  return rubric.kind === "structured-points" && Array.isArray(rubric.criteria) && rubric.criteria.length > 0 &&
    rubric.criteria.every(item => typeof item.id === "string" && !!item.id.trim() &&
      typeof item.description === "string" && !!item.description.trim() &&
      Number.isFinite(item.marks) && item.marks > 0 && Array.isArray(item.acceptedAnswers) &&
      item.acceptedAnswers.length > 0 && item.acceptedAnswers.every(value => typeof value === "string" && !!value.trim())) &&
    Math.abs(rubric.criteria.reduce((sum, item) => sum + item.marks, 0) - rubric.marks) < 1e-8;
}

function containsApprovedPhrase(answer: string, phrase: string): boolean {
  const escaped = normalized(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(answer);
}

/** Returns null for unsupported, malformed, or unparseable numeric answers. */
export function markWithOfflineRubric(question: string, studentAnswer: string, rubric: OfflineVerifyRubric): OfflineMarkResult | null {
  if (!validRubric(rubric) || !question.trim() || !studentAnswer.trim()) return null;

  let correct = false;
  let percentage = 0;
  let earnedMarks = 0;
  let steps: OfflineMarkResult["steps"] = [];
  let marksBreakdown: OfflineMarkResult["marksBreakdown"] = [];
  let feedback = "";

  if (rubric.kind === "structured-points") {
    const answer = normalized(studentAnswer);
    const outcomes = rubric.criteria.map(item => ({ item, earned: item.acceptedAnswers.some(phrase => containsApprovedPhrase(answer, phrase)) }));
    earnedMarks = outcomes.reduce((sum, outcome) => sum + (outcome.earned ? outcome.item.marks : 0), 0);
    percentage = Math.round((earnedMarks / rubric.marks) * 100);
    correct = earnedMarks === rubric.marks;
    steps = outcomes.map(({ item, earned }) => ({
      description: item.description,
      status: earned ? "correct" : "incorrect",
      note: earned ? `Matched this criterion and earned ${item.marks} marks.` : `No approved phrase matched. ${item.marks} marks not awarded.`,
    }));
    marksBreakdown = outcomes.map(({ item, earned }) => ({
      criterion: item.description,
      marksLost: earned ? 0 : item.marks,
      note: earned ? "Matched an explicitly approved answer phrase." : "No explicitly approved answer phrase was found.",
    }));
    feedback = `Offline structured check: ${earnedMarks}/${rubric.marks} marks. Only the supplied marking points were checked; unmatched wording may still deserve examiner review.`;
  } else {
    if (rubric.kind === "exact-number") {
      const marked = markNumeric(studentAnswer, { exact: rubric.answer, tolerance: rubric.tolerance ?? 0 });
      if (marked.matched === null) return null;
      correct = marked.correct;
    } else if (rubric.kind === "multiple-choice") {
      correct = normalized(studentAnswer) === normalized(rubric.answer);
    } else {
      correct = rubric.answers.some(answer => normalized(answer) === normalized(studentAnswer));
    }
    percentage = correct ? 100 : 0;
    earnedMarks = correct ? rubric.marks : 0;
    const note = rubric.explanation?.trim() || (correct ? "The response matches the supplied answer key." : "The response does not match the supplied answer key.");
    steps = [{ description: rubric.criterion, status: correct ? "correct" : "incorrect", note }];
    marksBreakdown = [{ criterion: rubric.criterion, marksLost: correct ? 0 : rubric.marks, note }];
    feedback = correct
      ? `Correct. You earned ${earnedMarks}/${rubric.marks} marks. ${note}`
      : `Not correct against the supplied answer key. You earned 0/${rubric.marks} marks. ${note}`;
  }

  return {
    problem: question.trim(),
    score: percentage,
    correct,
    cortexInsight: rubric.kind === "structured-points"
      ? "Checked locally against explicit marking points. This is bounded partial-credit marking, not semantic examiner judgement."
      : "Marked locally against a supplied deterministic answer key. No cloud model was used.",
    steps,
    feedback,
    marksBreakdown,
    confidence: 1,
    execution: "browser-local",
  };
}
