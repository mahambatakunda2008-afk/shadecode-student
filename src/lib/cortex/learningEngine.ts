import type { CortexSnapshot } from "@/lib/types";

export function generateLearningFocus(snapshot: CortexSnapshot) {
  const weakest = snapshot.weakestSubjects ?? [];

  if (weakest.length === 0) {
    return {
      focus: "Maintain balance across all subjects",
      prioritySubjects: snapshot.subjects.slice(0, 3),
    };
  }

  return {
    focus: `Strengthen weak areas: ${weakest.join(", ")}`,
    prioritySubjects: weakest,
  };
}
