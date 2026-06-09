import { CortexInsightContext, CortexEvent } from "@/lib/cortex/types";

function getLatestEvent(events: CortexEvent[]) {
  return events.at(-1) ?? null;
}

function getCompletionRate(snapshot: CortexInsightContext["snapshot"]) {
  if (snapshot.totalTasks === 0) {
    return 0;
  }

  return Math.round((snapshot.completedTasks / snapshot.totalTasks) * 100);
}

function formatGeneratedSchedule(event: CortexEvent) {
  const sessions = Number(event.data?.sessions ?? 0);
  const breaks = Number(event.data?.breaks ?? 0);
  return `Generated timetable contains ${sessions} study blocks and ${breaks} breaks.`;
}

function formatSavedSchedule(event: CortexEvent) {
  const sessions = Number(event.data?.sessions ?? 0);
  const breaks = Number(event.data?.breaks ?? 0);
  return `Saved timetable now tracks ${sessions} study blocks and ${breaks} breaks.`;
}

export function resolveDeterministicInsight(context: CortexInsightContext) {
  const latestEvent = getLatestEvent(context.events);
  const { snapshot } = context;
  const completionRate = getCompletionRate(snapshot);

  if (latestEvent?.type === "streak.updated") {
    const streak = Number(latestEvent.data?.streak ?? snapshot.streak);
    return `Study streak now spans ${streak} consecutive active days.`;
  }

  if (latestEvent?.type === "timetable.generated") {
    return formatGeneratedSchedule(latestEvent);
  }

  if (latestEvent?.type === "timetable.saved") {
    return formatSavedSchedule(latestEvent);
  }

  if (latestEvent?.type === "subject.created") {
    return "Subject coverage expanded within the active study plan.";
  }

  if (latestEvent?.type === "subject.deleted") {
    return "Subject coverage narrowed within the active study plan.";
  }

  if (latestEvent?.type === "task.created" && snapshot.pendingTasks >= 3) {
    return "Pending workload increased across current study subjects today.";
  }

  if (latestEvent?.type === "task.deleted") {
    return "Tracked workload decreased after recent task removal activity.";
  }

  if (latestEvent?.type === "task.completed" && snapshot.totalTasks > 0) {
    if (snapshot.completedTasks === snapshot.totalTasks) {
      return "All tracked tasks are currently marked complete today.";
    }

    if (completionRate >= 80) {
      return "Task completion remains high across the current study workload.";
    }

    return "Recent task completion increased overall study progress levels.";
  }

  if (snapshot.totalTasks === 0) {
    return "No task activity is currently available for analysis.";
  }

  if (snapshot.pendingTasks > snapshot.completedTasks) {
    return "Pending workload currently exceeds completed task activity levels.";
  }

  if (snapshot.completedTasks > snapshot.pendingTasks) {
    return "Completed task volume currently exceeds pending workload levels.";
  }

  if (snapshot.subjects.length === 1) {
    return "Study activity is concentrated within a single subject.";
  }

  // Curriculum-aware deterministic insight (fallback)
  if ((snapshot as any).curriculumCompletionPercent !== undefined) {
    const pct = (snapshot as any).curriculumCompletionPercent;
    const current = (snapshot as any).currentLesson?.title ?? null;
    const next = (snapshot as any).recommendedNextLesson?.title ?? null;
    return `Curriculum progress: ${pct}%${current ? ` — current: ${current}` : ''}${next ? ` — recommended next: ${next}` : ''}`;
  }

  // Curriculum-aware short insights (only if curriculum fields exist)
  const completion = (snapshot as any).curriculumCompletionPercent;
  const recommended = (snapshot as any).recommendedNextLesson?.title;
  const current = (snapshot as any).currentLesson?.title;
  const lockedCount = (snapshot as any).lockedLessonCount;
  const completedLessonCount = (snapshot as any).completedLessonCount;

  // Many locked lessons → recommend prerequisites
  if (typeof lockedCount === "number" && lockedCount > 3) {
    return "Several lessons remain locked. Completing prerequisite topics will unlock more content.";
  }

  if (typeof completion === "number") {
    if (completion < 50) {
      // Low completion → progression focus
      if (recommended) {
        return `You have completed ${completion}% of your curriculum. Continue with ${recommended}.`;
      }
      if (current) {
        return `You have completed ${completion}% of your curriculum. Continue with ${current}.`;
      }
      return `You have completed ${completion}% of your curriculum. Focus on progressing through unlocked lessons.`;
    }

    if (completion >= 80) {
      // Near completion → mastery and revision
      return `You have completed ${completion}% of your curriculum. Prioritize mastery and revision.`;
    }

    // Mid-range: mention recommended lesson if available
    if (recommended) {
      return `Your next recommended lesson is ${recommended}.`;
    }
  }

  // If we know a recommended lesson but have no completion number, mention it
  if (recommended) {
    return `Your next recommended lesson is ${recommended}.`;
  }

  // Fallback to previous behavior
  return null;
}
