"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/* ---------------- TYPES ---------------- */

interface LeaderboardEntry {
  id: string;
  username: string;
  xp: number;
  level: number;
  streak: number;
  score?: number;
  league?: string;
}

/* ---------------- LEAGUES ---------------- */

function getLeague(score: number) {
  if (score >= 1500) return { name: "Diamond", color: "#60a5fa" };
  if (score >= 900) return { name: "Gold", color: "#f59e0b" };
  if (score >= 400) return { name: "Silver", color: "#94a3b8" };
  return { name: "Bronze", color: "#cd7c2f" };
}

function nextLeagueThreshold(score: number) {
  if (score < 400) return 400;
  if (score < 900) return 900;
  if (score < 1500) return 1500;
  return null;
}

/* ---------------- COMPONENT ---------------- */

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const [supabase] = useState(() => createClient());

  /* ---------------- SCORE ---------------- */

  const computeScore = (u: LeaderboardEntry) =>
    (u.xp || 0) + (u.level || 1) * 50 + (u.streak || 0) * 20;

  /* ---------------- FETCH ---------------- */

  useEffect(() => {
    const init = async () => {
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
        .select("id, username, xp, level, streak");

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const ranked = (data || [])
        .map((u: LeaderboardEntry) => {
          const score = computeScore(u);
          const league = getLeague(score);

          return {
            ...u,
            score,
            league: league.name,
          };
        })
        .sort((a, b) => (b.score || 0) - (a.score || 0));

      setEntries(ranked);
      setLoading(false);
    };

    init();
  }, [router, supabase]);

  /* ---------------- CURRENT USER RANK ---------------- */

  const currentUserRank = useMemo(() => {
    const index = entries.findIndex((e) => e.id === currentUserId);
    return index >= 0 ? index + 1 : null;
  }, [entries, currentUserId]);

  /* ---------------- UI HELPERS ---------------- */

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { color: "#f59e0b", icon: "🥇" };
    if (rank === 2) return { color: "#94a3b8", icon: "🥈" };
    if (rank === 3) return { color: "#cd7c2f", icon: "🥉" };
    return { color: "var(--muted-foreground)", icon: `${rank}` };
  };

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return (
      <div
        style={{
          padding: "60px 24px",
          textAlign: "center",
          color: "var(--muted-foreground)",
        }}
      >
        Loading leaderboard...
      </div>
    );
  }

  /* ---------------- RENDER ---------------- */

  return (
    <div
      style={{
        padding: "60px 24px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* HEADER */}
      <div>
        <p
          style={{
            fontSize: "12px",
            color: "var(--primary)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Shadecode Student
        </p>

        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>
          Leaderboard
        </h1>

        <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
          Ranked by XP + Level + Streak
        </p>
      </div>

      {/* USER RANK */}
      {currentUserRank && (
        <div
          style={{
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "12px",
            padding: "14px 16px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Your rank</span>
          <strong style={{ color: "var(--primary)", fontSize: "18px" }}>
            #{currentUserRank}
          </strong>
        </div>
      )}

      {/* LIST */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          padding: "12px",
        }}
      >
        {entries.map((entry, index) => {
          const rank = index + 1;
          const { color, icon } = getRankStyle(rank);

          const league = getLeague(entry.score || 0);
          const next = nextLeagueThreshold(entry.score || 0);

          const progress = next
            ? ((entry.score || 0) / next) * 100
            : 100;

          const isCurrent = entry.id === currentUserId;

          return (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                borderRadius: "10px",
                background: isCurrent
                  ? "rgba(99,102,241,0.08)"
                  : "transparent",
              }}
            >
              {/* RANK */}
              <div style={{ width: "30px", textAlign: "center", color }}>
                {icon}
              </div>

              {/* AVATAR */}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                {(entry.username || "S")[0].toUpperCase()}
              </div>

              {/* INFO */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "14px",
                  }}
                >
                  {entry.username} {isCurrent && "(you)"}
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: league.color,
                    fontWeight: 700,
                  }}
                >
                  {league.name} League
                </div>

                {/* PROGRESS BAR */}
                {next && (
                  <div
                    style={{
                      height: "4px",
                      background: "#222",
                      borderRadius: "10px",
                      marginTop: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(progress, 100)}%`,
                        height: "100%",
                        background: league.color,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* SCORE */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800 }}>{entry.score}</div>
                <div style={{ fontSize: "10px", opacity: 0.6 }}>
                  XP
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
