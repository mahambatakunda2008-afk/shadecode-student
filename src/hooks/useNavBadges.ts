"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LOAD_TIMEOUT_MS = 2500;
const EXAM_URGENT_THRESHOLD_DAYS = 3;

type NavBadges = {
  tasksBadge?: string;
  tasksUrgent: boolean;
  examsBadge?: string;
  examsUrgent: boolean;
};

const EMPTY_BADGES: NavBadges = { tasksUrgent: false, examsUrgent: false };

export function useNavBadges() {
  const [badges, setBadges] = useState<NavBadges>(EMPTY_BADGES);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), LOAD_TIMEOUT_MS));
      const request = Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", false),
        supabase.from("exams").select("exam_date").eq("user_id", user.id).gte("exam_date", new Date().toISOString().split("T")[0]).order("exam_date", { ascending: true }).limit(1),
      ]);
      const result = await Promise.race([request, timeout]);
      if (cancelled || !result) return;

      const [tasksResult, examsResult] = result;
      const incompleteCount = tasksResult.count ?? 0;
      const nearestExamDate = examsResult.data?.[0]?.exam_date;
      let examsBadge: string | undefined;
      let examsUrgent = false;
      if (nearestExamDate) {
        const days = Math.ceil((new Date(nearestExamDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        examsBadge = days <= 0 ? "Today" : `${days}d`;
        examsUrgent = days <= EXAM_URGENT_THRESHOLD_DAYS;
      }
      setBadges({ tasksBadge: incompleteCount > 0 ? String(incompleteCount) : undefined, tasksUrgent: false, examsBadge, examsUrgent });
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  return badges;
}
