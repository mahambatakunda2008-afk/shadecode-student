"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

interface FocusSession {
  id: string;
  duration_minutes: number;
  xp_earned: number;
  mode: string | null;
  created_at: string;
}

interface LearningEvent {
  id: string;
  type: string;
  subject: string | null;
  topic: string | null;
  score: number | null;
  time_spent: number | null;
  created_at: string;
}

interface Task {
  id: string;
  completed: boolean;
  created_at: string;
}

interface TopicMastery {
  id: string;
  subject: string;
  topic: string;
  mastery_score: number;
  trend: number | null;
  recent_improvement: number | null;
  last_attempted: string | null;
}

const FETCH_TIMEOUT_MS = 10000;

function getGrade(score: number) {
  if (score >= 90) return { grade: "A*", color: "#f59e0b" };
  if (score >= 80) return { grade: "A", color: "#22c55e" };
  if (score >= 70) return { grade: "B", color: "#22c55e" };
  if (score >= 60) return { grade: "C", color: "#6366f1" };
  if (score >= 50) return { grade: "D", color: "#8b5cf6" };
  if (score >= 40) return { grade: "E", color: "#f59e0b" };
  return { grade: "U", color: "var(--danger)" };
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function AnalyticsSkeleton() {
  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ height: 70, borderRadius: 12, background: "var(--muted)", opacity: 0.6 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} style={{ height: 88, borderRadius: 12, background: "var(--muted)", opacity: 0.6 }} />)}
      </div>
      {[0, 1, 2].map((i) => <div key={i} style={{ height: 180, borderRadius: 12, background: "var(--muted)", opacity: 0.6 }} />)}
    </div>
  );
}

function AnalyticsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(239,68,68,.1)", display: "grid", placeItems: "center", fontSize: 22, marginBottom: 16 }}>⚠️</div>
      <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>Couldn&apos;t load analytics</p>
      <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 300, marginBottom: 20 }}>Your study data is still safe. Check your connection and try again.</p>
      <button onClick={onRetry} style={{ background: "var(--primary)", color: "white", border: 0, borderRadius: 10, padding: "10px 22px", fontWeight: 700, cursor: "pointer" }}>Try again</button>
    </div>
  );
}

export default function Analytics() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [learningEvents, setLearningEvents] = useState<LearningEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mastery, setMastery] = useState<TopicMastery[]>([]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(false);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Analytics request timed out")), FETCH_TIMEOUT_MS);
      });

      const request = (async () => {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) {
          router.push("/auth/login");
          return null;
        }

        const userId = authData.user.id;
        const [examQuery, focusQuery, eventQuery, taskQuery, masteryQuery] = await Promise.all([
          supabase.from("exam_results").select("id, subject, topic, difficulty, score, total_questions, correct_answers, weak_areas, time_taken, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
          supabase.from("focus_sessions").select("id, duration_minutes, xp_earned, mode, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
          supabase.from("learning_events").select("id, type, subject, topic, score, time_spent, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
          supabase.from("tasks").select("id, completed, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
          supabase.from("topic_mastery").select("id, subject, topic, mastery_score, trend, recent_improvement, last_attempted").eq("user_id", userId).order("mastery_score", { ascending: true }).limit(500),
        ]);

        const queries = [examQuery, focusQuery, eventQuery, taskQuery, masteryQuery];
        const failed = queries.find((query) => query.error);
        if (failed?.error) throw failed.error;

        return {
          exams: ((examQuery.data ?? []) as ExamResult[]).map((row) => ({ ...row, weak_areas: Array.isArray(row.weak_areas) ? row.weak_areas : [] })),
          focus: (focusQuery.data ?? []) as FocusSession[],
          events: (eventQuery.data ?? []) as LearningEvent[],
          tasks: (taskQuery.data ?? []) as Task[],
          mastery: (masteryQuery.data ?? []) as TopicMastery[],
        };
      })();

      const data = await Promise.race([request, timeout]);
      if (!data) return;
      setExams(data.exams);
      setFocusSessions(data.focus);
      setLearningEvents(data.events);
      setTasks(data.tasks);
      setMastery(data.mastery);
    } catch (err) {
      console.error("[Analytics] load failed:", err);
      setError(true);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => { void loadAnalytics(); }, [loadAnalytics, retry]);

  const metrics = useMemo(() => {
    const avg = exams.length ? Math.round(exams.reduce((sum, e) => sum + Number(e.score || 0), 0) / exams.length) : 0;
    const best = exams.length ? Math.max(...exams.map((e) => Number(e.score || 0))) : 0;
    const focusMinutes = focusSessions.reduce((sum, s) => sum + Math.max(0, Number(s.duration_minutes || 0)), 0);
    const learningMinutes = learningEvents.reduce((sum, e) => sum + Math.max(0, Number(e.time_spent || 0)) / 60, 0);
    const completedTasks = tasks.filter((task) => task.completed).length;
    const taskRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
    const totalXp = focusSessions.reduce((sum, s) => sum + Math.max(0, Number(s.xp_earned || 0)), 0);
    return { avg, best, focusMinutes: Math.round(focusMinutes), learningMinutes: Math.round(learningMinutes), completedTasks, taskRate, totalXp };
  }, [exams, focusSessions, learningEvents, tasks]);

  const subjectStats = useMemo(() => {
    const map = new Map<string, ExamResult[]>();
    for (const exam of exams) map.set(exam.subject, [...(map.get(exam.subject) ?? []), exam]);
    return [...map.entries()].map(([subject, rows]) => {
      const chronological = [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const avg = Math.round(rows.reduce((sum, e) => sum + Number(e.score || 0), 0) / rows.length);
      const delta = chronological.length > 1 ? Number(chronological.at(-1)?.score || 0) - Number(chronological[0]?.score || 0) : 0;
      return { subject, attempts: rows.length, avg, best: Math.max(...rows.map((e) => Number(e.score || 0))), trend: delta > 10 ? "improving" : delta < -10 ? "declining" : "stable" };
    }).sort((a, b) => b.attempts - a.attempts);
  }, [exams]);

  const weakAreas = useMemo(() => {
    const counts = new Map<string, number>();
    exams.forEach((exam) => exam.weak_areas.forEach((area) => counts.set(area, (counts.get(area) ?? 0) + 1)));
    mastery.filter((topic) => Number(topic.mastery_score) < 60).forEach((topic) => counts.set(`${topic.subject} · ${topic.topic}`, (counts.get(`${topic.subject} · ${topic.topic}`) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [exams, mastery]);

  const activity = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return date;
    });
    return days.map((day) => {
      const key = day.toISOString().slice(0, 10);
      const matches = (value: string) => new Date(value).toISOString().slice(0, 10) === key;
      const focus = focusSessions.filter((s) => matches(s.created_at)).reduce((sum, s) => sum + Number(s.duration_minutes || 0), 0);
      const learning = learningEvents.filter((e) => matches(e.created_at)).reduce((sum, e) => sum + Number(e.time_spent || 0) / 60, 0);
      const examsTaken = exams.filter((e) => matches(e.created_at)).length;
      return { label: day.toLocaleDateString("en-GB", { weekday: "short" }), minutes: Math.round(focus + learning), exams: examsTaken };
    });
  }, [exams, focusSessions, learningEvents]);

  const exportData = exams.map((exam) => ({ id: exam.id, subject: exam.subject, topic: exam.topic, difficulty: exam.difficulty, scorePercent: Math.round(Number(exam.score || 0)), grade: getGrade(Number(exam.score || 0)).grade, correct: exam.correct_answers, questions: exam.total_questions, timeSeconds: exam.time_taken, weakAreas: exam.weak_areas, completedAt: exam.created_at }));
  const hasData = exams.length || focusSessions.length || learningEvents.length || tasks.length || mastery.length;
  const cardStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16 };
  const maxActivity = Math.max(...activity.map((day) => day.minutes), 1);

  if (loading) return <AnalyticsSkeleton />;
  if (error) return <AnalyticsError onRetry={() => setRetry((value) => value + 1)} />;

  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <p style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Cortex Analytics</p>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Performance</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>A real picture of how you study, practise and perform.</p>
        </div>
        {exams.length > 0 && <ExportMenu filename="shadecode-performance" data={exportData} label="Export" exportType="performance_summary" sourceType="analytics" />}
      </div>

      {!hasData ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 44 }}>
          <p style={{ fontSize: "3rem", marginBottom: 12 }}>📊</p>
          <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>Your analytics will grow with you</p>
          <p style={{ color: "var(--muted-foreground)", fontSize: 14, maxWidth: 360, margin: "0 auto 18px" }}>Complete an exam, start a focus session, or work through a task and the dashboard will start building your learning picture.</p>
          <button onClick={() => router.push("/exam-sim")} style={{ background: "var(--primary)", color: "white", border: 0, borderRadius: 9, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}>Start practising →</button>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {[
              { label: "Average score", value: exams.length ? `${metrics.avg}%` : "—", icon: "📊" },
              { label: "Best score", value: exams.length ? `${metrics.best}%` : "—", icon: "⭐" },
              { label: "Focus time", value: `${metrics.focusMinutes}m`, icon: "⏱" },
              { label: "Tasks complete", value: tasks.length ? `${metrics.taskRate}%` : "—", icon: "✓" },
            ].map((stat) => (
              <div key={stat.label} style={{ ...cardStyle, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}><span>{stat.icon}</span><span style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>{stat.label}</span></div>
                <p style={{ fontSize: 25, fontWeight: 800, margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div><p style={{ fontWeight: 800, fontSize: 14, margin: 0 }}>Study activity</p><p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 3 }}>Focus sessions + learning time, last 7 days</p></div>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{metrics.focusMinutes + metrics.learningMinutes}m tracked</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, alignItems: "end", minHeight: 130 }}>
              {activity.map((day) => (
                <div key={day.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{day.minutes ? `${day.minutes}m` : ""}</span>
                  <div title={`${day.minutes} minutes${day.exams ? ` · ${day.exams} exam${day.exams === 1 ? "" : "s"}` : ""}`} style={{ width: "100%", maxWidth: 34, height: Math.max(8, Math.round((day.minutes / maxActivity) * 82)), borderRadius: 7, background: day.minutes ? "var(--primary)" : "var(--muted)", opacity: day.minutes ? 1 : 0.55 }} />
                  <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          {subjectStats.length > 0 && <div style={cardStyle}>
            <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>Performance by subject</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {subjectStats.map((stat) => {
                const { grade, color } = getGrade(stat.avg);
                const trend = stat.trend === "improving" ? "↑" : stat.trend === "declining" ? "↓" : "→";
                return <div key={stat.subject}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 14, fontWeight: 700 }}>{stat.subject}</span><span style={{ fontWeight: 800, color: stat.trend === "declining" ? "var(--danger)" : "var(--primary)" }}>{trend}</span></div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 11, borderRadius: 20, padding: "2px 8px", background: `${color}15`, color, fontWeight: 800 }}>{grade}</span><span style={{ fontSize: 13, fontWeight: 800 }}>{stat.avg}%</span></div>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.max(0, Math.min(100, stat.avg))}%`, background: color, borderRadius: 99 }} /></div>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "4px 0 0" }}>{stat.attempts} attempt{stat.attempts === 1 ? "" : "s"} · best {stat.best}%</p>
                </div>;
              })}
            </div>
          </div>}

          {(weakAreas.length > 0 || mastery.length > 0) && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {weakAreas.length > 0 && <div style={{ ...cardStyle, borderColor: "rgba(239,68,68,.22)" }}>
              <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 11 }}>Needs attention</p>
              {weakAreas.map(([area, count]) => <div key={area} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--card-border)" }}><span style={{ fontSize: 13 }}>{area}</span><span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20, background: "rgba(239,68,68,.1)", color: "var(--danger)", fontWeight: 800 }}>{count}×</span></div>)}
            </div>}
            {mastery.length > 0 && <div style={cardStyle}>
              <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 11 }}>Topic mastery</p>
              {mastery.slice(0, 5).map((topic) => <div key={topic.id} style={{ marginBottom: 11 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}><span style={{ fontSize: 13, fontWeight: 600 }}>{topic.topic}</span><span style={{ fontSize: 12, fontWeight: 800 }}>{Math.round(Number(topic.mastery_score || 0))}%</span></div><div style={{ height: 5, borderRadius: 99, background: "var(--muted)" }}><div style={{ height: "100%", width: `${Math.max(0, Math.min(100, Number(topic.mastery_score || 0)))}%`, background: Number(topic.mastery_score) < 60 ? "var(--danger)" : "var(--primary)", borderRadius: 99 }} /></div><p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "3px 0 0" }}>{topic.subject}{topic.last_attempted ? ` · ${formatDate(topic.last_attempted)}` : ""}</p></div>)}
            </div>}
          </div>}

          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div><p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0 }}>Learning time</p><p style={{ fontWeight: 800, margin: "3px 0 0" }}>{metrics.learningMinutes}m</p></div>
              <div><p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0 }}>Learning events</p><p style={{ fontWeight: 800, margin: "3px 0 0" }}>{learningEvents.length}</p></div>
              <div><p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0 }}>Focus XP</p><p style={{ fontWeight: 800, margin: "3px 0 0" }}>{metrics.totalXp}</p></div>
            </div>
          </div>

          {exams.length > 0 && <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><p style={{ fontWeight: 800, fontSize: 14, margin: 0 }}>Recent exams</p><button onClick={() => router.push("/exam-sim")} style={{ background: "none", border: 0, color: "var(--primary)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Practise more →</button></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {exams.slice(0, 10).map((exam) => { const score = Math.round(Number(exam.score || 0)); const { grade, color } = getGrade(score); return <div key={exam.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: "var(--muted)" }}><div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: `${color}15`, display: "grid", placeItems: "center", fontWeight: 800, color }}>{grade}</div><div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 13, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exam.subject}{exam.topic ? ` · ${exam.topic}` : ""}</p><p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>{exam.difficulty} · {formatDate(exam.created_at)} · {exam.correct_answers}/{exam.total_questions} correct</p></div><span style={{ fontSize: 16, fontWeight: 800, color }}>{score}%</span></div>; })}
            </div>
          </div>}
        </>
      )}
    </div>
  );
}
