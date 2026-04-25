import { CortexEvent, CortexInsightContext, CortexSnapshot } from "@/lib/cortex/types";
import { resolveDeterministicInsight } from "@/lib/cortex/runtime/templates";

function sortObject<T extends Record<string, unknown>>(value: T) {
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = value[key];
      return acc;
    }, {});
}

function normalizeEvents(events: CortexEvent[]) {
  return events.map((event) => ({
    type: event.type,
    source: event.source,
    data: sortObject(event.data ?? {}),
  }));
}

function hashValue(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function formatEvents(events: CortexEvent[]) {
  if (events.length === 0) {
    return "none";
  }

  return events
    .slice(-3)
    .map((event) => event.type)
    .join(", ");
}

export function buildCortexFingerprint(snapshot: CortexSnapshot, events: CortexEvent[]) {
  return hashValue(
    JSON.stringify({
      snapshot,
      events: normalizeEvents(events),
    })
  );
}

export function buildBehaviorSummary(snapshot: CortexSnapshot, events: CortexEvent[] = []) {
  const completionRate =
    snapshot.totalTasks > 0
      ? Math.round((snapshot.completedTasks / snapshot.totalTasks) * 100)
      : 0;

  return `
Student behavioral data:
- Streak: ${snapshot.streak} days
- Level: ${snapshot.level}, XP: ${snapshot.xp}
- Total tasks: ${snapshot.totalTasks}, Completed: ${snapshot.completedTasks}, Pending: ${snapshot.pendingTasks}
- Subjects: ${snapshot.subjects.join(", ") || "none"}
- Completion rate: ${completionRate}%
- Recent task titles (last 5): ${snapshot.recentTaskTitles.join(", ") || "none"}
- Recent Cortex events: ${formatEvents(events)}
  `.trim();
}

export function resolveCortexExtension(context: CortexInsightContext) {
  return resolveDeterministicInsight(context);
}
