"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface ExamResult {
  id: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  weak_areas: string[];
  time_taken: number;
  created_at: string;
}

interface SubjectStats {
  subject: string;
  attempts: number;
  avgScore: number;
  bestScore: number;
  trend: "improving" | "declining" | "stable";
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div style={{ padding: "60px 24px 100px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ height: "10px", width: "100px", borderRadius: "6px", background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ height: "24px", width: "180px", borderRadius: "6px", background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ height: "10px", width: "240px", borderRadius: "6px", background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>

      {/* Stat cards skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            borderRadius: "12px", padding: "14px", height: "80px",
            background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite",
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}
      </div>

      {/* Subject breakdown skeleton */}
      <div style={{
        background: "var(--card)", border: "1px solid var(--card-border)",
        borderRadius: "12px", padding: "16px",
      }}>
        <div style={{ height: "12px", width: "80px", borderRadius: "6px", background: "var(--muted)", marginBottom: "16px", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ height: "12px", width: "100px", borderRadius: "6px", background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: "12px", width: "40px", borderRadius: "6px", background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
              </div>
              <div style={{ height: "5px", borderRadius: "99px", background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Recent exams skeleton */}
      <div style={{
        background: "var(--card)", border: "1px solid var(--card-border)",
        borderRadius: "12px", padding: "16px",
      }}>
        <div style={{ height: "12px", width: "90px", borderRadius: "6px", background: "var(--muted)", marginBottom: "16px", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "10px 12px", borderRadius: "8px", background: "var(--muted)",
              animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.08}s`,
            }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--card)", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
                <div style={{ height: "11px", width: "60%", borderRadius: "4px", background: "var(--card)" }} />
                <div style={{ height: "9px", width: "40%", borderRadius: "4px", background: "var(--card)" }} />
              </div>
              <div style={{ width: "32px", height: "16px", borderRadius: "4px", background: "var(--card)", flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let cancelled = false;

    // Hard timeout — prevents infinite loading on network failure or Supabase error
    const timeoutId = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          clearTimeout(timeoutId);
          router.push("/auth/login");
          return;
        }
        setUserId(user.id);

        const { data } = await supabase
          .from("exam_results")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        clearTimeout(timeoutId);
        if (!cancelled) {
          setResults(data || []);
          setLoading(false);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (!cancelled) {
          console.error("[Analytics] init failed:", err);
          setLoading(false);
        }
      }
    };

    init();
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [router, supabase]);

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };

  // ── Derived stats (unchanged) ──────────────────────────────────────────────

  const totalExams = results.length;
  const avgScore = totalExams > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalExams)
    : 0;
  const bestScore = totalExams > 0 ? Math.max(...results.map(r => r.score)) : 0;
  const totalTime = results.reduce((sum, r) => sum + (r.time_taken || 0), 0);

  const subjectMap: Record<string, ExamResult[]> = {};
  results.forEach(r => {
    if (!subjectMap[r.subject]) subjectMap[r.subject] = [];
    subjectMap[r.subject].push(r);
  });

  const subjectStats: SubjectStats[] = Object.entries(subjectMap).map(([subject, exams]) => {
    const sorted = [...exams].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const avgScore = Math.round(exams.reduce((sum, e) => sum + e.score, 0) / exams.length);
    const bestScore = Math.max(...exams.map(e => e.score));

    let trend: "improving" | "declining" | "stable" = "stable";
    if (sorted.length >= 2) {
      const first = sorted[0].score;
      const last = sorted[sorted.length - 1].score;
      if (last - first > 10) trend = "improving";
      else if (first - last > 10) trend = "declining";
    }

    return { subject, attempts: exams.length, avgScore, bestScore, trend };
  }).sort((a, b) => b.attempts - a.attempts);

  const weakAreaCount: Record<string, number> = {};
  results.forEach(r => {
    (r.weak_areas || []).forEach(area => {
      weakAreaCount[area] = (weakAreaCount[area] || 0) + 1;
    });
  });
  const topWeakAreas = Object.entries(weakAreaCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const getGrade = (score: number) => {
    if (score >= 90) return { grade: "A*", color: "#f59e0b" };
    if (score >= 80) return { grade: "A", color: "#22c55e" };
    if (score >= 70) return { grade: "B", color: "#22c55e" };
    if (score >= 60) return { grade: "C", color: "#6366f1" };
    if (score >= 50) return { grade: "D", color: "#8b5cf6" };
    if (score >= 40) return { grade: "E", color: "#f59e0b" };
    return { grade: "U", color: "#ef4444" };
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return { icon: "↑", color: "#22c55e" };
    if (trend === "declining") return { icon: "↓", color: "#ef4444" };
    return { icon: "→", color: "#94a3b8" };
  };

  // ── State gates ────────────────────────────────────────────────────────────

  if (loading) return <AnalyticsSkeleton />;

  // ── Render (100% preserved from original) ─────────────────────────────────

  return (
    <div style={{ padding: "60px 24px 100px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div>
        <p style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>
          Cortex Analytics
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>Performance</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
          Your exam history and progress patterns
        </p>
      </div>

      {totalExams === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "40px" }}>
          <p style={{ fontSize: "3rem", marginBottom: "12px" }}>📊</p>
          <p style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>No exams yet</p>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginBottom: "16px" }}>
            Complete an exam simulation to see your analytics here.
          </p>
          <button
            onClick={() => router.push("/exam-sim")}
            style={{
              background: "var(--primary)", color: "white", border: "none",
              borderRadius: "8px", padding: "10px 20px", fontWeight: 700,
              fontSize: "14px", cursor: "pointer",
            }}
          >
            Start Exam →
          </button>
        </div>
      ) : (
        <>
          {/* Overview stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { label: "Exams taken", value: totalExams, icon: "📝", color: "#6366f1" },
              { label: "Average score", value: `${avgScore}%`, icon: "📊", color: avgScore >= 60 ? "#22c55e" : "#f59e0b" },
              { label: "Best score", value: `${bestScore}%`, icon: "⭐", color: "#f59e0b" },
              { label: "Time studied", value: `${Math.round(totalTime / 60)}m`, icon: "⏱", color: "#8b5cf6" },
            ].map(stat => (
              <div key={stat.label} style={{
                background: `${stat.color}10`,
                border: `1px solid ${stat.color}30`,
                borderRadius: "12px",
                padding: "14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "14px" }}>{stat.icon}</span>
                  <p style={{ fontSize: "11px", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                    {stat.label}
                  </p>
                </div>
                <p style={{ fontSize: "26px", fontWeight: 800, color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Subject breakdown */}
          {subjectStats.length > 0 && (
            <div style={cardStyle}>
              <p style={{ fontWeight: 700, marginBottom: "12px", fontSize: "14px" }}>By Subject</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {subjectStats.map(stat => {
                  const { grade, color } = getGrade(stat.avgScore);
                  const { icon, color: trendColor } = getTrendIcon(stat.trend);
                  return (
                    <div key={stat.subject}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <p style={{ fontSize: "14px", fontWeight: 600 }}>{stat.subject}</p>
                          <span style={{ fontSize: "12px", color: trendColor, fontWeight: 700 }}>{icon}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{
                            fontSize: "11px", padding: "2px 8px", borderRadius: "20px",
                            background: `${color}15`, color, fontWeight: 700,
                          }}>
                            {grade}
                          </span>
                          <p style={{ fontSize: "13px", fontWeight: 700, color }}>{stat.avgScore}%</p>
                        </div>
                      </div>
                      <div style={{ background: "var(--muted)", borderRadius: "99px", height: "5px" }}>
                        <div style={{
                          background: color, borderRadius: "99px", height: "5px",
                          width: `${stat.avgScore}%`, transition: "width 0.5s ease",
                          boxShadow: `0 0 6px ${color}60`,
                        }} />
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "3px" }}>
                        {stat.attempts} attempt{stat.attempts !== 1 ? "s" : ""} · Best: {stat.bestScore}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weak areas */}
          {topWeakAreas.length > 0 && (
            <div style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "12px",
              padding: "16px",
            }}>
              <p style={{ fontWeight: 700, marginBottom: "10px", fontSize: "14px", color: "#ef4444" }}>
                ⚠ Areas needing attention
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {topWeakAreas.map(([area, count]) => (
                  <div key={area} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: "13px", color: "var(--foreground)" }}>{area}</p>
                    <span style={{
                      fontSize: "11px", padding: "2px 8px", borderRadius: "20px",
                      background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 600,
                    }}>
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent exams */}
          <div style={cardStyle}>
            <p style={{ fontWeight: 700, marginBottom: "12px", fontSize: "14px" }}>Recent Exams</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {results.slice(0, 10).map(result => {
                const { grade, color } = getGrade(result.score);
                const date = new Date(result.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                return (
                  <div key={result.id} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 12px", borderRadius: "8px", background: "var(--muted)",
                  }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "8px", flexShrink: 0,
                      background: `${color}15`, display: "flex", alignItems: "center",
                      justifyContent: "center", fontWeight: 800, fontSize: "14px", color,
                    }}>
                      {grade}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {result.subject}{result.topic ? ` — ${result.topic}` : ""}
                      </p>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "1px" }}>
                        {result.difficulty} · {date}
                      </p>
                    </div>
                    <p style={{ fontSize: "16px", fontWeight: 800, color, flexShrink: 0 }}>
                      {result.score}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push("/exam-sim")}
            style={{
              background: "var(--primary)", color: "white", border: "none",
              borderRadius: "12px", padding: "14px", fontWeight: 700,
              fontSize: "15px", cursor: "pointer", boxShadow: "0 0 16px var(--primary-glow)",
            }}
          >
            Take Another Exam →
          </button>
        </>
      )}
    </div>
  );
}
