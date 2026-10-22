/**
 * AI-free worked practice, built from the app's deterministic question engine (computed numbers, full working,
 * and the classic wrong answers for each question type). Always correct, free, and independent of any AI provider.
 * Covers calculation topics the engine has generators for (maths, physics, chemistry, computing).
 */
import { buildEngineExam, formatAnswer, matchGenerators } from "@/lib/exam/engine";
import { latexToPlain } from "@/lib/exam/engine/plainText";

export type PracticeBlock = { type: string; title: string; content: string };

const WORKED_EXAMPLES = 3;
const PRACTICE_SETS = 3;
const QUESTIONS_PER_SET = 2;
const EXAM_QUESTIONS = 1;
const TOTAL_QUESTIONS = WORKED_EXAMPLES + PRACTICE_SETS * QUESTIONS_PER_SET + EXAM_QUESTIONS; // 10 = engine maximum

/** "28.000000" -> "28", "1.50" -> "1.5"; leaves values like "1.33 ohm" and "0.333 mol dm-3" alone. */
export function tidyAnswer(text: string): string {
  return text.replace(/(\d+\.\d*?)0+(?=\s|$|[^\d])/g, "$1").replace(/(\d+)\.(?=\s|$|[^\d])/g, "$1");
}

type EngineQuestion = ReturnType<typeof buildEngineExam> extends infer E ? (E extends { questions: Array<infer Q> } ? Q : never) : never;

/** A person writes "x + 3y", not "1x + 3y": drop a lone coefficient of 1 in front of a variable. */
export function tidyAlgebra(text: string): string {
  return text.replace(/(^|[\s(+\-=−])1([a-z])(?![a-z0-9])/g, "$1$2");
}

const answerOf = (q: EngineQuestion) => tidyAnswer(formatAnswer(q.numeric!));
const plainQuestion = (q: EngineQuestion) => latexToPlain(q.question).replace(/\s+/g, " ").trim();
const plainWorking = (q: EngineQuestion) => (q.modelAnswer ?? "").split("\n").slice(1).map((line) => latexToPlain(line).trim()).filter(Boolean);

export function hasEnginePractice(subject: string, topic: string): boolean {
  return matchGenerators(subject, topic).length > 0;
}

/** Worked examples, practice sets with answers, common mistakes and one exam-style question. Null if the engine has no match. */
export function buildEnginePracticeBlocks(subject: string, topic: string, seed?: number): { blocks: PracticeBlock[]; questions: number } | null {
  if (!hasEnginePractice(subject, topic)) return null;
  const exam = buildEngineExam({ subject, topic, difficulty: "medium", count: TOTAL_QUESTIONS, seed });
  if (!exam || exam.questions.length < TOTAL_QUESTIONS) return null;
  const qs = exam.questions;
  // Only maths text uses "1x"-style coefficients; leave chemistry and computing wording untouched.
  const fix = /math/i.test(subject) ? tidyAlgebra : (text: string) => text;
  const questionOf = (q: EngineQuestion) => fix(plainQuestion(q));
  const workingOf = (q: EngineQuestion) => plainWorking(q).map(fix);

  const blocks: PracticeBlock[] = [];
  let cursor = 0;

  for (let i = 0; i < WORKED_EXAMPLES; i++) {
    const q = qs[cursor++];
    const steps = workingOf(q);
    blocks.push({
      type: "example",
      title: `Worked example ${i + 1}`,
      content: `${questionOf(q)}\n\nWorking:\n${(steps.length ? steps : ["Apply the method for this question type."]).map((s, n) => `${n + 1}. ${s}`).join("\n")}\n\nAnswer: ${answerOf(q)}`,
    });
  }

  for (let s = 0; s < PRACTICE_SETS; s++) {
    const set = qs.slice(cursor, cursor + QUESTIONS_PER_SET);
    cursor += QUESTIONS_PER_SET;
    blocks.push({
      type: "practice",
      title: `Practice set ${s + 1}`,
      content: `Try these without looking at the answers.\n${set.map((q, n) => `${n + 1}. ${questionOf(q)}`).join("\n")}\n\nAnswers (check after you have tried): ${set.map((q, n) => `${n + 1}) ${answerOf(q)}`).join("   ")}`,
    });
  }

  // The engine knows the classic wrong answers for each question type and why students make them.
  const seen = new Set<string>();
  const hints: string[] = [];
  for (const q of qs) {
    for (const m of q.numeric?.mistakes ?? []) {
      const hint = (m.hint ?? "").trim();
      if (hint && !seen.has(hint)) { seen.add(hint); hints.push(hint); }
    }
  }
  if (hints.length) {
    blocks.push({
      type: "misconception",
      title: "Common mistakes to avoid",
      content: `These are the slips students most often make on this kind of question:\n${hints.slice(0, 6).map((h, n) => `${n + 1}. ${h}`).join("\n")}`,
    });
  }

  const exam1 = qs[cursor++];
  const marks = typeof exam1.marks === "number" ? ` (${exam1.marks} mark${exam1.marks === 1 ? "" : "s"})` : "";
  blocks.push({
    type: "exam",
    title: "Exam-style question",
    content: `Answer this as you would in an exam, showing your working${marks}:\n${questionOf(exam1)}\n\nAnswer: ${answerOf(exam1)}\nWorking:\n${workingOf(exam1).map((s, n) => `${n + 1}. ${s}`).join("\n")}`,
  });

  return { blocks, questions: qs.length };
}

/** A complete practice-only lesson (for topics with no matching syllabus guide, e.g. ZIMSEC or no configured curriculum). */
export function wrapPracticeLesson(subject: string, topic: string, practice: { blocks: PracticeBlock[]; questions: number }): { title: string; blocks: PracticeBlock[] } {
  const label = subject.trim() || "this subject";
  return {
    title: `Worked practice: ${topic.trim()}`,
    blocks: [
      {
        type: "objective",
        title: "What this lesson is",
        content:
          `AI lesson generation is unavailable right now, so this lesson is built from the app's ${label} question engine instead. ` +
          `It gives you ${practice.questions} fresh questions on "${topic.trim()}": worked examples with full working, practice sets with answers, ` +
          `the mistakes students most often make, and an exam-style question. Every number is computed, so the working and answers are always correct. ` +
          `It has no theory notes, so use your textbook or class notes alongside it.`,
      },
      ...practice.blocks,
      {
        type: "summary",
        title: "What to do next",
        content:
          `Redo the three practice sets until you can get every answer without looking at the working. ` +
          `Ask for this lesson again any time: the numbers change each time, so you always get new questions to try. ` +
          `Then try an exam-style question under time and mark it against the working.`,
      },
    ],
  };
}
