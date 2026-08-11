"use client";

/**
 * src/hooks/useNavBadges.ts
 *
 * Real, per-user nav badge data. The Tasks and Exams nav items
 * previously had hardcoded badge/urgent values (badge: "3",
 * badge: "2d", urgent: true) in src/lib/navigation.ts -- shown
 * identically to every user regardless of their actual data. The exam
 * one is worse than most fabrication bugs found this session: showing
 * every student a permanent "2 days, urgent" exam warning regardless
 * of whether they even have an exam soon is a genuine wellbeing
 * concern, not just a cosmetic inaccuracy.
 *
 * Both BottomNav.tsx and Sidebar.tsx need the same real-time counts,
 * so this lives as one shared hook rather than each component
 * querying independently.
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

export function useNavBadges(): NavBadges {
  const { user } = useUser();
  const [badges, setBadges] = useState<NavBadges>(EMPTY_BADGES);

  useEffect(() => {
    if (!user?.id) {
      setBadges(EMPTY_BADGES);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    const load = async () => {
      const [tasksResult, examsResult] = await Promise.all([
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
      ]);

      if (cancelled) return;

      const incompleteCount = tasksResult.count ?? 0;
      const nearestExamDate = examsResult.data?.[0]?.exam_date;

      let examsBadge: string | undefined;
      let examsUrgent = false;
      if (nearestExamDate) {
        const days = Math.ceil(
          (new Date(nearestExamDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
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

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return badges;
}
