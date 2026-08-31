"use client";

import { useState } from "react";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import {
  Trophy,
  Lock,
  Sparkles,
  Star,
  Flame,
  Medal,
  Crown,
  Loader2,
  Target,
  ListChecks,
  FileCheck2,
  GraduationCap,
  Search,
  Languages,
  BadgeCheck,
  Timer,
  BookOpen,
  CalendarCheck,
  type LucideIcon,
} from "lucide-react";

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  common: { bg: "bg-[var(--surface-2)]", border: "border-[var(--card-border)]", text: "text-[var(--muted-foreground)]", glow: "shadow-slate-500/20" },
  rare: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-500", glow: "shadow-blue-500/20" },
  epic: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-500", glow: "shadow-purple-500/20" },
  legendary: { bg: "bg-amber-500/10", border: "border-amber-500/40", text: "text-amber-500", glow: "shadow-amber-500/30" },
};

const RARITY_ICONS: Record<string, React.ReactNode> = {
  common: <Medal className="w-4 h-4" />,
  rare: <Star className="w-4 h-4" />,
  epic: <Flame className="w-4 h-4" />,
  legendary: <Crown className="w-4 h-4" />,
};

// Real vector icons only. Legacy emoji values are mapped too so previously
// unlocked achievements are upgraded immediately without a database reset.
const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  Target,
  ListChecks,
  Trophy,
  FileCheck2,
  GraduationCap,
  Flame,
  Sparkles,
  Search,
  Languages,
  BadgeCheck,
  Timer,
  BookOpen,
  Star,
  CalendarCheck,
  "🎯": Target,
  "📋": ListChecks,
  "🏆": Trophy,
  "📝": FileCheck2,
  "🎓": GraduationCap,
  "🔥": Flame,
  "💫": Sparkles,
  "🔍": Search,
  "🌐": Languages,
  "💯": BadgeCheck,
  "⏱️": Timer,
  "📚": BookOpen,
  "📖": BookOpen,
  "⭐": Star,
  "📅": CalendarCheck,
};

export default function AchievementsPage() {
  const { achievements, totalUnlocked, totalAchievements, loading } = useAchievementsContext();
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all"
    ? achievements
    : filter === "unlocked"
    ? achievements.filter((a) => a.unlocked)
    : achievements.filter((a) => !a.unlocked);

  const progress = totalAchievements > 0 ? Math.round((totalUnlocked / totalAchievements) * 100) : 0;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          Achievements
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Track your progress and unlock rewards as you learn
        </p>
      </div>

      <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--card-border)]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[var(--muted-foreground)]">Progress</span>
          <span className="text-sm font-medium text-[var(--foreground)]">
            {totalUnlocked} / {totalAchievements} unlocked
          </span>
        </div>
        <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#22D3EE] to-[#7A3CFF] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-2 mt-3">
          {["common", "rare", "epic", "legendary"].map((rarity) => {
            const count = achievements.filter((a) => a.rarity === rarity && a.unlocked).length;
            const total = achievements.filter((a) => a.rarity === rarity).length;
            const c = RARITY_COLORS[rarity];
            return (
              <div key={rarity} className={`flex-1 ${c.bg} rounded-lg p-2 border ${c.border} text-center`}>
                <div className="flex items-center justify-center gap-1">
                  <span className={c.text}>{RARITY_ICONS[rarity]}</span>
                  <span className={`text-xs capitalize ${c.text}`}>{rarity}</span>
                </div>
                <div className={`text-sm font-bold ${c.text}`}>{count}/{total}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { key: "all", label: "All" },
          { key: "unlocked", label: "Unlocked" },
          { key: "locked", label: "Locked" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f.key
                ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20"
                : "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((achievement) => {
          const c = RARITY_COLORS[achievement.rarity];
          const Icon = ACHIEVEMENT_ICONS[achievement.icon] ?? Trophy;
          return (
            <div
              key={achievement.id}
              className={`relative rounded-xl p-4 border transition-all duration-300 ${
                achievement.unlocked
                  ? `${c.bg} ${c.border} ${c.glow} shadow-lg`
                  : "bg-[var(--surface-2)] border-[var(--card-border)] opacity-60"
              }`}
            >
              {!achievement.unlocked && (
                <div className="absolute inset-0 bg-[var(--background)]/60 rounded-xl flex items-center justify-center z-10">
                  <Lock className="w-8 h-8 text-[var(--muted-foreground)]" />
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={`shrink-0 rounded-lg p-2 ${c.bg} ${c.text}`}>
                  <Icon className={`w-6 h-6 ${achievement.unlocked ? "" : "grayscale"}`} strokeWidth={1.9} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[var(--foreground)] text-sm truncate">
                      {achievement.title}
                    </span>
                    {achievement.unlocked && (
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2">
                    {achievement.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] uppercase tracking-wider ${c.text}`}>
                      {achievement.rarity}
                    </span>
                    <span className="text-[10px] text-amber-500">
                      +{achievement.xpReward} XP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No achievements match this filter</p>
        </div>
      )}
    </div>
  );
}
