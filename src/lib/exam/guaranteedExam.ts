/**
 * src/lib/exam/guaranteedExam.ts
 *
 * The paper students get when live AI generation is unavailable or too slow.
 * Tier 1: the deterministic engine (parametrised, exactly marked, instant, offline).
 * Tier 2: hand-written curated questions.
 * Otherwise null, so callers show an honest message instead of fabricated content.
 */

import type { GeneratedExam } from "@/lib/cortex/examGenerator";
import { buildEngineExam, matchGenerators } from "./engine";
import { buildCuratedFallbackExam, curatedBankSize } from "./fallbackExam";

/**
 * The largest paper the built-in content can honestly fill for this subject and topic, or null when it does not
 * cap the size (the engine generates any size, and a topic with no built-in content is left to AI). Comma-separated
 * topics get equal shares, so the smallest topic sets the limit. The exam setup uses this to offer only sizes that
 * can be built, so a student never meets an "incomplete paper" error for a choice the screen allowed.
 */
export function builtInCapacity(subject: string, topicText: string, difficulty?: string): number | null {
  const parts = topicText.split(/[,;+]/).map((part) => part.trim()).filter(Boolean);
  const topics = parts.length ? parts : [""];
  let smallest = Infinity;
  for (const topic of topics) {
    if (matchGenerators(subject, topic, difficulty).length > 0) continue;
    const size = curatedBankSize(subject, topic, difficulty);
    if (size === null) return null;
    smallest = Math.min(smallest, size);
  }
  return Number.isFinite(smallest) ? smallest * topics.length : null;
}

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
