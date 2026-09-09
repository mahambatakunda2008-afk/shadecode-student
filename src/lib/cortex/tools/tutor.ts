/**
 * /lib/cortex/tools/tutor.ts
 *
 * Deterministic tutoring responses used by CortexCore's "learn" intent.
 * No external dependencies, so /api/cortex remains usable without AI keys.
 * Curriculum-aware: only verified curriculum context is authoritative.
 */

import type { SystemCurriculumContext } from "@/lib/curriculum/system-curriculum-context";

export interface TutoringContext {
  level?: number;
  streak?: number;
  weakTopics?: string[];
  snapshot?: {
    recommendedNextLesson?: { id: string; title: string } | null;
    curriculumCompletionPercent?: number;
  } | null;
  curriculum?: SystemCurriculumContext | null;
}

function uniqueTitles(items: SystemCurriculumContext["knowledge"]["items"]): string[] {
  return [...new Set(items.map((item) => item.title?.trim()).filter((title): title is string => Boolean(title)))];
}

function curriculumNote(context: SystemCurriculumContext | null | undefined): string {
  if (!context || context.knowledge.items.length === 0) return "";

  const { identity } = context;
  const topics = uniqueTitles(context.required).slice(0, 6);
  const assessment = uniqueTitles(context.assessment).slice(0, 4);
  const parts = [
    ` Curriculum: ${identity.boardId} ${identity.qualificationId}, ${identity.syllabusId} ${identity.syllabusVersion}, ${identity.subjectId}.`,
  ];

  if (topics.length) parts.push(` Verified curriculum areas available: ${topics.join(", ")}.`);
  if (assessment.length) parts.push(` Verified assessment context available: ${assessment.join(", ")}.`);
  parts.push(" Use this curriculum only as authoritative verified context; do not invent missing syllabus requirements.");
  return parts.join("");
}

export async function generateTutoringResponse(
  topic: string,
  context: TutoringContext = {},
): Promise<string> {
  const safeTopic = String(topic ?? "").trim() || "this topic";
  const level = context.level ?? 1;
  const recommended = context.snapshot?.recommendedNextLesson?.title;
  const curriculum = curriculumNote(context.curriculum);

  const lead = `Let's work through ${safeTopic}.`;
  const levelNote =
    level >= 5
      ? " We'll move at an advanced pace and focus on edge cases."
      : level >= 2
        ? " We'll build on what you already know and add depth."
        : " We'll start with the fundamentals and build up step by step.";
  const nextNote = recommended
    ? ` When you're ready, your recommended next lesson is "${recommended}".`
    : "";

  return `${lead}${levelNote}${curriculum}${nextNote}`;
}
