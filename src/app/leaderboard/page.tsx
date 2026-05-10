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
  achievements?: string[];
  last_active?: string;
  score?: number;
  league?: string;
  intervention?: any;
  difficulty?: string;
}

/* ---------------- SEASON ---------------- */

function getSeasonKey() {
  const now = new Date();
  return `S-${now.getFullYear()}-${now.getMonth() + 1}`;
}

/* ---------------- LEAGUES ---------------- */

function getLeague(score: number) {
  if (score >= 1500) return { name: "Diamond", color: "#60a5fa" };
  if (score >= 900) return { name: "Gold", color: "#f59e0b" };
  if (score >= 400) return { name: "Silver", color: "#94a3b8" };
  return { name: "Bronze", color: "#cd7c2f" };
}

/* ---------------- CORE SCORING ---------------- */

function computeScore(u: LeaderboardEntry) {
  const achievements = u.achievements?.length || 0;

  return (
    (u.weekly_xp || 0) +
    (u.level || 1) * 50 +
    (u.streak || 0) * 20 +
    achievements * 100
  );
}

/* ---------------- CORTEX INTERVENTION ---------------- */

function cortexIntervention(user: LeaderboardEntry) {
  const score = computeScore(user);

  if (score < 200) {
    return {
      type: "recovery",
      message: "Low consistency detected. Focus on rebuilding rhythm.",
    };
  }

  if (score > 1200) {
    return {
      type: "challenge",
      message: "Elite performance. Unlock harder learning paths.",
    };
  }

  return {
    type: "steady",
    message: "Stable progression. Maintain consistency.",
  };
}

/* ---------------- DIFFICULTY ENGINE ---------------- */

function getDifficulty(user: LeaderboardEntry) {
  if ((user.streak || 0) >= 5 && (user.weekly_xp || 0) > 500)
    return "hard";
  if ((user.streak || 0) < 2) return "easy";
  return "normal";
}

/* ---------------- ACHIEVEMENTS ---------------- */

function getAchievements(user: LeaderboardEntry) {
  const a: string[] = [];

  if ((user.streak || 0) >= 7) a.push("🔥 7 Day Streak");
  if ((user.xp || 0) >= 1000) a.push("⚡ XP Grinder");
  if ((user.level || 0) >= 5) a.push("📈 Level Climber");

  return a;
}

/* ---------------- COMPONENT ---------------- */

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const season = getSeasonKey();

  /* ---------------- FETCH ---------------- */

  const fetchData = async () => {
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
      .select(
        "id, username, xp, level, streak, weekly_xp, last_active"
      );

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const ranked = (data || [])
      .map((u: LeaderboardEntry) => {
        const achievements = getAchievements(u);
        const intervention = cortexIntervention({
          ...u,
          achievements,
        });
        const difficulty = getDifficulty(u);

        const score = computeScore({
          ...u,
          achievements,
        });

        const league = getLeague(score);

        return {
          ...u,
          achievements,
          intervention,
          difficulty,
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
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  /* ---------------- RANK ---------------- */

  const currentRank = useMemo(() => {
    const i = entries.findIndex((e) => e.id === currentUserId);
    return i >= 0 ? i + 1 : null;
  }, [entries, currentUserId]);

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return (
      <div style={{ padding: "60px", textAlign: "center" }}>
        Loading system...
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div style={{ padding: "60px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* HEADER */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>
          Season Leaderboard
        </h1>
        <p style={{ opacity: 0.6, fontSize: "13px" }}>
          Season: {season}
        </p>
      </div>

      {/* USER RANK */}
      {currentRank && (
        <div style={{
          padding: "12px",
          background: "rgba(99,102,241,0.08)",
          borderRadius: "10px",
        }}>
          Your rank: <b>#{currentRank}</b>
        </div>
      )}

      {/* LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {entries.map((e, i) => {
          const rank = i + 1;
          const isMe = e.id === currentUserId;

          return (
            <div
              key={e.id}
              style={{
                padding: "12px",
                borderRadius: "10px",
                background: isMe
                  ? "rgba(99,102,241,0.08)"
                  : "transparent",
                border: isMe
                  ? "1px solid rgba(99,102,241,0.2)"
                  : "none",
              }}
            >
              {/* TOP ROW */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <b>#{rank} {e.username} {isMe && "(you)"}</b>
                  <div style={{ fontSize: "11px", opacity: 0.7 }}>
                    {e.league} · {e.difficulty}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <b>{e.score}</b>
                  <div style={{ fontSize: "10px", opacity: 0.6 }}>
                    score
                  </div>
                </div>
              </div>

              {/* ACHIEVEMENTS */}
              {e.achievements?.length ? (
                <div style={{ fontSize: "11px", marginTop: "6px" }}>
                  {e.achievements.join(" · ")}
                </div>
              ) : null}

              {/* CORTEX INTERVENTION */}
              <div style={{ fontSize: "11px", marginTop: "4px", opacity: 0.7 }}>
                🧠 {e.intervention?.message}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
