"use client";

import { useEffect, useState } from "react";

// ── Badge catalog — defines all possible badges ──────────────────────────
// Each badge has a key that maps to achievement types from the DB.
// Badges not yet earned show as locked.
const BADGE_CATALOG = [
  {
    key: "first_task",
    name: "First Step",
    icon: "📝",
    description: "Complete your first task",
    color: "#6366f1",
  },
  {
    key: "streak_3",
    name: "On Fire",
    icon: "🔥",
    description: "Reach a 3-day streak",
    color: "#f59e0b",
  },
  {
    key: "streak_7",
    name: "Unstoppable",
    icon: "⚡",
    description: "Reach a 7-day streak",
    color: "#fb923c",
  },
  {
    key: "xp_100",
    name: "XP Hunter",
    icon: "💎",
    description: "Earn 100 XP total",
    color: "#8b5cf6",
  },
  {
    key: "xp_500",
    name: "XP Master",
    icon: "👑",
    description: "Earn 500 XP total",
    color: "#eab308",
  },
  {
    key: "exam_first",
    name: "Test Taker",
    icon: "🎯",
    description: "Complete your first exam",
    color: "#22c55e",
  },
  {
    key: "exam_ace",
    name: "Ace",
    icon: "🏆",
    description: "Score 90%+ on an exam",
    color: "#f472b6",
  },
  {
    key: "challenge_5",
    name: "Challenger",
    icon: "🏅",
    description: "Complete 5 daily challenges",
    color: "#06b6d4",
  },
  {
    key: "focus_30",
    name: "Deep Focus",
    icon: "🧘",
    description: "Complete a 30-min focus session",
    color: "#14b8a6",
  },
  {
    key: "subjects_3",
    name: "Renaissance",
    icon: "📚",
    description: "Add 3 subjects",
    color: "#a78bfa",
  },
];

export default function BadgeDisplay({ compact = false }) {
  const [earned, setEarned] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, []);

  async function fetchAchievements() {
    try {
      const res = await fetch("/api/achievements");
      const data = await res.json();

      if (data.achievements) {
        setEarned(data.achievements);
      }
    } catch (err) {
      console.error("Failed to load achievements:", err);
    } finally {
      setLoading(false);
    }
  }

  // Match earned achievements to the catalog by key/type/name
  function isEarned(badgeKey) {
    return earned.find(
      (a) =>
        a.badge_type === badgeKey ||
        a.type === badgeKey ||
        a.name === badgeKey ||
        a.key === badgeKey
    );
  }

  // In compact mode, show only earned badges (for dashboard row)
  const displayBadges = compact
    ? BADGE_CATALOG.filter((b) => isEarned(b.key))
    : BADGE_CATALOG;

  // Compact mode: show nothing if no badges earned
  if (compact && displayBadges.length === 0 && !loading) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
          <span className="text-xs text-[var(--muted-foreground)]">
            Loading achievements…
          </span>
        </div>
      </div>
    );
  }

  // Full grid display
  if (!compact) {
    return (
      <div
        id="badges-display"
        className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4"
      >
        <p
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "var(--muted-foreground)" }}
        >
          Achievements
        </p>

        {earned.length > 0 && (
          <p className="text-xs mb-3" style={{ color: "var(--primary)" }}>
            {earned.length} / {BADGE_CATALOG.length} unlocked
          </p>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {displayBadges.map((badge) => {
            const achievement = isEarned(badge.key);
            const unlocked = !!achievement;

            return (
              <div
                key={badge.key}
                id={`badge-${badge.key}`}
                className={`relative overflow-hidden rounded-lg border p-3 transition-all duration-200 ${unlocked
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-white/[0.04] bg-white/[0.01] opacity-40"
                  }`}
                style={
                  unlocked
                    ? {
                      boxShadow: `0 0 12px ${badge.color}15`,
                      borderColor: `${badge.color}25`,
                    }
                    : {}
                }
              >
                {/* Glow for unlocked badges */}
                {unlocked && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `radial-gradient(ellipse at 30% 20%, ${badge.color}10 0%, transparent 70%)`,
                    }}
                  />
                )}

                <div className="relative flex items-center gap-2.5">
                  <span
                    className={`text-xl ${!unlocked ? "grayscale" : ""}`}
                    style={{ filter: unlocked ? "none" : "grayscale(100%)" }}
                  >
                    {unlocked ? badge.icon : "🔒"}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-semibold truncate"
                      style={{
                        color: unlocked
                          ? "var(--foreground)"
                          : "var(--muted-foreground)",
                      }}
                    >
                      {badge.name}
                    </p>
                    <p
                      className="text-[10px] truncate"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {unlocked
                        ? formatDate(
                          achievement.unlocked_at ||
                          achievement.created_at
                        )
                        : badge.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Compact row (for dashboard inline)
  return (
    <div
      id="badges-compact"
      className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
    >
      <p
        className="text-[10px] font-bold uppercase tracking-widest mr-1 flex-shrink-0"
        style={{ color: "var(--muted-foreground)" }}
      >
        Badges
      </p>

      <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
        {displayBadges.slice(0, 5).map((badge) => (
          <span
            key={badge.key}
            className="text-base flex-shrink-0"
            title={badge.name}
          >
            {badge.icon}
          </span>
        ))}
        {displayBadges.length > 5 && (
          <span
            className="text-[10px] font-semibold flex-shrink-0"
            style={{ color: "var(--muted-foreground)" }}
          >
            +{displayBadges.length - 5}
          </span>
        )}
      </div>

      <span
        className="text-[10px] font-semibold flex-shrink-0"
        style={{ color: "var(--primary)" }}
      >
        {earned.length}/{BADGE_CATALOG.length}
      </span>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}
