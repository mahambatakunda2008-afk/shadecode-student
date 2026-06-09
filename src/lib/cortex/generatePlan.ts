import type { CortexSnapshot } from "@/lib/types";

export function generateStudyPlan(snapshot: CortexSnapshot) {
  const weak = snapshot.weakestSubjects ?? [];

  // Base tasks derived from weakest subjects (fallback behavior preserved)
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

  // Curriculum-aware signals (read only if present)
  const completion = (snapshot as any).curriculumCompletionPercent;
  const recommended = (snapshot as any).recommendedNextLesson;
  const currentLesson = (snapshot as any).currentLesson;
  const lockedCount = (snapshot as any).lockedLessonCount ?? 0;

  // 1) Prioritize recommended next lesson when available
  if (recommended) {
    tasks.unshift({
      title: `Continue lesson: ${recommended.title}`,
      priority: "critical",
      estimatedMinutes: 40,
      lessonId: recommended.id,
    });
  } else if (currentLesson) {
    // fallback: focus on current lesson if present
    tasks.unshift({
      title: `Work on current lesson: ${currentLesson.title}`,
      priority: "high",
      estimatedMinutes: 30,
      lessonId: currentLesson.id,
    });
  }

  // 2) Adapt plan based on completion percent
  if (typeof completion === "number") {
    if (completion < 50) {
      // Low completion → progression-focused
      tasks.push({
        title: "Progress through next unlocked lessons to build momentum",
        priority: "high",
        estimatedMinutes: 60,
      });
    } else if (completion >= 80) {
      // Near completion → mastery and revision
      tasks.push(
        {
          title: "Deep revision: consolidate recent lessons",
          priority: "high",
          estimatedMinutes: 50,
        },
        {
          title: "Mastery exercise: cumulative practice test",
          priority: "high",
          estimatedMinutes: 60,
        }
      );
    } else {
      // Mid-range → balanced approach
      tasks.push({
        title: "Balanced practice and progression",
        priority: "medium",
        estimatedMinutes: 45,
      });
    }
  }

  // 3) If many lessons are locked, recommend prerequisite completion
  if (lockedCount > 3) {
    tasks.unshift({
      title: "Complete prerequisite lessons to unlock more content",
      priority: "high",
      estimatedMinutes: 45,
    });
  }

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
