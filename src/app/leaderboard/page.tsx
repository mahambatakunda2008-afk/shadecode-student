"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface LeaderboardEntry {
  id: string;
  username: string;
  xp: number;
  level: number;
  streak: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setCurrentUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("id, username, xp, level, streak")
        .order("xp", { ascending: false })
        .limit(50);

      setEntries(data || []);
      setLoading(false);
    };
    init();
  }, [router, supabase]);

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

  const currentUserRank = entries.findIndex(e => e.id === currentUserId) + 1;

  if (loading) return (
    <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
      Loading...
    </div>
  );

  return (
    <div style={{ padding: "60px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div>
        <p style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>
          Shadecode Student
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>Leaderboard</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
          Ranked by XP — updated live
        </p>
      </div>

      {/* Current user rank */}
      {currentUserRank > 0 && (
        <div style={{
          background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: "12px",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>Your rank</p>
          <p style={{ fontSize: "20px", fontWeight: 800, color: "var(--primary)" }}>
            #{currentUserRank}
          </p>
        </div>
      )}

      {/* Top 3 podium */}
      {entries.length >= 3 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {[entries[1], entries[0], entries[2]].map((entry, i) => {
            const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3;
            const { color, icon } = getRankStyle(actualRank);
            const height = actualRank === 1 ? "120px" : "90px";
            const isCurrentUser = entry?.id === currentUserId;

            return (
              <div key={entry?.id} style={{
                background: isCurrentUser ? "rgba(99,102,241,0.12)" : "var(--card)",
                border: `1px solid ${isCurrentUser ? "rgba(99,102,241,0.3)" : "var(--card-border)"}`,
                borderRadius: "12px",
                padding: "12px 8px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                height,
                gap: "4px",
              }}>
                <span style={{ fontSize: actualRank === 1 ? "1.8rem" : "1.4rem" }}>{icon}</span>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                  {entry?.username || "Student"}
                </p>
                <p style={{ fontSize: "13px", fontWeight: 800, color }}>
                  {entry?.xp || 0} XP
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div style={cardStyle}>
        {entries.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", textAlign: "center", padding: "24px" }}>
            No students yet. Be the first!
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {entries.map((entry, index) => {
              const rank = index + 1;
              const { color, icon } = getRankStyle(rank);
              const isCurrentUser = entry.id === currentUserId;

              return (
                <div key={entry.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  borderRadius: "10px",
                  background: isCurrentUser ? "rgba(99,102,241,0.08)" : "transparent",
                  border: isCurrentUser ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
                  transition: "background 0.2s",
                }}>
                  {/* Rank */}
                  <div style={{
                    width: "32px",
                    textAlign: "center",
                    fontSize: rank <= 3 ? "1.2rem" : "13px",
                    fontWeight: 700,
                    color,
                    flexShrink: 0,
                  }}>
                    {icon}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: isCurrentUser ? "rgba(99,102,241,0.3)" : "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: isCurrentUser ? "var(--primary)" : "var(--muted-foreground)",
                    flexShrink: 0,
                  }}>
                    {(entry.username || "S")[0].toUpperCase()}
                  </div>

                  {/* Name + level */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: "14px",
                      fontWeight: isCurrentUser ? 700 : 500,
                      color: isCurrentUser ? "var(--primary)" : "var(--foreground)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {entry.username || "Student"} {isCurrentUser && "(you)"}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "1px" }}>
                      Level {entry.level} {entry.streak > 1 ? `· 🔥 ${entry.streak}d` : ""}
                    </p>
                  </div>

                  {/* XP */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: "15px", fontWeight: 800, color }}>
                      {entry.xp}
                    </p>
                    <p style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
