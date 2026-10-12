import { describe, expect, it } from "vitest";
import type { ExamQuestion, ExamResult } from "@/lib/exam/types";
import { MAX_SIGNALS_PER_REQUEST, sanitizeSignal, sanitizeSignals, signalsFromMarkedPaper } from "./signals";

describe("sanitizeSignal", () => {
  const good = { kind: "question", source: "engine", item_key: "physics.suvat-v", correct: false, score: 0, mistake_id: "forgot-initial-speed", time_spent_seconds: 41.6, props: { topic: "Kinematics", marks: 2 } };

  it("keeps a well-formed signal and rounds seconds", () => {
    expect(sanitizeSignal(good)).toMatchObject({ kind: "question", source: "engine", item_key: "physics.suvat-v", correct: false, mistake_id: "forgot-initial-speed", time_spent_seconds: 42 });
  });
  it("rejects unknown kinds and sources and non-objects", () => {
    expect(sanitizeSignal({ ...good, kind: "hack" })).toBeNull();
    expect(sanitizeSignal({ ...good, source: "ouija" })).toBeNull();
    expect(sanitizeSignal(null)).toBeNull();
    expect(sanitizeSignal("x")).toBeNull();
  });
  it("bounds every field and drops hostile props", () => {
    const signal = sanitizeSignal({ ...good, item_key: "x".repeat(500), score: 9999, time_spent_seconds: 1e9, props: { "bad key!": 1, ok: "y".repeat(500), nested: { a: 1 }, n: Infinity } })!;
    expect(signal.item_key).toHaveLength(80);
    expect(signal.score).toBe(100);
    expect(signal.time_spent_seconds).toBeNull();
    expect(Object.keys(signal.props)).toEqual(["ok"]);
    expect((signal.props.ok as string).length).toBe(80);
  });
});

describe("sanitizeSignals", () => {
  it("caps the batch and drops invalid entries", () => {
    const many = Array.from({ length: 200 }, () => ({ kind: "question", source: "engine" }));
    expect(sanitizeSignals(many)).toHaveLength(MAX_SIGNALS_PER_REQUEST);
    expect(sanitizeSignals([{ kind: "question", source: "engine" }, { nope: true }])).toHaveLength(1);
    expect(sanitizeSignals("not an array")).toEqual([]);
  });
});

describe("signalsFromMarkedPaper", () => {
  const questions = [
    { id: 1, type: "short_answer", question: "q", marks: 2, topic: "Kinematics", numeric: { exact: 5, tolerance: 0.1, generator: "physics.suvat-v" } },
    { id: 2, type: "multiple_choice", question: "q", options: ["a", "b"], marks: 1, topic: "Arithmetic", modelAnswer: "a" },
    { id: 3, type: "essay", question: "q", marks: 6, topic: "Cells" },
  ] as unknown as ExamQuestion[];
  const results: ExamResult[] = [
    { questionId: 1, score: 0, maxScore: 2, correct: false, feedback: "", modelAnswer: "", topic: "Kinematics", mistakeId: "forgot-initial-speed", timeSpent: 30 },
    { questionId: 2, score: 1, maxScore: 1, correct: true, feedback: "", modelAnswer: "", topic: "Arithmetic" },
    { questionId: 3, score: 3, maxScore: 6, correct: false, feedback: "", modelAnswer: "", topic: "Cells" },
    { questionId: 99, score: 1, maxScore: 1, correct: true, feedback: "", modelAnswer: "", topic: "Ghost" },
  ];

  it("tags the source, the generator and the diagnosed mistake, and ignores unknown questions", () => {
    const signals = signalsFromMarkedPaper(questions, results);
    expect(signals).toHaveLength(3);
    expect(signals[0]).toMatchObject({ source: "engine", item_key: "physics.suvat-v", correct: false, mistake_id: "forgot-initial-speed", score: 0, time_spent_seconds: 30 });
    expect(signals[1]).toMatchObject({ source: "curated", item_key: null, correct: true, score: 100 });
    expect(signals[2]).toMatchObject({ source: "ai", score: 50 });
  });
});
