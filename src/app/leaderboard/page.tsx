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
  weekly_xp?: number;
  last_active?: string;
  score?: number;
}

/* ---------------- SEASON ---------------- */

function getCurrentWeekKey() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  return start.toISOString().split("T")[0];
}

/* ---------------- LEAGUES ---------------- */

function getLeague(score: number) {
  if (score >= 1500) return { name: "Diamond", color: "#60a5fa" };
  if (score >= 900) return { name: "Gold", color: "#f59e0b" };
  if (score >= 400) return { name: "Silver", color: "#94a3b8" };
  return { name: "Bronze", color: "#cd7c2f" };
}

/* ---------------- SCORE ---------------- */

function computeScore(u: LeaderboardEntry) {
  return (u.weekly_xp || 0) + (u.level || 1) * 50 + (u.streak || 0) * 20;
}

/* ---------------- XP DECAY ---------------- */

function applyXpDecay(lastActive?: string, weeklyXp: number = 0) {
  if (!lastActive) return weeklyXp;

  const last = new Date(lastActive);
  const now = new Date();

  const diffDays =
    (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays > 2) {
    return Math.max(0, weeklyXp - Math.floor(diffDays * 10));
  }

  return weeklyXp;
}

/* ---------------- COMPONENT ---------------- */

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const weekKey = getCurrentWeekKey();

  /* ---------------- FETCH ---------------- */

  const fetchLeaderboard = async () => {
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
      .select("id, username, xp, level, streak, weekly_xp, last_active");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const ranked = (data || [])
      .map((u: LeaderboardEntry) => {
        const adjustedWeekly = applyXpDecay(
          u.last_active,
          u.weekly_xp || 0
        );

        const score = computeScore({
          ...u,
          weekly_xp: adjustedWeekly,
        });

        const league = getLeague(score);

        return {
          ...u,
          weekly_xp: adjustedWeekly,
          score,
          league: league.name,
        };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    setEntries(ranked);
    setLoading(false);
  };

  /* ---------------- INIT ---------------- */

  useEffect(() => {
    fetchLeaderboard();

    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  /* ---------------- CURRENT RANK ---------------- */

  const currentUserRank = useMemo(() => {
    const index = entries.findIndex((e) => e.id === currentUserId);
    return index >= 0 ? index + 1 : null;
  }, [entries, currentUserId]);

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        Loading leaderboard...
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div style={{ padding: "60px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* HEADER */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>
          Weekly Leaderboard
        </h1>

        <p style={{ fontSize: "13px", opacity: 0.6 }}>
          Season: {weekKey}
        </p>
      </div>

      {/* USER RANK */}
      {currentUserRank && (
        <div style={{
          padding: "12px",
          borderRadius: "10px",
          background: "rgba(99,102,241,0.08)",
        }}>
          Your rank: <b>#{currentUserRank}</b>
        </div>
      )}

      {/* LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {entries.map((entry, index) => {
          const rank = index + 1;
          const league = getLeague(entry.score || 0);
          const isMe = entry.id === currentUserId;

          return (
            <div
              key={entry.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px",
                borderRadius: "10px",
                background: isMe ? "rgba(99,102,241,0.08)" : "transparent",
                border: isMe ? "1px solid rgba(99,102,241,0.2)" : "none",
              }}
            >

              {/* LEFT */}
              <div>
                <div style={{ fontWeight: 700 }}>
                  #{rank} {entry.username} {isMe && "(you)"}
                </div>

                <div style={{ fontSize: "11px", color: league.color }}>
                  {league.name} League
                </div>
              </div>

              {/* RIGHT */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800 }}>
                  {entry.score}
                </div>

                <div style={{ fontSize: "10px", opacity: 0.6 }}>
                  weekly XP
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
