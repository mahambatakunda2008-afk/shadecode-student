"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Flame,
  Zap,
  Crown,
  Shield,
  Star,
  RefreshCw,
} from "lucide-react";

/* =========================
   TYPES
========================= */

interface LeaderboardEntry {
  id: string;
  username: string;
  xp: number;
  weekly_xp: number;
  level: number;
  streak: number;
  completed_tasks: number;
  total_tasks: number;
  last_active?: string;

  score?: number;
  league?: string;
  achievements?: string[];
  cortexMessage?: string;
  difficulty?: string;
}

/* =========================
   SEASON SYSTEM
========================= */

function getSeasonKey() {
  const now = new Date();
  return `S-${now.getFullYear()}-${now.getMonth() + 1}`;
}

/* =========================
   LEAGUES
========================= */

function getLeague(score: number) {
  if (score >= 3000)
    return {
      name: "Diamond",
      color: "#60a5fa",
      icon: "💎",
    };

  if (score >= 1800)
    return {
      name: "Gold",
      color: "#f59e0b",
      icon: "👑",
    };

  if (score >= 900)
    return {
      name: "Silver",
      color: "#94a3b8",
      icon: "🛡️",
    };

  return {
    name: "Bronze",
    color: "#cd7c2f",
    icon: "⚔️",
  };
}

/* =========================
   ACHIEVEMENTS
========================= */

function getAchievements(user: LeaderboardEntry) {
  const achievements: string[] = [];

  if (user.streak >= 7) achievements.push("🔥 7 Day Streak");

  if (user.weekly_xp >= 1000)
    achievements.push("⚡ XP Grinder");

  if (user.level >= 10)
    achievements.push("👑 Level Master");

  if (user.completed_tasks >= 50)
    achievements.push("📚 Task Crusher");

  return achievements;
}

/* =========================
   XP DECAY
========================= */

function applyXpDecay(
  lastActive?: string,
  weeklyXp: number = 0
) {
  if (!lastActive) return weeklyXp;

  const now = new Date();
  const last = new Date(lastActive);

  const diffDays =
    (now.getTime() - last.getTime()) /
    (1000 * 60 * 60 * 24);

  if (diffDays > 3) {
    return Math.max(
      0,
      weeklyXp - Math.floor(diffDays * 15)
    );
  }

  return weeklyXp;
}

/* =========================
   SCORING
========================= */

function computeScore(
  user: LeaderboardEntry,
  achievements: string[]
) {
  const completionRate =
    user.total_tasks > 0
      ? user.completed_tasks / user.total_tasks
      : 0;

  return Math.floor(
    (user.weekly_xp || 0) +
      user.level * 80 +
      user.streak * 30 +
      completionRate * 500 +
      achievements.length * 150
  );
}

/* =========================
   CORTEX ANALYSIS
========================= */

function cortexAnalyze(user: LeaderboardEntry) {
  const achievements = getAchievements(user);

  const score = computeScore(user, achievements);

  if (score < 500) {
    return {
      difficulty: "easy",
      message:
        "Momentum instability detected. Recovery-focused progression enabled.",
    };
  }

  if (score > 2500) {
    return {
      difficulty: "hard",
      message:
        "Elite performance detected. High-intensity challenge routing active.",
    };
  }

  return {
    difficulty: "normal",
    message:
      "Stable learning rhythm detected. Balanced progression maintained.",
  };
}

/* =========================
   COMPONENT
========================= */

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<
    LeaderboardEntry[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [currentUserId, setCurrentUserId] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  const router = useRouter();

  const [supabase] = useState(() => createClient());

  const season = getSeasonKey();

  /* =========================
     FETCH
  ========================= */

  const fetchLeaderboard = async () => {
    try {
      setRefreshing(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          xp,
          weekly_xp,
          level,
          streak,
          completed_tasks,
          total_tasks,
          last_active
        `);

      if (error) {
        console.error(error);
        return;
      }

      const ranked = (data || [])
        .map((u: LeaderboardEntry) => {
          const adjustedWeeklyXp = applyXpDecay(
            u.last_active,
            u.weekly_xp
          );

          const achievements =
            getAchievements(u);

          const score = computeScore(
            {
              ...u,
              weekly_xp: adjustedWeeklyXp,
            },
            achievements
          );

          const league = getLeague(score);

          const cortex = cortexAnalyze({
            ...u,
            weekly_xp: adjustedWeeklyXp,
          });

          return {
            ...u,
            weekly_xp: adjustedWeeklyXp,
            score,
            league: league.name,
            achievements,
            cortexMessage: cortex.message,
            difficulty: cortex.difficulty,
          };
        })
        .sort(
          (a, b) => (b.score || 0) - (a.score || 0)
        );

      setEntries(ranked);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =========================
     INIT
  ========================= */

  useEffect(() => {
    fetchLeaderboard();

    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  /* =========================
     CURRENT USER RANK
  ========================= */

  const currentRank = useMemo(() => {
    const index = entries.findIndex(
      (e) => e.id === currentUserId
    );

    return index >= 0 ? index + 1 : null;
  }, [entries, currentUserId]);

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div
        style={{
          padding: "80px 24px",
          textAlign: "center",
          color: "var(--muted-foreground)",
        }}
      >
        Initializing Cortex OS...
      </div>
    );
  }

  /* =========================
     UI
  ========================= */

  return (
    <div
      style={{
        padding: "60px 20px 120px",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--primary)",
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            Cortex OS
          </p>

          <h1
            style={{
              fontSize: "34px",
              fontWeight: 900,
              margin: 0,
            }}
          >
            Season Leaderboard
          </h1>

          <p
            style={{
              color: "var(--muted-foreground)",
              marginTop: "8px",
              fontSize: "14px",
            }}
          >
            Adaptive competitive ecosystem · {season}
          </p>
        </div>

        <button
          onClick={fetchLeaderboard}
          style={{
            border: "1px solid var(--card-border)",
            background: "var(--card)",
            padding: "10px 14px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            color: "var(--foreground)",
            fontWeight: 600,
          }}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* USER CARD */}

      {currentRank && (
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))",
            border:
              "1px solid rgba(99,102,241,0.25)",
            borderRadius: "18px",
            padding: "18px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "12px",
                  opacity: 0.7,
                  marginBottom: "6px",
                }}
              >
                Your Position
              </p>

              <h2
                style={{
                  fontSize: "28px",
                  margin: 0,
                  fontWeight: 900,
                }}
              >
                #{currentRank}
              </h2>
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  padding: "10px 14px",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    opacity: 0.6,
                  }}
                >
                  Season
                </div>

                <div
                  style={{
                    fontWeight: 700,
                  }}
                >
                  {season}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  padding: "10px 14px",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    opacity: 0.6,
                  }}
                >
                  Live Updates
                </div>

                <div
                  style={{
                    fontWeight: 700,
                  }}
                >
                  15s Sync
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP 3 */}

      {entries.length >= 3 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          {[entries[1], entries[0], entries[2]].map(
            (entry, i) => {
              if (!entry) return null;

              const rank =
                i === 0 ? 2 : i === 1 ? 1 : 3;

              const league = getLeague(
                entry.score || 0
              );

              return (
                <div
                  key={entry.id}
                  style={{
                    background: "var(--card)",
                    border:
                      "1px solid var(--card-border)",
                    borderRadius: "20px",
                    padding: "20px",
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `radial-gradient(circle at top, ${league.color}22, transparent 70%)`,
                    }}
                  />

                  <div
                    style={{
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "42px",
                        marginBottom: "10px",
                      }}
                    >
                      {rank === 1
                        ? "🥇"
                        : rank === 2
                        ? "🥈"
                        : "🥉"}
                    </div>

                    <h3
                      style={{
                        margin: 0,
                        fontSize: "20px",
                        fontWeight: 800,
                      }}
                    >
                      {entry.username}
                    </h3>

                    <p
                      style={{
                        color: league.color,
                        fontWeight: 700,
                        marginTop: "6px",
                      }}
                    >
                      {league.icon} {league.name}
                    </p>

                    <div
                      style={{
                        marginTop: "14px",
                        fontSize: "28px",
                        fontWeight: 900,
                      }}
                    >
                      {entry.score}
                    </div>

                    <div
                      style={{
                        opacity: 0.6,
                        fontSize: "12px",
                      }}
                    >
                      Cortex Score
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* FULL LIST */}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {entries.map((entry, index) => {
          const rank = index + 1;

          const league = getLeague(
            entry.score || 0
          );

          const isMe =
            entry.id === currentUserId;

          return (
            <div
              key={entry.id}
              style={{
                background: isMe
                  ? "rgba(99,102,241,0.08)"
                  : "var(--card)",
                border: isMe
                  ? "1px solid rgba(99,102,241,0.25)"
                  : "1px solid var(--card-border)",
                borderRadius: "18px",
                padding: "18px",
              }}
            >
              {/* TOP */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >
                {/* LEFT */}

                <div
                  style={{
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start",
                  }}
                >
                  {/* RANK */}

                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "14px",
                      background:
                        "rgba(255,255,255,0.04)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: "16px",
                    }}
                  >
                    #{rank}
                  </div>

                  {/* INFO */}

                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: 800,
                        }}
                      >
                        {entry.username}

                        {isMe && (
                          <span
                            style={{
                              color:
                                "var(--primary)",
                              marginLeft: "6px",
                            }}
                          >
                            (you)
                          </span>
                        )}
                      </h3>

                      <span
                        style={{
                          color: league.color,
                          fontWeight: 700,
                          fontSize: "13px",
                        }}
                      >
                        {league.icon} {league.name}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "14px",
                        marginTop: "8px",
                        flexWrap: "wrap",
                        fontSize: "12px",
                        opacity: 0.8,
                      }}
                    >
                      <span>
                        <Zap size={12} /> LVL{" "}
                        {entry.level}
                      </span>

                      <span>
                        <Flame size={12} />{" "}
                        {entry.streak}d streak
                      </span>

                      <span>
                        <Trophy size={12} />{" "}
                        {entry.weekly_xp} weekly XP
                      </span>
                    </div>
                  </div>
                </div>

                {/* SCORE */}

                <div
                  style={{
                    textAlign: "right",
                  }}
                >
                  <div
                    style={{
                      fontSize: "26px",
                      fontWeight: 900,
                    }}
                  >
                    {entry.score}
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      opacity: 0.6,
                    }}
                  >
                    Cortex Score
                  </div>
                </div>
              </div>

              {/* ACHIEVEMENTS */}

              {entry.achievements &&
              entry.achievements.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginTop: "14px",
                  }}
                >
                  {entry.achievements.map(
                    (a, i) => (
                      <div
                        key={i}
                        style={{
                          background:
                            "rgba(255,255,255,0.04)",
                          border:
                            "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "999px",
                          padding: "6px 10px",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        {a}
                      </div>
                    )
                  )}
                </div>
              ) : null}

              {/* CORTEX */}

              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  borderRadius: "14px",
                  background:
                    "rgba(255,255,255,0.03)",
                  border:
                    "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "6px",
                  }}
                >
                  <Star
                    size={14}
                    color="var(--primary)"
                  />

                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    Cortex Analysis
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    lineHeight: 1.6,
                    opacity: 0.85,
                  }}
                >
                  {entry.cortexMessage}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* STYLE */}

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
