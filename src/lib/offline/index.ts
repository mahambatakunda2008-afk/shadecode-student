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

      // The previous PWA configuration used the same runtime cache for the
      // landing page and authenticated pages. Retire that cache client-side
      // once the current SW is ready so an old cached `/` cannot survive the
      // rollout and unexpectedly appear after authentication.
      if ("caches" in window) {
        await caches.delete("shadecode-pages");
      }

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
  weakSubjects?: string[];
  strongSubjects?: string[];
  averageExamScore?: number;
  totalStudyMinutes?: number;
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
    weakSubjects,
    strongSubjects,
    averageExamScore,
    totalStudyMinutes,
  } = snapshot;

  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  if (weakSubjects && weakSubjects.length > 0) {
    const weakAreas = weakSubjects.slice(0, 2).join(" and ");
    return `Focus on strengthening ${weakAreas} — identified as priority improvement areas.`;
  }

  if (strongSubjects && strongSubjects.length >= 2) {
    return `Strong performance in ${strongSubjects.slice(0, 2).join(" and ")} — consider deeper challenges.`;
  }

  if (averageExamScore && averageExamScore < 50 && totalTasks >= 5) {
    return `Average exam score is ${averageExamScore}%. Increase practice frequency to improve results.`;
  }

  if (averageExamScore && averageExamScore >= 80) {
    return `Excellent exam performance at ${averageExamScore}% average. Maintain current study rhythm.`;
  }

  if (totalStudyMinutes && totalStudyMinutes >= 600) {
    const hours = Math.round(totalStudyMinutes / 60);
    return `${hours} total study hours logged — strong dedication detected across subjects.`;
  }

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

export function generateOfflineRecommendation(snapshot: OfflineSnapshot): string {
  const { weakSubjects, strongSubjects, pendingTasks, subjects, streak, completedTasks, totalTasks } = snapshot;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (weakSubjects && weakSubjects.length > 0) {
    return `Study ${weakSubjects[0]} to strengthen your understanding.`;
  }
  if (pendingTasks > 0 && completionRate < 50) {
    return `Complete ${Math.min(pendingTasks, 3)} task${Math.min(pendingTasks, 3) !== 1 ? "s" : ""} to improve your completion rate.`;
  }
  if (subjects.length === 0) {
    return "Add a subject to begin your learning journey.";
  }
  if (streak === 0) {
    return `Start with ${subjects[0]} to build a new study streak.`;
  }
  if (strongSubjects && strongSubjects.length > 0) {
    return `Continue with ${strongSubjects[0]} to maintain momentum.`;
  }
  return subjects.length > 0 ? `Review ${subjects[0]} fundamentals.` : "Start learning today!";
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
