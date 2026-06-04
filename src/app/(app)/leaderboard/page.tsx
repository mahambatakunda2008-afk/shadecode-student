"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Crown,
  Flame,
  Medal,
  Orbit,
  RefreshCcw,
  Trophy,
  Zap,
} from "lucide-react";

interface LeaderboardEntry {
  id: string;
  username: string;
  xp: number;
  season_xp: number;
  level: number;
  streak: number;
  current_season?: string;
  cortex_score?: number;
}

const CURRENT_SEASON = "S-2026-5";

export default function LeaderboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [entries, setEntries] = useState<
    LeaderboardEntry[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [currentUserId, setCurrentUserId] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState("");

  /* =========================
     FETCH LEADERBOARD
  ========================= */

  const fetchLeaderboard = useCallback(
    async () => {
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setCurrentUserId(user.id);
        }

        const { data, error } =
          await supabase
            .from("profiles")
            .select(`
              id,
              username,
              xp,
              season_xp,
              level,
              streak,
              current_season
            `)
            .eq(
              "current_season",
              CURRENT_SEASON
            )
            .order("season_xp", {
              ascending: false,
            })
            .order("xp", {
              ascending: false,
            })
            .order("streak", {
              ascending: false,
            })
            .order("level", {
              ascending: false,
            })
            .limit(100);

        if (error) {
          console.error(
            "Leaderboard error:",
            error
          );
        }

        /* =========================
           CORTEX SCORE
        ========================= */

        const leaderboardData: LeaderboardEntry[] =
          (data || [])
            .map((p) => {
              const seasonXP =
                typeof p.season_xp ===
                "number"
                  ? p.season_xp
                  : 0;

              const totalXP =
                typeof p.xp === "number"
                  ? p.xp
                  : 0;

              const streak =
                typeof p.streak ===
                "number"
                  ? p.streak
                  : 0;

              const level =
                typeof p.level ===
                "number"
                  ? p.level
                  : 1;

              const cortex_score =
                seasonXP * 1.0 +
                totalXP * 0.15 +
                streak * 40 +
                level * 75;

              return {
                id: p.id,

                username:
                  p.username ||
                  "Student",

                xp: totalXP,

                season_xp:
                  seasonXP,

                level,

                streak,

                current_season:
                  p.current_season,

                cortex_score,
              };
            })

            .sort(
              (a, b) =>
                (b.cortex_score || 0) -
                (a.cortex_score || 0)
            );

        setEntries(leaderboardData);

        setLastUpdated(
          new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          )
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  /* =========================
     INITIAL LOAD
  ========================= */

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  /* =========================
     REALTIME
  ========================= */

  useEffect(() => {
    const channel = supabase
      .channel("leaderboard-live")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchLeaderboard();
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeaderboard, supabase]);

  /* =========================
     HELPERS
  ========================= */

  const getRankStyle = (
    rank: number
  ) => {
    if (rank === 1) {
      return {
        color: "#f59e0b",
        bg: "rgba(245,158,11,0.12)",
        border:
          "1px solid rgba(245,158,11,0.22)",
        icon: <Crown size={18} />,
      };
    }

    if (rank === 2) {
      return {
        color: "#cbd5e1",
        bg: "rgba(203,213,225,0.08)",
        border:
          "1px solid rgba(203,213,225,0.18)",
        icon: <Medal size={18} />,
      };
    }

    if (rank === 3) {
      return {
        color: "#d97706",
        bg: "rgba(217,119,6,0.08)",
        border:
          "1px solid rgba(217,119,6,0.18)",
        icon: <Trophy size={18} />,
      };
    }

    return {
      color:
        "var(--muted-foreground)",

      bg: "transparent",

      border: "transparent",

      icon: (
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          #{rank}
        </span>
      ),
    };
  };

  const currentUserRank =
    entries.findIndex(
      (e) => e.id === currentUserId
    ) + 1;

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color:
            "var(--muted-foreground)",
          fontSize: "14px",
        }}
      >
        Cortex synchronizing rankings...
      </div>
    );
  }

  /* =========================
     PAGE
  ========================= */

  return (
    <div
      style={{
        padding:
          "32px 20px 24px",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          marginBottom: "28px",
        }}
      >
        <p
          style={{
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "var(--primary)",
            marginBottom: "8px",
          }}
        >
          Cortex OS
        </p>

        <h1
          style={{
            fontSize: "56px",
            lineHeight: 1,
            fontWeight: 900,
            margin: 0,
          }}
        >
          Season Leaderboard
        </h1>

        <p
          style={{
            marginTop: "14px",
            color:
              "var(--muted-foreground)",
            fontSize: "18px",
          }}
        >
          Adaptive competitive ecosystem ·{" "}
          {CURRENT_SEASON}
        </p>
      </div>

      {/* ACTIONS */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "22px",
        }}
      >
        <button
          onClick={fetchLeaderboard}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding:
              "12px 18px",
            borderRadius: "16px",
            border:
              "1px solid rgba(255,255,255,0.08)",
            background:
              "rgba(255,255,255,0.03)",
            color: "white",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          <RefreshCcw size={16} />
          Refresh
        </button>

        <div
          style={{
            fontSize: "13px",
            color:
              "var(--muted-foreground)",
          }}
        >
          Updated {lastUpdated}
        </div>
      </div>

      {/* CURRENT USER */}

      {currentUserRank > 0 && (
        <div
          style={{
            marginBottom: "22px",
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.16), rgba(99,102,241,0.04))",
            border:
              "1px solid rgba(99,102,241,0.2)",
            borderRadius: "24px",
            padding: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color:
                    "var(--muted-foreground)",
                }}
              >
                Your Position
              </p>

              <h2
                style={{
                  margin:
                    "8px 0 0 0",
                  fontSize: "42px",
                  fontWeight: 900,
                }}
              >
                #{currentUserRank}
              </h2>
            </div>

            <Orbit
              size={46}
              color="var(--primary)"
            />
          </div>
        </div>
      )}

      {/* EMPTY STATE */}

      {entries.length === 0 ? (
        <div
          style={{
            padding:
              "90px 24px",
            textAlign: "center",
            borderRadius: "28px",
            background:
              "rgba(255,255,255,0.03)",
            border:
              "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h2
            style={{
              fontSize: "34px",
              fontWeight: 900,
              marginBottom: "14px",
            }}
          >
            No rankings yet
          </h2>

          <p
            style={{
              color:
                "var(--muted-foreground)",
              maxWidth: "520px",
              margin: "0 auto",
              lineHeight: 1.8,
              fontSize: "15px",
            }}
          >
            Cortex has not detected
            enough competitive activity
            this season.
          </p>
        </div>
      ) : (
        <>
          {/* PODIUM */}

          {entries.length >= 3 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, 1fr)",
                gap: "16px",
                marginBottom: "26px",
              }}
            >
              {[
                entries[1],
                entries[0],
                entries[2],
              ].map(
                (
                  entry,
                  index
                ) => {
                  const actualRank =
                    index === 0
                      ? 2
                      : index === 1
                      ? 1
                      : 3;

                  const rankStyle =
                    getRankStyle(
                      actualRank
                    );

                  const isCurrentUser =
                    entry.id ===
                    currentUserId;

                  return (
                    <div
                      key={
                        entry.id
                      }
                      style={{
                        background:
                          rankStyle.bg,

                        border:
                          rankStyle.border,

                        borderRadius:
                          "26px",

                        padding:
                          "24px 18px",

                        textAlign:
                          "center",

                        transform:
                          actualRank ===
                          1
                            ? "translateY(-12px)"
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "center",

                          marginBottom:
                            "14px",

                          color:
                            rankStyle.color,
                        }}
                      >
                        {
                          rankStyle.icon
                        }
                      </div>

                      <div
                        style={{
                          width:
                            actualRank ===
                            1
                              ? "88px"
                              : "74px",

                          height:
                            actualRank ===
                            1
                              ? "88px"
                              : "74px",

                          borderRadius:
                            "50%",

                          background:
                            isCurrentUser
                              ? "rgba(99,102,241,0.35)"
                              : "rgba(255,255,255,0.06)",

                          margin:
                            "0 auto 14px",

                          display:
                            "flex",

                          alignItems:
                            "center",

                          justifyContent:
                            "center",

                          fontWeight: 900,

                          fontSize:
                            actualRank ===
                            1
                              ? "28px"
                              : "22px",
                        }}
                      >
                        {entry.username
                          .charAt(
                            0
                          )
                          .toUpperCase()}
                      </div>

                      <h3
                        style={{
                          margin: 0,
                          fontWeight: 800,
                          fontSize:
                            actualRank ===
                            1
                              ? "24px"
                              : "18px",
                        }}
                      >
                        {
                          entry.username
                        }
                      </h3>

                      <p
                        style={{
                          margin:
                            "10px 0 0 0",

                          fontSize:
                            actualRank ===
                            1
                              ? "30px"
                              : "22px",

                          fontWeight: 900,

                          color:
                            rankStyle.color,
                        }}
                      >
                        {Math.round(
                          entry.cortex_score ||
                            0
                        ).toLocaleString()}
                      </p>

                      <p
                        style={{
                          margin:
                            "4px 0 0 0",

                          fontSize:
                            "12px",

                          color:
                            "var(--muted-foreground)",
                        }}
                      >
                        cortex score
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* FULL LIST */}

          <div
            style={{
              background:
                "rgba(255,255,255,0.03)",

              border:
                "1px solid rgba(255,255,255,0.06)",

              borderRadius:
                "28px",

              overflow:
                "hidden",
            }}
          >
            {entries.map(
              (
                entry,
                index
              ) => {
                const rank =
                  index + 1;

                const rankStyle =
                  getRankStyle(
                    rank
                  );

                const isCurrentUser =
                  entry.id ===
                  currentUserId;

                return (
                  <div
                    key={
                      entry.id
                    }
                    style={{
                      display:
                        "flex",

                      alignItems:
                        "center",

                      gap: "16px",

                      padding:
                        "18px 20px",

                      borderBottom:
                        index !==
                        entries.length -
                          1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "none",

                      background:
                        isCurrentUser
                          ? "rgba(99,102,241,0.08)"
                          : "transparent",
                    }}
                  >
                    {/* RANK */}

                    <div
                      style={{
                        width:
                          "44px",

                        display:
                          "flex",

                        justifyContent:
                          "center",

                        color:
                          rankStyle.color,
                      }}
                    >
                      {
                        rankStyle.icon
                      }
                    </div>

                    {/* AVATAR */}

                    <div
                      style={{
                        width:
                          "52px",

                        height:
                          "52px",

                        borderRadius:
                          "50%",

                        background:
                          isCurrentUser
                            ? "rgba(99,102,241,0.3)"
                            : "rgba(255,255,255,0.06)",

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "center",

                        fontWeight: 900,

                        fontSize:
                          "18px",

                        flexShrink: 0,
                      }}
                    >
                      {entry.username
                        .charAt(
                          0
                        )
                        .toUpperCase()}
                    </div>

                    {/* INFO */}

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 800,
                          fontSize:
                            "16px",
                        }}
                      >
                        {
                          entry.username
                        }

                        {isCurrentUser &&
                          " (you)"}
                      </p>

                      <div
                        style={{
                          display:
                            "flex",

                          alignItems:
                            "center",

                          gap: "14px",

                          marginTop:
                            "6px",

                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap: "5px",

                            fontSize:
                              "12px",

                            color:
                              "var(--muted-foreground)",
                          }}
                        >
                          <Zap
                            size={
                              12
                            }
                          />
                          Level{" "}
                          {
                            entry.level
                          }
                        </div>

                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap: "5px",

                            fontSize:
                              "12px",

                            color:
                              "var(--muted-foreground)",
                          }}
                        >
                          <Flame
                            size={
                              12
                            }
                          />
                          {
                            entry.streak
                          }
                          d streak
                        </div>
                      </div>
                    </div>

                    {/* SCORE */}

                    <div
                      style={{
                        textAlign:
                          "right",

                        flexShrink: 0,

                        minWidth:
                          "120px",
                      }}
                    >
                      <div
                        style={{
                          fontSize:
                            "26px",

                          fontWeight: 900,

                          lineHeight: 1,
                        }}
                      >
                        {Math.round(
                          entry.cortex_score ||
                            0
                        ).toLocaleString()}
                      </div>

                      <div
                        style={{
                          fontSize:
                            "11px",

                          color:
                            "var(--muted-foreground)",

                          marginTop:
                            "6px",
                        }}
                      >
                        cortex score
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </>
      )}
    </div>
  );
}
