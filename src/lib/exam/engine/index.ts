/**
 * src/lib/exam/engine/index.ts
 *
 * Deterministic question engine. Builds a complete, correctly marked practice
 * paper from parametrised generators: no network, no model, no timeout.
 *
 * Papers carry a seed, so the same seed rebuilds the identical paper
 * (battles, server-side re-marking, bug reports).
 */

import type { ExamQuestion, GeneratedExam } from "@/lib/cortex/examGenerator";
import { tokenize } from "@/lib/topicMastery/resolver";
import { chemistryGenerators } from "./generators/chemistry";
import { computingGenerators } from "./generators/computing";
import { mathsGenerators } from "./generators/maths";
import { physicsGenerators } from "./generators/physics";
import { type NumericSpec } from "./numeric";
import { createRng, freshSeed } from "./rng";
import type { EngineSubject, QuestionGenerator } from "./types";

export const ALL_GENERATORS: QuestionGenerator[] = [...mathsGenerators, ...physicsGenerators, ...chemistryGenerators, ...computingGenerators];

const GENERIC_TOPIC_WORDS = new Set(["core", "concept", "general", "mixed", "all", "revision", "practice", "paper", "exam", "topic", "full", "past", "stated", "overview", "everything", "random", "quick", "test"]);

export function engineSubjectFor(subject: string): EngineSubject | null {
  const text = subject.toLowerCase();
  if (text.includes("further")) return null; // Further Mathematics is a different syllabus.
  if (/physic/.test(text)) return "Physics";
  if (/chem/.test(text)) return "Chemistry";
  if (/math/.test(text)) return "Mathematics";
  if (/comput|\bcs\b|\bict\b/.test(text)) return "Computer Science";
  return null;
}

export function matchGenerators(subject: string, topic: string): QuestionGenerator[] {
  const engineSubject = engineSubjectFor(subject);
  if (!engineSubject) return [];
  const pool = ALL_GENERATORS.filter((generator) => generator.subject === engineSubject);

  const topicTokens = tokenize(topic);
  if (!topicTokens.length || topicTokens.every((token) => GENERIC_TOPIC_WORDS.has(token))) return pool;

  return pool.filter((generator) => {
    const vocabulary = new Set([...generator.keywords, ...generator.topic.split(/\s+/)].flatMap((word) => tokenize(word)));
    return topicTokens.some((token) => vocabulary.has(token));
  });
}

/** Display form of the answer, honouring the rounding the question asked for. */
export function formatAnswer(spec: NumericSpec): string {
  const step = 10 ** Math.round(Math.log10(Math.max(spec.tolerance, 1e-9) * 2));
  const rounded = Math.round(spec.exact / step) * step;
  const decimals = Math.max(0, -Math.round(Math.log10(step)));
  return `${rounded.toFixed(decimals)}${spec.unit ? ` ${spec.unit.replace(/\^-?\d+/g, (power) => power.replace("^", "").replace(/-?\d/g, (c) => ({ "-": "⁻", "1": "¹", "2": "²", "3": "³" } as Record<string, string>)[c] ?? c))}` : ""}`;
}

export interface EngineExamOptions {
  subject: string;
  topic: string;
  difficulty: string;
  count: number;
  seed?: number;
}

export interface EngineExam extends GeneratedExam {
  seed: number;
}

export function buildEngineExam({ subject, topic, difficulty, count, seed = freshSeed() }: EngineExamOptions): EngineExam | null {
  const matched = matchGenerators(subject, topic);
  if (!matched.length) return null;

  const level: ExamQuestion["difficulty"] = difficulty === "hard" ? "hard" : difficulty === "easy" ? "easy" : "medium";
  const total = Math.max(1, Math.min(Math.round(Number(count) || 10), 20));
  const order = createRng(seed).shuffle(matched);
  const seen = new Set<string>();
  const questions: ExamQuestion[] = [];

  for (let index = 0; index < total; index++) {
    const generator = order[index % order.length];
    let built = generator.build(createRng(seed + index * 7919));
    for (let retry = 1; seen.has(built.question) && retry <= 8; retry++) built = generator.build(createRng(seed + index * 7919 + retry * 104729));
    seen.add(built.question);

    const answer = formatAnswer(built.numeric);
    questions.push({
      id: `fallback_eng_${seed}_${index + 1}`,
      type: "short_answer",
      question: built.question,
      marks: built.marks,
      topic: generator.topic,
      difficulty: level,
      modelAnswer: `${answer}\n${built.working.join("\n")}`,
      markingCriteria: `Award full marks for ${answer} (any correct rounding is accepted).`,
      numeric: built.numeric,
    });
  }

  const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);
  const topics = [...new Set(questions.map((question) => question.topic))];
  return {
    subject,
    title: `${subject}${topic.trim() ? ` · ${topic.trim()}` : ""} Practice Paper`,
    questions,
    totalMarks,
    durationMinutes: Math.max(5, Math.round(totalMarks * 2.5)),
    difficulty: level,
    topics,
    seed,
  };
}
