import { describe, expect, it } from "vitest";
import { sanitizeQuestions } from "@/lib/challenge/questions";
import { markExamOffline } from "@/lib/local-first/exam-marker";
import type { ExamAnswer, ExamQuestion } from "@/lib/exam/types";
import { buildGuaranteedExam } from "../guaranteedExam";
import { buildEngineExam, engineSubjectFor, formatAnswer, matchGenerators } from "./index";

describe("engineSubjectFor", () => {
  it("maps common subject names and refuses unrelated syllabi", () => {
    expect(engineSubjectFor("A Level Physics")).toBe("Physics");
    expect(engineSubjectFor("Maths")).toBe("Mathematics");
    expect(engineSubjectFor("IGCSE Computer Science")).toBe("Computer Science");
    expect(engineSubjectFor("Further Mathematics")).toBeNull();
    expect(engineSubjectFor("Biology")).toBeNull();
  });
});

describe("matchGenerators", () => {
  it("matches by topic vocabulary and never crosses topics", () => {
    expect(matchGenerators("Mathematics", "quadratics").map((g) => g.id)).toEqual(expect.arrayContaining(["maths.quadratic-roots", "maths.discriminant"]));
    expect(matchGenerators("Physics", "Kinematics").every((g) => g.topic === "Kinematics")).toBe(true);
    expect(matchGenerators("Chemistry", "moles").length).toBeGreaterThanOrEqual(3);
    expect(matchGenerators("Physics", "Magnetism")).toEqual([]);
  });
  it("uses the whole subject for generic or empty topics", () => {
    const all = matchGenerators("Physics", "");
    expect(all.length).toBeGreaterThanOrEqual(10);
    expect(matchGenerators("Physics", "core concepts")).toEqual(all);
  });
});

describe("buildEngineExam", () => {
  it("rebuilds the identical paper from the same seed", () => {
    const a = buildEngineExam({ subject: "Physics", topic: "Kinematics", difficulty: "medium", count: 6, seed: 42 });
    const b = buildEngineExam({ subject: "Physics", topic: "Kinematics", difficulty: "medium", count: 6, seed: 42 });
    expect(a).toEqual(b);
    expect(a?.questions.every((q) => q.id.startsWith("fallback_eng_42_") && q.numeric && q.type === "short_answer")).toBe(true);
    expect(buildEngineExam({ subject: "Physics", topic: "Kinematics", difficulty: "medium", count: 6, seed: 43 })).not.toEqual(a);
  });
  it("clamps the count, keeps questions distinct and totals marks", () => {
    const exam = buildEngineExam({ subject: "Mathematics", topic: "", difficulty: "hard", count: 50, seed: 7 })!;
    expect(exam.questions).toHaveLength(20);
    expect(new Set(exam.questions.map((q) => q.question)).size).toBe(20);
    expect(exam.totalMarks).toBe(exam.questions.reduce((s, q) => s + q.marks, 0));
    expect(exam.questions.every((q) => q.difficulty === "hard")).toBe(true);
  });
  it("returns null when it cannot cover the topic honestly", () => {
    expect(buildEngineExam({ subject: "Physics", topic: "Magnetism", difficulty: "medium", count: 5 })).toBeNull();
    expect(buildEngineExam({ subject: "Biology", topic: "Cells", difficulty: "medium", count: 5 })).toBeNull();
  });
});

describe("marking an engine paper end to end", () => {
  const exam = buildEngineExam({ subject: "Chemistry", topic: "moles", difficulty: "medium", count: 8, seed: 99 })!;
  const questions = exam.questions.map((q, i) => ({ ...q, id: i + 1 })) as unknown as ExamQuestion[];

  it("gives full marks for correct answers however the student writes them", () => {
    const answers: ExamAnswer[] = exam.questions.map((q, i) => ({ questionId: i + 1, answer: `= ${formatAnswer(q.numeric!)} (working: ...)`, timeSpent: 10 }));
    const result = markExamOffline(questions, answers, 100);
    expect(result.percentage).toBe(100);
    expect(result.grade).toBe("A*");
  });
  it("gives zero for blank or wrong answers", () => {
    const wrong: ExamAnswer[] = exam.questions.map((_, i) => ({ questionId: i + 1, answer: "12345.6789", timeSpent: 10 }));
    expect(markExamOffline(questions, wrong, 100).percentage).toBeLessThan(15);
    expect(markExamOffline(questions, [], 100).percentage).toBe(0);
  });
});

describe("buildGuaranteedExam", () => {
  it("prefers the engine, falls back to curated questions, and otherwise returns null", () => {
    expect(buildGuaranteedExam("Physics", "Kinematics", "medium", 5)?.questions[0].id).toMatch(/^fallback_eng_/);
    expect(buildGuaranteedExam("Biology", "Zzz unknown topic", "medium", 5)).toBeNull();
  });
});

describe("battle question sanitiser", () => {
  it("keeps a valid numeric spec and drops a malformed one", () => {
    const base = { id: 1, type: "short_answer", question: "Find x.", marks: 2, topic: "Algebra" };
    expect(sanitizeQuestions([{ ...base, numeric: { exact: 12.5, tolerance: 0.05, unit: "m" } }])?.[0].numeric).toEqual({ exact: 12.5, tolerance: 0.05, unit: "m" });
    expect(sanitizeQuestions([{ ...base, numeric: { exact: "x", tolerance: 1 } }])?.[0].numeric).toBeUndefined();
    expect(sanitizeQuestions([{ ...base, numeric: { exact: 1, tolerance: -1 } }])?.[0].numeric).toBeUndefined();
  });
});

describe("the shape the client keeps in state", () => {
  it("survives the client-side id/field mapping and is still marked exactly offline", () => {
    const exam = buildGuaranteedExam("Physics", "Kinematics", "medium", 4, 123)!;
    // Mirrors ExamWorkspace's fallback mapping: renumbered ids, explicit field pick, numeric preserved.
    const mapped = exam.questions.map((q, idx) => ({ id: idx + 1, type: q.type, question: q.question, options: q.options, marks: q.marks, topic: q.topic, modelAnswer: q.modelAnswer, markingCriteria: q.markingCriteria, numeric: q.numeric })) as unknown as ExamQuestion[];
    const answers: ExamAnswer[] = mapped.map((q, i) => ({ questionId: i + 1, answer: formatAnswer(q.numeric!), timeSpent: 5 }));
    expect(markExamOffline(mapped, answers, 60).percentage).toBe(100);
  });
  it("keeps the numeric spec through the battle freeze even when ids are strings", () => {
    const exam = buildEngineExam({ subject: "Chemistry", topic: "moles", difficulty: "medium", count: 5, seed: 3 })!;
    const frozen = sanitizeQuestions(exam.questions);
    expect(frozen).toHaveLength(5);
    expect(frozen?.every((q) => q.numeric && typeof q.id === "number")).toBe(true);
  });
});
