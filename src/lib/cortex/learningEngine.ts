import type { CortexSnapshot } from "@/lib/types";

export function generateLearningFocus(snapshot: CortexSnapshot) {
  const weakest = snapshot.weakestSubjects ?? [];

  const curriculum = (snapshot as any).curriculumCompletionPercent !== undefined ? {
    completionPercent: (snapshot as any).curriculumCompletionPercent,
    currentLesson: (snapshot as any).currentLesson ?? null,
    recommendedNextLesson: (snapshot as any).recommendedNextLesson ?? null,
    completedLessonCount: (snapshot as any).completedLessonCount ?? 0,
    lockedLessonCount: (snapshot as any).lockedLessonCount ?? 0,
  } : null;

  if (weakest.length === 0) {
    return {
      focus: "Maintain balance across all subjects",
      prioritySubjects: snapshot.subjects.slice(0, 3),
      curriculum,
    };
  }

  return {
    focus: `Strengthen weak areas: ${weakest.join(", ")}`,
    prioritySubjects: weakest,
    curriculum,
  };
}
