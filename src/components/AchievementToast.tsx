"use client";

import { useEffect, useState } from "react";
import { useAchievements } from "@/hooks/useAchievements";
import { X, Sparkles, Trophy, Star, Flame, Crown, Medal } from "lucide-react";

const RARITY_STYLES: Record<string, { border: string; bg: string; glow: string; icon: React.ReactNode }> = {
  common: { border: "border-slate-600", bg: "bg-slate-800", glow: "shadow-slate-500/20", icon: <Medal className="w-5 h-5 text-slate-300" /> },
  rare: { border: "border-blue-600", bg: "bg-blue-900", glow: "shadow-blue-500/30", icon: <Star className="w-5 h-5 text-blue-300" /> },
  epic: { border: "border-purple-600", bg: "bg-purple-900", glow: "shadow-purple-500/30", icon: <Flame className="w-5 h-5 text-purple-300" /> },
  legendary: { border: "border-amber-500", bg: "bg-amber-900", glow: "shadow-amber-500/40", icon: <Crown className="w-5 h-5 text-amber-300" /> },
};

export function AchievementToast() {
  const { newUnlocked, clearNew } = useAchievements();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<typeof newUnlocked[0] | null>(null);

  useEffect(() => {
    if (newUnlocked.length > 0 && !visible) {
      setCurrent(newUnlocked[0]);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          clearNew();
          setCurrent(null);
        }, 300);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [newUnlocked, visible, clearNew]);

  if (!visible || !current) return null;

  const styles = RARITY_STYLES[current.rarity] || RARITY_STYLES.common;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-[9999] animate-in slide-in-from-right-4 fade-in duration-300">
      <div className={`${styles.bg} ${styles.border} border rounded-xl p-4 ${styles.glow} shadow-2xl max-w-sm`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">
            {current.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-sm">{current.title}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-xs text-slate-300 mt-0.5">{current.description}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] uppercase tracking-wider ${styles.border.replace("border-", "text-")}`}>
                {current.rarity}
              </span>
              <span className="text-[10px] text-amber-400">+{current.xpReward} XP</span>
            </div>
          </div>
          <button
            onClick={() => { setVisible(false); clearNew(); }}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
