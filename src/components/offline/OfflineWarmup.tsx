"use client";

import { useEffect, useMemo } from "react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";
import { getExperienceNavGroups } from "@/lib/navigation";
import { OFFLINE_WARM_VERSION, WARM_START_DELAY_MS, getOfflineWarmRoutes, shouldWarmRoutes, warmSucceeded, warmStorageKey } from "@/lib/offline/warmPolicy";

type Connection = { saveData?: boolean; effectiveType?: string };
type WarmDone = { type?: string; version?: string; pages?: number; skipped?: number; assets?: number; failed?: number };

/**
 * Quietly saves the learner's permitted destinations and their referenced code
 * while online. The route list follows the same subject- and stage-aware navigation
 * as the visible app, so hidden/admin destinations are never prefetched.
 */
export default function OfflineWarmup() {
  const { profile } = useUser();
  const userId = profile?.id;
  const routes = useMemo(() => {
    const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
    const navGroups = getExperienceNavGroups(experience, profile?.curriculum_subjects, profile?.subjects);
    return getOfflineWarmRoutes(navGroups);
  }, [profile?.study_level, profile?.curriculum_subjects, profile?.subjects]);

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
      if (allowed) registration.active.postMessage({ type: "WARM_ROUTES", routes });
    };

    const onMessage = (event: MessageEvent<WarmDone>) => {
      const data = event.data;
      if (data?.type !== "WARM_DONE" || data.version !== OFFLINE_WARM_VERSION) return;
      if (!warmSucceeded({ pages: data.pages ?? 0, skipped: data.skipped ?? 0, failed: data.failed ?? 0 })) return;
      try { window.localStorage.setItem(storageKey, String(Date.now())); } catch { /* storage unavailable: retry next visit */ }
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
  }, [userId, routes]);

  return null;
}
