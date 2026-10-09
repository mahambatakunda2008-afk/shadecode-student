import { describe, expect, it } from "vitest";
import { buildEngineExam, formatAnswer } from "@/lib/exam/engine";
import type { ExamAnswer, ExamQuestion } from "@/lib/exam/types";
import { sanitizeQuestions } from "./questions";
import { isDeterministicPaper, markAgainstKey, splitPaper } from "./serverMarking";

function engineQuestions(subject = "Physics", topic = "Kinematics", seed = 11): ExamQuestion[] {
  const exam = buildEngineExam({ subject, topic, difficulty: "medium", count: 5, seed })!;
  return sanitizeQuestions(exam.questions)!; // what the freeze actually stores: renumbered 1..n, numeric kept
}

describe("splitPaper", () => {
  it("leaves no answer material in the play set", () => {
    const questions = engineQuestions();
    const { playSet, key } = splitPaper(questions);
    const text = JSON.stringify(playSet);
    expect(text).not.toMatch(/"numeric"|"exact"|"tolerance"|"modelAnswer"|"markingCriteria"/);
    for (const question of questions) expect(text).not.toContain(question.modelAnswer!.split("\n")[0] + "\\n");
    expect(key).toHaveLength(5);
    expect(key.every((entry) => entry.numeric)).toBe(true);
    // The question text players need is intact.
    expect(playSet.map((q) => q.question)).toEqual(questions.map((q) => q.question));
  });
});

describe("markAgainstKey", () => {
  const questions = engineQuestions("Chemistry", "moles", 21);
  const { playSet, key } = splitPaper(questions);
  const correct: ExamAnswer[] = questions.map((q) => ({ questionId: q.id, answer: `ans = ${formatAnswer(q.numeric!)}`, timeSpent: 8 }));

  it("marks correct answers fully and tags the result as server-marked", () => {
    const marked = markAgainstKey(playSet, key, correct, 120)!;
    expect(marked.percentage).toBe(100);
    expect(marked.source).toBe("server");
    expect(marked.results.every((r) => r.correct)).toBe(true);
    expect(marked.timeTaken).toBe(120);
  });

  it("scores wrong, blank and unknown-id answers as zero", () => {
    const wrong = questions.map((q) => ({ questionId: q.id, answer: "99999.123", timeSpent: 1 }));
    expect(markAgainstKey(playSet, key, wrong, 10)!.percentage).toBe(0);
    expect(markAgainstKey(playSet, key, [], 10)!.percentage).toBe(0);
    const spoofed: ExamAnswer[] = [{ questionId: 9999, answer: formatAnswer(questions[0].numeric!), timeSpent: 1 }];
    expect(markAgainstKey(playSet, key, spoofed, 10)!.percentage).toBe(0);
  });

  it("cannot be inflated by number-spraying or a copied key from another paper", () => {
    const spray = questions.map((q) => ({ questionId: q.id, answer: "1 2 3 4 5 6 7 8 9 10", timeSpent: 1 }));
    expect(markAgainstKey(playSet, key, spray, 10)!.percentage).toBe(0);
    const other = splitPaper(engineQuestions("Chemistry", "moles", 22)).key;
    expect(markAgainstKey(playSet, other, correct, 10)!.percentage).toBeLessThan(100);
  });

  it("clamps absurd times and drops unusable input safely", () => {
    expect(markAgainstKey(playSet, key, correct, -50)!.timeTaken).toBe(0);
    expect(markAgainstKey(playSet, key, [{ questionId: questions[0].id, answer: "x".repeat(5000), timeSpent: 1e12 }], 10)).not.toBeNull();
  });
});

describe("isDeterministicPaper", () => {
  const written: ExamQuestion = { id: 1, type: "short_answer", question: "Explain osmosis.", marks: 3, topic: "Cells", modelAnswer: "Water moves across a membrane." };
  const mcq: ExamQuestion = { id: 2, type: "multiple_choice", question: "2+2?", options: ["3", "4"], marks: 1, topic: "Arithmetic", modelAnswer: "4" };

  it("accepts numeric and multiple-choice papers and rejects anything needing judgement", () => {
    expect(isDeterministicPaper(engineQuestions())).toBe(true);
    expect(isDeterministicPaper([mcq])).toBe(true);
    expect(isDeterministicPaper([mcq, written])).toBe(false);
    expect(isDeterministicPaper([])).toBe(false);
  });

  it("marks multiple choice against the private key", () => {
    const { playSet, key } = splitPaper([mcq]);
    expect(JSON.stringify(playSet)).not.toContain("modelAnswer");
    expect(markAgainstKey(playSet, key, [{ questionId: 2, answer: "4", timeSpent: 1 }], 5)!.percentage).toBe(100);
    expect(markAgainstKey(playSet, key, [{ questionId: 2, answer: "3", timeSpent: 1 }], 5)!.percentage).toBe(0);
  });
});
