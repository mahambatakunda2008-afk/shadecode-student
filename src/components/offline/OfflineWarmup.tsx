"use client";

import { useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { OFFLINE_WARM_VERSION, WARM_START_DELAY_MS, coreRouteHrefs, shouldWarmRoutes, warmSucceeded, warmStorageKey } from "@/lib/offline/warmPolicy";

type Connection = { saveData?: boolean; effectiveType?: string };
type WarmDone = { type?: string; version?: string; pages?: number; skipped?: number; assets?: number; failed?: number };

/**
 * Quietly saves the learner's core screens and their code on the device while they are online,
 * so the app keeps working when the signal drops. Runs a few seconds after load, rarely, and never
 * on data-saver or 2G connections. The service worker does the fetching, so no page code runs
 * (nothing is tracked, generated or marked as visited).
 */
export default function OfflineWarmup() {
  const { profile } = useUser();
  const userId = profile?.id;

  useEffect(() => {
    if (!userId || process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const storageKey = warmStorageKey(userId);
    let cancelled = false;
    let timer: number | undefined;

    const readLast = (): number | null => {
      try {
        const value = Number(window.localStorage.getItem(storageKey));
        return Number.isFinite(value) && value > 0 ? value : null;
      } catch {
        return null;
      }
    };

    const attempt = async () => {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 20_000)),
      ]);
      if (cancelled || !registration?.active) return;
      const connection = (navigator as Navigator & { connection?: Connection }).connection;
      const allowed = shouldWarmRoutes({
        hasServiceWorker: true,
        online: navigator.onLine,
        saveData: Boolean(connection?.saveData),
        effectiveType: connection?.effectiveType,
        lastWarmAt: readLast(),
        now: Date.now(),
      });
      if (allowed) registration.active.postMessage({ type: "WARM_ROUTES", routes: coreRouteHrefs() });
    };

    const onMessage = (event: MessageEvent<WarmDone>) => {
      const data = event.data;
      if (data?.type !== "WARM_DONE" || data.version !== OFFLINE_WARM_VERSION) return;
      if (!warmSucceeded({ pages: data.pages ?? 0, skipped: data.skipped ?? 0, failed: data.failed ?? 0 })) return;
      try { window.localStorage.setItem(storageKey, String(Date.now())); } catch { /* storage unavailable: it will simply try again next visit */ }
    };

    const schedule = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { void attempt(); }, delay);
    };
    const onOnline = () => schedule(3_000);

    navigator.serviceWorker.addEventListener("message", onMessage);
    window.addEventListener("online", onOnline);
    schedule(WARM_START_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("online", onOnline);
    };
  }, [userId]);

  return null;
}
