/**
 * When and what to save for offline use. Pure, so the data-cost rules are tested.
 * Students pay for data, so saving is quiet, rare and skipped on data-saver or 2G connections.
 */

/** Must match VERSION in public/sw.js: a new worker version saves again. */
export const OFFLINE_WARM_VERSION = "v7";
export const WARM_INTERVAL_MS = 12 * 60 * 60 * 1000;
export const WARM_START_DELAY_MS = 8_000;

export const CORE_OFFLINE_ROUTES: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/learn", label: "Learn" },
  { href: "/exam-sim", label: "Practice exams" },
  { href: "/exam-hub", label: "Past papers" },
  { href: "/exams", label: "Exam schedule" },
  { href: "/study", label: "Study" },
  { href: "/study-plan", label: "Study plan" },
  { href: "/curriculum", label: "Curriculum" },
  { href: "/focus", label: "Focus timer" },
  { href: "/tasks", label: "Tasks" },
  { href: "/timetable", label: "Timetable" },
  { href: "/achievements", label: "Achievements" },
  { href: "/settings", label: "Settings" },
];

export interface WarmContext {
  hasServiceWorker: boolean;
  online: boolean;
  saveData: boolean;
  effectiveType?: string | null;
  /** When routes were last saved on this device for this learner, or null if never. */
  lastWarmAt: number | null;
  now: number;
}

export function shouldWarmRoutes(context: WarmContext): boolean {
  if (!context.hasServiceWorker || !context.online || context.saveData) return false;
  if (context.effectiveType === "slow-2g" || context.effectiveType === "2g") return false;
  if (context.lastWarmAt === null) return true;
  return context.now - context.lastWarmAt >= WARM_INTERVAL_MS;
}

/** Per learner, so signing in as someone else on a shared phone saves their screens too. */
export const warmStorageKey = (userId: string) => `shadecode:offline-warm:${OFFLINE_WARM_VERSION}:${userId}`;

export const coreRouteHrefs = () => CORE_OFFLINE_ROUTES.map((route) => route.href);

/** A save counts as done when it mostly worked, so a flaky connection retries sooner instead of waiting 12 hours. */
export function warmSucceeded(result: { pages: number; skipped: number; failed: number }): boolean {
  const saved = result.pages + result.skipped;
  return saved > 0 && saved >= result.failed * 3;
}
