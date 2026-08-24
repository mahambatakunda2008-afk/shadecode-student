"use client";

/**
 * Background-only navigation enrichment.
 * Badge data is useful, but it is never allowed to become a navigation or
 * route-loading dependency.
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/contexts/UserContext";

export interface NavBadges {
  tasksBadge: string | undefined;
  tasksUrgent: boolean;
  examsBadge: string | undefined;
  examsUrgent: boolean;
}

const EMPTY_BADGES: NavBadges = {
  tasksBadge: undefined,
  tasksUrgent: false,
  examsBadge: undefined,
  examsUrgent: false,
};

const EXAM_URGENT_THRESHOLD_DAYS = 3;
const LOAD_TIMEOUT_MS = 2500;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      },
      () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

export function useNavBadges(): NavBadges {
  const { user } = useUser();
  const [badges, setBadges] = useState<NavBadges>(EMPTY_BADGES);

  useEffect(() => {
    if (!user?.id) {
      setBadges(EMPTY_BADGES);
      return;
    }

    let cancelled = false;

    // Deliberately defer enrichment so the navigation can paint first.
    const timer = window.setTimeout(() => {
      if (cancelled || !navigator.onLine) return;

      const supabase = createClient();
      const load = async () => {
        const result = await withTimeout(
          Promise.all([
            supabase
              .from("tasks")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("completed", false),
            supabase
              .from("exams")
              .select("exam_date")
              .eq("user_id", user.id)
              .gte("exam_date", new Date().toISOString().split("T")[0])
              .order("exam_date", { ascending: true })
              .limit(1),
          ]),
          LOAD_TIMEOUT_MS,
        );

        if (cancelled || !result) return;

        const [tasksResult, examsResult] = result;
        const incompleteCount = tasksResult.count ?? 0;
        const nearestExamDate = examsResult.data?.[0]?.exam_date;

        let examsBadge: string | undefined;
        let examsUrgent = false;
        if (nearestExamDate) {
          const days = Math.ceil(
            (new Date(nearestExamDate).getTime() - Date.now().getTime()) /
              (1000 * 60 * 60 * 24),
          );
          examsBadge = days <= 0 ? "Today" : `${days}d`;
          examsUrgent = days <= EXAM_URGENT_THRESHOLD_DAYS;
        }

        setBadges({
          tasksBadge: incompleteCount > 0 ? String(incompleteCount) : undefined,
          tasksUrgent: false,
          examsBadge,
          examsUrgent,
        });
      };

      void load();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user?.id]);

  return badges;
}
