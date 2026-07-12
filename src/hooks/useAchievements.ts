"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface AchievementData {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  xpReward: number;
  condition?: (stats: any) => boolean;
  secret?: boolean;
  unlocked: boolean;
  unlockedAt: string | null;
  seen: boolean;
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [totalUnlocked, setTotalUnlocked] = useState(0);
  const [totalAchievements, setTotalAchievements] = useState(0);
  const [newUnlocked, setNewUnlocked] = useState<AchievementData[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/achievements");
      if (!res.ok) throw new Error("Failed to fetch achievements");

      const data = await res.json();
      setAchievements(data.achievements);
      setTotalUnlocked(data.totalUnlocked);
      setTotalAchievements(data.totalAchievements);
    } catch (err) {
      console.error("[useAchievements] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const checkNewAchievements = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const res = await fetch("/api/achievements", { method: "POST" });
      if (!res.ok) return;

      const data = await res.json();
      if (data.newAchievements?.length > 0) {
        setNewUnlocked(data.newAchievements);
        await fetchAchievements();
      }
    } catch (err) {
      console.error("[useAchievements] Check error:", err);
    }
  }, [supabase, fetchAchievements]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return {
    achievements,
    totalUnlocked,
    totalAchievements,
    newUnlocked,
    loading,
    refresh: fetchAchievements,
    checkNewAchievements,
    clearNew: () => setNewUnlocked([]),
  };
}
