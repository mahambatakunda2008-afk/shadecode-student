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
