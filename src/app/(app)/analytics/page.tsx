"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import ExportMenu from "@/components/exports/ExportMenu";

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

const FETCH_TIMEOUT_MS = 8000;

function getGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: "A*", color: "#f59e0b" };
  if (score >= 80) return { grade: "A", color: "#22c55e" };
  if (score >= 70) return { grade: "B", color: "#22c55e" };
  if (score >= 60) return { grade: "C", color: "#6366f1" };
  if (score >= 50) return { grade: "D", color: "#8b5cf6" };
  if (score >= 40) return { grade: "E", color: "#f59e0b" };
  return { grade: "U", color: "var(--danger)" };
}

function getTrendIcon(trend: SubjectStats["trend"]): { icon: string; color: string } {
  if (trend === "improving") return { icon: "↑", color: "#22c55e" };
  if (trend === "declining") return { icon: "↓", color: "var(--danger)" };
  return { icon: "→", color: "var(--muted-foreground)" };
}

function AnalyticsSkeleton() {
  const pulse: React.CSSProperties = { background: "var(--muted)", borderRadius: "8px", animation: "an-pulse 1.5s ease-in-out infinite" };
  const card: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px" };
  return <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}><div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><div style={{ ...pulse, height: "10px", width: "100px" }} /><div style={{ ...pulse, height: "26px", width: "180px" }} /><div style={{ ...pulse, height: "10px", width: "240px" }} /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>{[0, 1, 2, 3].map(i => <div key={i} style={{ ...pulse, height: "80px" }} />)}</div><div style={card}><div style={{ ...pulse, height: "12px", width: "80px", marginBottom: "16px" }} />{[0, 1, 2].map(i => <div key={i} style={{ marginBottom: "14px" }}><div style={{ ...pulse, height: "12px", width: "100%", marginBottom: "6px" }} /><div style={{ ...pulse, height: "5px", width: "100%" }} /></div>)}</div><style>{`@keyframes an-pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style></div>;
}

function AnalyticsError({ onRetry }: { onRetry: () => void }) {
  return <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}><div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>⚠️</div><p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Couldn&apos;t load analytics</p><p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20, maxWidth: 260 }}>This may be a connection issue. Your data is safe. Try again when you&apos;re back online.</p><button onClick={onRetry} style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Try again</button></div>;
}

export default function Analytics() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let cancelled = false;
    setError(false); setLoading(true);
    const timeoutId = setTimeout(() => { if (!cancelled) { setLoading(false); setError(true); } }, FETCH_TIMEOUT_MS);
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { clearTimeout(timeoutId); router.push("/auth/login"); return; }
        const { data, error: queryError } = await supabase.from("exam_results").select("id, subject, topic, difficulty, score, total_questions, correct_answers, weak_areas, time_taken, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
        clearTimeout(timeoutId);
        if (cancelled) return;
        if (queryError) throw queryError;
        setResults((data ?? []).map((row) => ({ ...row, weak_areas: Array.isArray(row.weak_areas) ? row.weak_areas : [] })) as ExamResult[]);
        setLoading(false);
      } catch (err) {
        clearTimeout(timeoutId);
        if (!cancelled) { console.error("[Analytics] init failed:", err); setLoading(false); setError(true); }
      }
    };
    void init();
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [router, supabase, fetchKey]);

  if (loading) return <AnalyticsSkeleton />;
  if (error) return <AnalyticsError onRetry={() => setFetchKey(k => k + 1)} />;

  const totalExams = results.length;
  const avgScore = totalExams ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalExams) : 0;
  const bestScore = totalExams ? Math.max(...results.map(r => r.score)) : 0;
  const totalTime = results.reduce((sum, r) => sum + (r.time_taken || 0), 0);
  const subjectMap: Record<string, ExamResult[]> = {};
  results.forEach(r => { (subjectMap[r.subject] ??= []).push(r); });
  const subjectStats: SubjectStats[] = Object.entries(subjectMap).map(([subject, exams]) => {
    const sorted = [...exams].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const avg = Math.round(exams.reduce((sum, e) => sum + e.score, 0) / exams.length);
    const best = Math.max(...exams.map(e => e.score));
    let trend: SubjectStats["trend"] = "stable";
    if (sorted.length >= 2) { const delta = sorted[sorted.length - 1].score - sorted[0].score; if (delta > 10) trend = "improving"; else if (delta < -10) trend = "declining"; }
    return { subject, attempts: exams.length, avgScore: avg, bestScore: best, trend };
  }).sort((a, b) => b.attempts - a.attempts);
  const weakAreaCount: Record<string, number> = {};
  results.forEach(r => r.weak_areas.forEach(area => { weakAreaCount[area] = (weakAreaCount[area] ?? 0) + 1; }));
  const topWeakAreas = Object.entries(weakAreaCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const exportData = results.map(r => ({ id: r.id, subject: r.subject, topic: r.topic, difficulty: r.difficulty, scorePercent: Math.round(r.score), grade: getGrade(r.score).grade, correct: r.correct_answers, questions: r.total_questions, timeSeconds: r.time_taken, weakAreas: r.weak_areas, completedAt: r.created_at }));
  const cardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16 };

  return <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}><div><p style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Cortex Analytics</p><h1 style={{ fontSize: 28, fontWeight: 800 }}>Performance</h1><p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>Your exam history and progress patterns</p></div>{totalExams > 0 && <ExportMenu filename="shadecode-performance" data={exportData} label="Export" exportType="performance_summary" sourceType="analytics" />}</div>
    {totalExams === 0 ? <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}><p style={{ fontSize: "3rem", marginBottom: 12 }}>📊</p><p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No exams yet</p><p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 16 }}>Complete an exam simulation to see your analytics here.</p><button onClick={() => router.push("/exam-sim")} style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Start Exam →</button></div> : <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{[{ label: "Exams taken", value: totalExams, icon: "📝", color: "#6366f1" }, { label: "Average score", value: `${avgScore}%`, icon: "📊", color: avgScore >= 60 ? "#22c55e" : "#f59e0b" }, { label: "Best score", value: `${bestScore}%`, icon: "⭐", color: "#f59e0b" }, { label: "Time studied", value: `${Math.round(totalTime / 60)}m`, icon: "⏱", color: "#8b5cf6" }].map(stat => <div key={stat.label} style={{ background: `${stat.color}10`, border: `1px solid ${stat.color}30`, borderRadius: 12, padding: 14 }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span style={{ fontSize: 14 }}>{stat.icon}</span><p style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, margin: 0 }}>{stat.label}</p></div><p style={{ fontSize: 26, fontWeight: 800, color: stat.color, margin: 0 }}>{stat.value}</p></div>)}</div>
      {subjectStats.length > 0 && <div style={cardStyle}><p style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>By Subject</p><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{subjectStats.map(stat => { const { grade, color } = getGrade(stat.avgScore); const { icon, color: trendColor } = getTrendIcon(stat.trend); return <div key={stat.subject}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{stat.subject}</p><span style={{ fontSize: 12, color: trendColor, fontWeight: 700 }}>{icon}</span></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: `${color}15`, color, fontWeight: 700 }}>{grade}</span><p style={{ fontSize: 13, fontWeight: 700, color, margin: 0 }}>{stat.avgScore}%</p></div></div><div style={{ background: "var(--muted)", borderRadius: 99, height: 5 }}><div style={{ background: color, borderRadius: 99, height: 5, width: `${Math.min(stat.avgScore, 100)}%` }} /></div><p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 3 }}>{stat.attempts} attempt{stat.attempts !== 1 ? "s" : ""} · Best: {stat.bestScore}%</p></div>; })}</div></div>}
      {topWeakAreas.length > 0 && <div style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 12, padding: 16 }}><p style={{ fontWeight: 700, marginBottom: 10, fontSize: 14, color: "var(--danger)" }}>⚠ Areas needing attention</p>{topWeakAreas.map(([area, count]) => <div key={area} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}><p style={{ fontSize: 13, margin: 0 }}>{area}</p><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(239,68,68,.1)", color: "var(--danger)", fontWeight: 600 }}>{count}x</span></div>)}</div>}
      <div style={cardStyle}><p style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Recent Exams</p><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{results.slice(0, 10).map(result => { const { grade, color } = getGrade(result.score); const date = new Date(result.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); return <div key={result.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: "var(--muted)" }}><div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color }}>{grade}</div><div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{result.subject}{result.topic ? ` — ${result.topic}` : ""}</p><p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "1px 0 0" }}>{result.difficulty} · {date} · {result.correct_answers}/{result.total_questions} correct</p></div><p style={{ fontSize: 16, fontWeight: 800, color, flexShrink: 0, margin: 0 }}>{Math.round(result.score)}%</p></div>; })}</div></div>
      <button onClick={() => router.push("/exam-sim")} style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: 12, padding: 14, fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 0 16px var(--primary-glow)" }}>Take Another Exam →</button>
    </>}
  </div>;
}
