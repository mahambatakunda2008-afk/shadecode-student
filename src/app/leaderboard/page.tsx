"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface LeaderboardEntry {
  id: string;
  username: string;
  xp: number;
  level: number;
  streak: number;
  score?: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const [supabase] = useState(() => createClient());

  /* ---------------- SCORE SYSTEM ---------------- */

  const computeScore = (u: LeaderboardEntry) => {
    return (u.xp || 0) + (u.level || 1) * 50 + (u.streak || 0) * 20;
  };

  /* ---------------- FETCH DATA ---------------- */

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
        console.error("Leaderboard fetch error:", error);
        setLoading(false);
        return;
      }

      const ranked = (data || [])
        .map((u: LeaderboardEntry) => ({
          ...u,
          score: computeScore(u),
        }))
        .sort((a, b) => (b.score || 0) - (a.score || 0));

      setEntries(ranked);
      setLoading(false);
    };

    init();
  }, [router, supabase]);

  /* ---------------- STYLES ---------------- */

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { color: "#f59e0b", icon: "🥇" };
    if (rank === 2) return { color: "#94a3b8", icon: "🥈" };
    if (rank === 3) return { color: "#cd7c2f", icon: "🥉" };
    return { color: "var(--muted-foreground)", icon: `${rank}` };
  };

  /* ---------------- CURRENT USER RANK ---------------- */

  const currentUserRank = useMemo(() => {
    const index = entries.findIndex((e) => e.id === currentUserId);
    return index >= 0 ? index + 1 : null;
  }, [entries, currentUserId]);

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

  /* ---------------- UI ---------------- */

  return (
    <div
      style={{
        padding: "60px 24px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Header */}
      <div>
        <p
          style={{
            fontSize: "12px",
            color: "var(--primary)",
            fontWeight: 600,
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          Shadecode Student
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>
          Leaderboard
        </h1>
        <p
          style={{
            color: "var(--muted-foreground)",
            fontSize: "14px",
            marginTop: "4px",
          }}
        >
          Ranked by XP + Level + Streak
        </p>
      </div>

      {/* User rank */}
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
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
            Your rank
          </p>
          <p
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "var(--primary)",
            }}
          >
            #{currentUserRank}
          </p>
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <div style={cardStyle}>
          <p
            style={{
              color: "var(--muted-foreground)",
              textAlign: "center",
              fontSize: "14px",
            }}
          >
            No students found yet.
          </p>
        </div>
      )}

      {/* List */}
      <div style={cardStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {entries.map((entry, index) => {
            const rank = index + 1;
            const { color, icon } = getRankStyle(rank);
            const isCurrentUser = entry.id === currentUserId;

            return (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  borderRadius: "10px",
                  background: isCurrentUser
                    ? "rgba(99,102,241,0.08)"
                    : "transparent",
                  border: isCurrentUser
                    ? "1px solid rgba(99,102,241,0.2)"
                    : "1px solid transparent",
                }}
              >
                {/* Rank */}
                <div
                  style={{
                    width: "32px",
                    textAlign: "center",
                    fontWeight: 800,
                    color,
                  }}
                >
                  {icon}
                </div>

                {/* Avatar */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: isCurrentUser
                      ? "rgba(99,102,241,0.3)"
                      : "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: isCurrentUser
                      ? "var(--primary)"
                      : "var(--muted-foreground)",
                  }}
                >
                  {(entry.username || "S")[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: isCurrentUser ? 700 : 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.username || "Student"}{" "}
                    {isCurrentUser && "(you)"}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    Level {entry.level} · 🔥 {entry.streak}d
                  </p>
                </div>

                {/* Score */}
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontWeight: 800 }}>{entry.score}</p>
                  <p style={{ fontSize: "10px", opacity: 0.6 }}>score</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
