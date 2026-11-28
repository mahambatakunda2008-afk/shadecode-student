/**
 * Saves a lesson's page for offline navigation as soon as the lesson is stored on the device.
 * Best-effort and quiet: it never throws, never runs in development, and skips data-saver / 2G.
 */

const LESSON_ID_RE = /^[A-Za-z0-9_-]{6,80}$/;

/** Only plain lesson ids map to a /learn/<id> page. Namespaced ids (e.g. "teacher-tutorial:...") do not. */
export function lessonWarmRoute(id: unknown): string | null {
  return typeof id === "string" && LESSON_ID_RE.test(id) ? `/learn/${id}` : null;
}

type Connection = { saveData?: boolean; effectiveType?: string };

export function canWarmLesson(input: { online: boolean; hasServiceWorker: boolean; saveData?: boolean; effectiveType?: string | null }): boolean {
  if (!input.online || !input.hasServiceWorker || input.saveData) return false;
  return input.effectiveType !== "slow-2g" && input.effectiveType !== "2g";
}

export async function requestLessonWarm(id: unknown): Promise<void> {
  try {
    if (typeof navigator === "undefined" || process.env.NODE_ENV !== "production") return;
    const route = lessonWarmRoute(id);
    if (!route) return;
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    if (!canWarmLesson({
      online: navigator.onLine,
      hasServiceWorker: "serviceWorker" in navigator,
      saveData: Boolean(connection?.saveData),
      effectiveType: connection?.effectiveType,
    })) return;
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: "WARM_LESSON", route });
  } catch {
    /* offline saving is an enhancement; never block saving the lesson itself */
  }
}
