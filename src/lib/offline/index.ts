// src/lib/offline/index.ts
// Handles SW registration and offline detection

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("[SW] Registered:", registration.scope);

      registration.addEventListener("updatefound", () => {
        console.log("[SW] Update found");
      });
    } catch (err) {
      console.error("[SW] Registration failed:", err);
    }
  });
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

// ── Offline Cortex — rule-based insights without API ─────────────────────────
interface OfflineSnapshot {
  streak: number;
  level: number;
  xp: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  subjects: string[];
}

export function generateOfflineInsight(snapshot: OfflineSnapshot): string {
  const {
    streak,
    totalTasks,
    completedTasks,
    pendingTasks,
    subjects,
    xp,
    level,
  } = snapshot;

  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  // Priority-ordered rules — first match wins
  if (streak >= 14) {
    return `Study streak now spans ${streak} consecutive active days.`;
  }

  if (streak >= 7) {
    return `Consistent engagement detected across ${streak} consecutive days.`;
  }

  if (completionRate === 100 && totalTasks > 0) {
    return `Full task completion achieved across ${subjects.length} subject${subjects.length !== 1 ? "s" : ""}.`;
  }

  if (completionRate === 0 && totalTasks > 0) {
    return `${pendingTasks} task${pendingTasks !== 1 ? "s" : ""} remain pending with no completions recorded.`;
  }

  if (completionRate < 30 && totalTasks >= 3) {
    return `Task completion rate stands at ${completionRate}% — significant backlog detected.`;
  }

  if (completionRate >= 80 && totalTasks >= 3) {
    return `High task completion rate of ${completionRate}% detected across active subjects.`;
  }

  if (subjects.length === 1) {
    return `Study activity concentrated in ${subjects[0]} with ${completedTasks} task${completedTasks !== 1 ? "s" : ""} completed.`;
  }

  if (subjects.length >= 4) {
    return `Engagement distributed across ${subjects.length} subjects — ${completedTasks} tasks completed total.`;
  }

  if (pendingTasks > 10) {
    return `${pendingTasks} pending tasks detected — workload accumulation pattern observed.`;
  }

  if (streak === 0) {
    return `No active study streak recorded in the current observation period.`;
  }

  if (streak > 0) {
    return `Study streak now spans ${streak} consecutive active day${streak !== 1 ? "s" : ""}.`;
  }

  return `${completedTasks} of ${totalTasks} tasks completed at Level ${level} with ${xp} XP total.`;
}

// ── Offline queue for writes ───────────────────────────────────────────────────
const QUEUE_KEY = "shadecode_offline_queue";

interface QueuedWrite {
  id: string;
  table: string;
  operation: "insert" | "update";
  data: Record<string, unknown>;
  timestamp: number;
}

export function queueOfflineWrite(
  table: string,
  operation: "insert" | "update",
  data: Record<string, unknown>
): void {
  if (typeof localStorage === "undefined") return;

  const queue = getOfflineQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    table,
    operation,
    data,
    timestamp: Date.now(),
  });

  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getOfflineQueue(): QueuedWrite[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearOfflineQueue(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(QUEUE_KEY);
}
