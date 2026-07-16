"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExamResult {
  id: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  // score = percentage 0–100, stored as data.percentage from exam-sim.
  // Always use directly — never divide by total_questions.
  score: number;
  total_questions: number;
  correct_answers: number;
  weak_areas: string[];
  time_taken: number;   // seconds
  created_at: string;
}

interface SubjectStats {
  subject: string;
  attempts: number;
  avgScore: number;
  bestScore: number;
  trend: "improving" | "declining" | "stable";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8000;

// ─── Helpers (preserved from original source) ────────────────────────────────

function getGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: "A*", color: "#f59e0b" };
  if (score >= 80) return { grade: "A",  color: "#22c55e" };
  if (score >= 70) return { grade: "B",  color: "#22c55e" };
  if (score >= 60) return { grade: "C",  color: "#6366f1" };
  if (score >= 50) return { grade: "D",  color: "#8b5cf6" };
  if (score >= 40) return { grade: "E",  color: "#f59e0b" };
  return { grade: "U", color: "var(--danger)" };
}

function getTrendIcon(trend: string): { icon: string; color: string } {
  if (trend === "improving") return { icon: "↑", color: "#22c55e" };
  if (trend === "declining") return { icon: "↓", color: "var(--danger)" };
  return { icon: "→", color: "var(--muted-foreground)" };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  const pulse: React.CSSProperties = {
    background: "var(--muted)", borderRadius: "8px",
    animation: "an-pulse 1.5s ease-in-out infinite",
  };
  const card: React.CSSProperties = {
    background: "var(--card)", border: "1px solid var(--card-border)",
    borderRadius: "12px", padding: "16px",
  };

  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ ...pulse, height: "10px", width: "100px" }} />
        <div style={{ ...pulse, height: "26px", width: "180px", animationDelay: "0.1s" }} />
        <div style={{ ...pulse, height: "10px", width: "240px", animationDelay: "0.15s" }} />
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {[0, 0.08, 0.16, 0.24].map((delay, i) => (
          <div key={i} style={{ ...pulse, height: "80px", borderRadius: "12px", animationDelay: `${delay}s` }} />
        ))}
      </div>

      {/* Subject breakdown */}
      <div style={card}>
        <div style={{ ...pulse, height: "12px", width: "80px", marginBottom: "16px" }} />
        {[0, 0.1, 0.2].map((delay, i) => (
          <div key={i} style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <div style={{ ...pulse, height: "12px", width: "100px", animationDelay: `${delay}s` }} />
              <div style={{ ...pulse, height: "12px", width: "36px",  animationDelay: `${delay}s` }} />
            </div>
            <div style={{ ...pulse, height: "5px", width: "100%", borderRadius: "99px", animationDelay: `${delay}s` }} />
          </div>
        ))}
      </div>

      {/* Recent exams */}
      <div style={card}>
        <div style={{ ...pulse, height: "12px", width: "90px", marginBottom: "16px" }} />
        {[0, 0.08, 0.16, 0.24].map((delay, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div style={{ ...pulse, width: "36px", height: "36px", borderRadius: "8px", flexShrink: 0, animationDelay: `${delay}s` }} />
            <div style={{ flex: 1 }}>
              <div style={{ ...pulse, height: "12px", width: "65%", marginBottom: "5px", animationDelay: `${delay}s` }} />
              <div style={{ ...pulse, height: "10px", width: "40%", animationDelay: `${delay}s` }} />
            </div>
            <div style={{ ...pulse, width: "36px", height: "16px", borderRadius: "4px", flexShrink: 0, animationDelay: `${delay}s` }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes an-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function AnalyticsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", marginBottom: "16px" }}>
        ⚠️
      </div>
      <p style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>Couldn't load analytics</p>
      <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "20px", maxWidth: "260px" }}>
        This may be a connection issue. Your data is safe — try again when you're back online.
      </p>
      <button onClick={onRetry} style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: "10px", padding: "10px 24px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
        Try again
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [results,  setResults]  = useState<ExamResult[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [fetchKey, setFetchKey] = useState(0); // increment to retry

  const router = useRouter();
  // Memoized client — prevents new instance on every render
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setLoading(true);

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setError(true);
      }
    }, FETCH_TIMEOUT_MS);

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          clearTimeout(timeoutId);
          router.push("/auth/login");
          return;
        }

        const { data, error: queryError } = await supabase
          .from("exam_results")
          // Explicit column selection — no select("*") over-fetch
          .select("id, subject, topic, difficulty, score, total_questions, correct_answers, weak_areas, time_taken, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        clearTimeout(timeoutId);
        if (cancelled) return;

        if (queryError) throw queryError;

        setResults(data || []);
        setLoading(false);
      } catch (err) {
        clearTimeout(timeoutId);
        if (!cancelled) {
          console.error("[Analytics] init failed:", err);
          setLoading(false);
          setError(true);
        }
      }
    };

    init();
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [router, supabase, fetchKey]);

  if (loading) return <AnalyticsSkeleton />;
  if (error)   return <AnalyticsError onRetry={() => setFetchKey(k => k + 1)} />;

  // ── Derived stats (preserved exactly from original source) ────────────

  const totalExams = results.length;
  const avgScore   = totalExams > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalExams)
    : 0;
  const bestScore  = totalExams > 0 ? Math.max(...results.map(r => r.score)) : 0;
  // time_taken is in seconds; display as minutes
  const totalTime  = results.reduce((sum, r) => sum + (r.time_taken || 0), 0);

  // Subject breakdown
  const subjectMap: Record<string, ExamResult[]> = {};
  results.forEach(r => {
    if (!subjectMap[r.subject]) subjectMap[r.subject] = [];
    subjectMap[r.subject].push(r);
  });

  const subjectStats: SubjectStats[] = Object.entries(subjectMap).map(([subject, exams]) => {
    const sorted   = [...exams].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const avgScore = Math.round(exams.reduce((sum, e) => sum + e.score, 0) / exams.length);
    const bestScore = Math.max(...exams.map(e => e.score));

    let trend: "improving" | "declining" | "stable" = "stable";
    if (sorted.length >= 2) {
      const first = sorted[0].score;
      const last  = sorted[sorted.length - 1].score;
      if (last - first > 10) trend = "improving";
      else if (first - last > 10) trend = "declining";
    }

    return { subject, attempts: exams.length, avgScore, bestScore, trend };
  }).sort((a, b) => b.attempts - a.attempts);

  // Weak areas
  const weakAreaCount: Record<string, number> = {};
  results.forEach(r => {
    (r.weak_areas || []).forEach(area => {
      weakAreaCount[area] = (weakAreaCount[area] || 0) + 1;
    });
  });
  const topWeakAreas = Object.entries(weakAreaCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const cardStyle: React.CSSProperties = {
    background: "var(--card)", border: "1px solid var(--card-border)",
    borderRadius: "12px", padding: "16px",
  };

  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

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

      {/* Empty state */}
      {totalExams === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "40px" }}>
          <p style={{ fontSize: "3rem", marginBottom: "12px" }}>📊</p>
          <p style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>No exams yet</p>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginBottom: "16px" }}>
            Complete an exam simulation to see your analytics here.
          </p>
          <button onClick={() => router.push("/exam-sim")}
            style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>
            Start Exam →
          </button>
        </div>
      ) : (
        <>
          {/* Overview stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { label: "Exams taken",   value: totalExams,                          icon: "📝", color: "#6366f1" },
              { label: "Average score", value: `${avgScore}%`,                      icon: "📊", color: avgScore >= 60 ? "#22c55e" : "#f59e0b" },
              { label: "Best score",    value: `${bestScore}%`,                     icon: "⭐", color: "#f59e0b" },
              { label: "Time studied",  value: `${Math.round(totalTime / 60)}m`,   icon: "⏱", color: "#8b5cf6" },
            ].map(stat => (
              <div key={stat.label} style={{ background: `${stat.color}10`, border: `1px solid ${stat.color}30`, borderRadius: "12px", padding: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "14px" }}>{stat.icon}</span>
                  <p style={{ fontSize: "11px", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, margin: 0 }}>
                    {stat.label}
                  </p>
                </div>
                <p style={{ fontSize: "26px", fontWeight: 800, color: stat.color, margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Subject breakdown */}
          {subjectStats.length > 0 && (
            <div style={cardStyle}>
              <p style={{ fontWeight: 700, marginBottom: "12px", fontSize: "14px" }}>By Subject</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {subjectStats.map(stat => {
                  const { grade, color }       = getGrade(stat.avgScore);
                  const { icon,  color: trendColor } = getTrendIcon(stat.trend);
                  return (
                    <div key={stat.subject}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <p style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>{stat.subject}</p>
                          <span style={{ fontSize: "12px", color: trendColor, fontWeight: 700 }}>{icon}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: `${color}15`, color, fontWeight: 700 }}>
                            {grade}
                          </span>
                          <p style={{ fontSize: "13px", fontWeight: 700, color, margin: 0 }}>{stat.avgScore}%</p>
                        </div>
                      </div>
                      <div style={{ background: "var(--muted)", borderRadius: "99px", height: "5px" }}>
                        <div style={{ background: color, borderRadius: "99px", height: "5px", width: `${stat.avgScore}%`, transition: "width 0.5s ease", boxShadow: `0 0 6px ${color}60` }} />
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
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "16px" }}>
              <p style={{ fontWeight: 700, marginBottom: "10px", fontSize: "14px", color: "var(--danger)" }}>
                ⚠ Areas needing attention
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {topWeakAreas.map(([area, count]) => (
                  <div key={area} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: "13px", color: "var(--foreground)", margin: 0 }}>{area}</p>
                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: "rgba(239,68,68,0.1)", color: "var(--danger)", fontWeight: 600 }}>
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
                const date = new Date(result.created_at).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short",
                });
                // score is already a percentage — display directly
                const pct = Math.round(result.score);
                return (
                  <div key={result.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "8px", background: "var(--muted)" }}>
                    {/* Grade badge */}
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", flexShrink: 0, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "14px", color }}>
                      {grade}
                    </div>

                    {/* Subject + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {result.subject}{result.topic ? ` — ${result.topic}` : ""}
                      </p>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", margin: "1px 0 0" }}>
                        {result.difficulty} · {date}
                        {result.correct_answers != null && result.total_questions != null
                          ? ` · ${result.correct_answers}/${result.total_questions} correct`
                          : ""}
                      </p>
                    </div>

                    {/* Score — already a percentage */}
                    <p style={{ fontSize: "16px", fontWeight: 800, color, flexShrink: 0, margin: 0 }}>
                      {pct}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <button onClick={() => router.push("/exam-sim")}
            style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: "12px", padding: "14px", fontWeight: 700, fontSize: "15px", cursor: "pointer", boxShadow: "0 0 16px var(--primary-glow)" }}>
            Take Another Exam →
          </button>
        </>
      )}
    </div>
  );
}
