import type { CortexSnapshot } from "@/lib/types";

export function generateStudyPlan(snapshot: CortexSnapshot) {
  const weak = snapshot.weakestSubjects ?? [];

  const tasks = weak.flatMap((subject) => [
    {
      title: `Revise core concepts in ${subject}`,
      priority: "high",
      estimatedMinutes: 30,
    },
    {
      title: `Practice exam questions in ${subject}`,
      priority: "high",
      estimatedMinutes: 45,
    },
  ]);

  const timetableSuggestion = weak.map((subject, i) => ({
    day: i % 7,
    subject,
    duration: 60,
  }));

  return {
    tasks,
    timetableSuggestion,
  };
}
