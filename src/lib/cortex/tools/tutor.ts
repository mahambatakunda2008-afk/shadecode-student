/**
 * /lib/cortex/tools/tutor.ts
 *
 * Deterministic tutoring responses used by CortexCore's "learn" intent.
 * No external dependencies — keeps /api/cortex functional without AI keys.
 */

export interface TutoringContext {
  level?: number;
  streak?: number;
  weakTopics?: string[];
  snapshot?: {
    recommendedNextLesson?: { id: string; title: string } | null;
    curriculumCompletionPercent?: number;
  } | null;
}

export async function generateTutoringResponse(
  topic: string,
  context: TutoringContext = {}
): Promise<string> {
  const safeTopic = String(topic ?? "").trim() || "this topic";
  const level = context.level ?? 1;
  const recommended = context.snapshot?.recommendedNextLesson?.title;

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

  return `${lead}${levelNote}${nextNote}`;
}
