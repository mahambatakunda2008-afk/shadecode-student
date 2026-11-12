/**
 * /lib/cortex/tools/tutor.ts
 *
 * Deterministic tutoring responses used by CortexCore's "learn" intent.
 * No external dependencies, so /api/cortex remains usable without AI keys.
 * Curriculum-aware: only verified curriculum context is authoritative.
 */

import type { SystemCurriculumContext } from "@/lib/curriculum/system-curriculum-context";
import type { CortexStudentContext } from "@/lib/cortex/student-context";

export interface TutoringContext {
  level?: number;
  streak?: number;
  weakTopics?: string[];
  snapshot?: {
    recommendedNextLesson?: { id: string; title: string } | null;
    curriculumCompletionPercent?: number;
  } | null;
  curriculum?: SystemCurriculumContext | null;
  studentContext?: CortexStudentContext | null;
  subjectId?: string;
  subjectName?: string;
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

function learnerContinuityNote(
  context: TutoringContext,
  topic: string,
): string {
  const subjectKeys = [context.subjectId, context.subjectName]
    .map((value) => value?.trim().toLocaleLowerCase())
    .filter((value): value is string => Boolean(value));
  if (!context.studentContext || subjectKeys.length === 0) return "";

  const normalizedTopic = topic.trim().toLocaleLowerCase();
  const activeSyllabusId = context.curriculum?.identity.syllabusId;
  if (!activeSyllabusId) return "";

  const notes: string[] = [];
  const profile = context.studentContext.profile;
  const practiceMatches =
    profile.lastPracticeTopic?.trim().toLocaleLowerCase() === normalizedTopic &&
    Boolean(profile.lastPracticeSubject?.trim()) &&
    subjectKeys.includes(profile.lastPracticeSubject!.trim().toLocaleLowerCase()) &&
    profile.lastPracticeSyllabusId === activeSyllabusId &&
    typeof profile.lastPracticeScore === "number" &&
    Number.isFinite(profile.lastPracticeScore);

  if (practiceMatches) {
    notes.push(
      `Your latest recorded practice score for this topic in this subject and syllabus was ${profile.lastPracticeScore}%. Treat it as one result, not proof of mastery.`
    );
  }

  const evidence = context.studentContext.topics.items.find((item) =>
    item.topicId.trim().toLocaleLowerCase() === normalizedTopic &&
    subjectKeys.includes(item.subjectKey.trim().toLocaleLowerCase()) &&
    item.syllabusId === activeSyllabusId &&
    item.attempts > 0
  );
  if (evidence) {
    notes.push(
      `I have ${evidence.attempts} recorded learning attempts for this topic in this subject, so I'll build on that history rather than assume this is your first encounter.`
    );
  }

  const repeatedErrors = context.studentContext.mistakes.repeatedTopicErrors.find((item) =>
    item.topicId.trim().toLocaleLowerCase() === normalizedTopic &&
    subjectKeys.includes(item.subjectKey.trim().toLocaleLowerCase())
  );
  if (repeatedErrors) {
    notes.push(
      `Your syllabus-scoped records show ${repeatedErrors.incorrectResponses} incorrect responses across ${repeatedErrors.distinctAttempts} separate attempts on this topic. I'll focus on the reasoning steps that need another look.`
    );
  }

  const recurringMistake = context.studentContext.mistakes.recurringMistakes.find((item) =>
    item.topicId.trim().toLocaleLowerCase() === normalizedTopic &&
    subjectKeys.includes(item.subjectKey.trim().toLocaleLowerCase())
  );
  if (recurringMistake) {
    notes.push(
      `A diagnosed error pattern has recurred across ${recurringMistake.distinctAttempts} separate attempts, so I'll pay particular attention to that step without assuming the same cause explains every answer.`
    );
  }

  const retrieval = context.studentContext.spacedRetrieval.topics.find((item) =>
    item.topicId.trim().toLocaleLowerCase() === normalizedTopic &&
    subjectKeys.includes(item.subjectKey.trim().toLocaleLowerCase())
  );
  if (retrieval) {
    notes.push(
      `You've retrieved this topic across ${retrieval.distinctAttempts} separate attempts over ${retrieval.observedSpanDays} days. That's useful study history, not a guarantee of mastery.`
    );
  }

  return notes.length ? ` ${notes.join(" ")}` : "";
}

export async function generateTutoringResponse(
  topic: string,
  context: TutoringContext = {},
): Promise<string> {
  const safeTopic = String(topic ?? "").trim() || "this topic";
  const level = context.level ?? 1;
  const recommended = context.snapshot?.recommendedNextLesson?.title;
  const curriculum = curriculumNote(context.curriculum);
  const continuity = learnerContinuityNote(context, safeTopic);

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

  return `${lead}${levelNote}${curriculum}${continuity}${nextNote}`;
}
