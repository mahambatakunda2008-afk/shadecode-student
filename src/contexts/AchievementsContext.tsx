"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAchievements, AchievementData } from "@/hooks/useAchievements";

interface AchievementsContextValue {
  achievements: AchievementData[];
  totalUnlocked: number;
  totalAchievements: number;
  newUnlocked: AchievementData[];
  loading: boolean;
  refresh: () => Promise<void>;
  checkNewAchievements: () => Promise<void>;
  clearNew: () => void;
}

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

// Single shared useAchievements() instance for the whole authenticated app.
// Without this, each page calling the hook independently would have its own
// isolated `newUnlocked` state -- calling checkNewAchievements() from, say,
// tasks/page.tsx would never be visible to the globally-mounted
// AchievementToast, which has its own separate instance. This context makes
// "check for new achievements" and "show the unlock toast" share one source
// of truth.
export function AchievementsProvider({ children }: { children: ReactNode }) {
  const value = useAchievements();
  return (
    <AchievementsContext.Provider value={value}>
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievementsContext() {
  const ctx = useContext(AchievementsContext);
  if (!ctx) {
    throw new Error("useAchievementsContext must be used within an AchievementsProvider");
  }
  return ctx;
}
