/**
 * src/lib/exam/guaranteedExam.ts
 *
 * The paper students get when live AI generation is unavailable or too slow.
 * Tier 1: the deterministic engine (parametrised, exactly marked, instant, offline).
 * Tier 2: hand-written curated questions.
 * Otherwise null, so callers show an honest message instead of fabricated content.
 */

import type { GeneratedExam } from "@/lib/cortex/examGenerator";
import { buildEngineExam } from "./engine";
import { buildCuratedFallbackExam } from "./fallbackExam";

export function buildGuaranteedExam(subject: string, topic: string, difficulty: string, count: number, seed?: number): GeneratedExam | null {
  const engine = buildEngineExam({ subject, topic, difficulty, count, seed });
  if (engine) return engine;
  return buildCuratedFallbackExam(subject, topic, difficulty, count);
}


/**
 * Build an offline paper across every selected topic. Each topic receives an
 * equal share (the remainder goes to the earliest selections); if any topic
 * lacks enough genuine questions, fail instead of silently dropping coverage.
 */
export function buildGuaranteedExamForTopics(
  subject: string,
  topics: string[],
  difficulty: string,
  count: number,
  seed?: number,
): GeneratedExam | null {
  const total = Math.max(1, Math.min(Math.round(Number(count) || 10), 20));
  const selected = [...new Set(topics.map((topic) => topic.trim()).filter(Boolean))];
  if (!selected.length) return buildGuaranteedExam(subject, "", difficulty, total, seed);
  if (selected.length > total) return null;

  const base = Math.floor(total / selected.length);
  const remainder = total % selected.length;
  const questions: GeneratedExam["questions"] = [];

  for (let index = 0; index < selected.length; index += 1) {
    const allocation = base + (index < remainder ? 1 : 0);
    const paper = buildGuaranteedExam(
      subject,
      selected[index],
      difficulty,
      allocation,
      seed === undefined ? undefined : seed + index * 104729,
    );
    if (!paper || paper.questions.length !== allocation) return null;
    questions.push(...paper.questions.map((question, questionIndex) => ({
      ...question,
      id: `offline_multi_${index + 1}_${questionIndex + 1}_${question.id}`,
    })));
  }

  if (questions.length !== total) return null;
  const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);
  return {
    subject,
    title: `${subject} · ${selected.join(" + ")} Practice Paper`,
    questions,
    totalMarks,
    durationMinutes: Math.max(5, Math.round(totalMarks * 2.5)),
    difficulty,
    topics: [...new Set(questions.map((question) => question.topic))],
  };
}
