"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  display_name: string | null;
  level: number;
  xp: number;
  streak: number;
}

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  subject: string | null;
}

interface ExamResult {
  id: string;
  subject: string;
  topic: string | null;
  score: number;
  weak_areas: string[];
  created_at: string;
}

interface FocusSession {
  id: string;
  duration_minutes: number;
  xp_earned: number;
  created_at: string;
}

interface DashboardData {
  profile: Profile;
  tasks: Task[];
  examResults: ExamResult[];
  focusSessions: FocusSession[];
  userEmail: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const XP_PER_LEVEL = 500;
const FETCH_TIMEOUT_MS = 8000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDisplayName(profile: Profile, email: string): string {
  if (profile.display_name) return profile.display_name;
  return email.split("@")[0];
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getXpProgress(xp: number): { current: number; needed: number; pct: number } {
  const current = xp % XP_PER_LEVEL;
  const needed = XP_PER_LEVEL;
  return { current, needed, pct: Math.min((current / needed) * 100, 100) };
}

// Cortex insight — generated from available data, no API call
function generateInsight(
  examResults: ExamResult[],
  focusSessions: FocusSession[],
  tasks: Task[]
): string {
  // Evening focus pattern
  const eveningSessions = focusSessions.filter(s => {
    const h = new Date(s.created_at).getHours();
    return h >= 17;
  });
  if (focusSessions.length >= 3 && eveningSessions.length / focusSessions.length > 0.5) {
    return "You focus best in the evening. Schedule your hardest work then.";
  }

  // Dropping subject
  if (examResults.length >= 3) {
    const subjectMap: Record<string, number[]> = {};
    examResults.forEach(r => {
      if (!subjectMap[r.subject]) subjectMap[r.subject] = [];
      subjectMap[r.subject].push(r.score);
    });
    for (const [subject, scores] of Object.entries(subjectMap)) {
      if (scores.length >= 2) {
        const first = scores[scores.length - 1];
        const last = scores[0];
        if (first - last > 10) {
          return `${subject} performance has dropped recently. Time to review.`;
        }
      }
    }
  }

  // Weak area
  const weakAreaCount: Record<string, number> = {};
  examResults.forEach(r =>
    (r.weak_areas || []).forEach(a => {
      weakAreaCount[a] = (weakAreaCount[a] || 0) + 1;
    })
  );
  const topWeak = Object.entries(weakAreaCount).sort((a, b) => b[1] - a[1])[0];
  if (topWeak) return `"${topWeak[0]}" keeps appearing as a weak area. Target it next.`;

  // Overdue tasks
  const today = getTodayString();
  const overdue = tasks.filter(t => !t.completed && t.due_date && t.due_date < today);
  if (overdue.length > 0) {
    return `You have ${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}. Start with the oldest one.`;
  }

  // Sprint XP
  const sprintSessions = focusSessions.filter(s => s.duration_minutes <= 15);
  if (sprintSessions.length >= 2) {
    return "Sprint sessions earn XP faster per minute. Use them for short review bursts.";
  }

  // Default motivational
  const defaults = [
    "Consistency beats intensity. Show up every day.",
    "Your next session is your most important one.",
    "Progress compounds. Keep the streak alive.",
  ];
  return defaults[new Date().getDay() % defaults.length];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  const pulse: React.CSSProperties = {
    animation: "pulse 1.5s ease-in-out infinite",
    background: "var(--muted)",
    borderRadius: "8px",
  };

  return (
    <div style={{ padding: "24px 20px 100px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Hero skeleton */}
      <div style={{
        background: "var(--card)", border: "1px solid var(--card-border)",
        borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px",
      }}>
        <div style={{ ...pulse, height: "12px", width: "120px" }} />
        <div style={{ ...pulse, height: "28px", width: "200px" }} />
        <div style={{ ...pulse, height: "8px", width: "100%", borderRadius: "99px" }} />
        <div style={{ ...pulse, height: "12px", width: "260px" }} />
      </div>

      {/* Today skeleton */}
      <div style={{
        background: "var(--card)", border: "1px solid var(--card-border)",
        borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "10px",
      }}>
        <div style={{ ...pulse, height: "11px", width: "60px" }} />
        {[1, 2].map(i => (
          <div key={i} style={{ ...pulse, height: "48px", width: "100%", borderRadius: "10px" }} />
        ))}
      </div>

      {/* Stat cards skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            ...pulse, height: "76px", borderRadius: "12px",
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}
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

// ─── Section 1: Hero ──────────────────────────────────────────────────────────

function HeroSection({
  profile,
  email,
  examResults,
  focusSessions,
  tasks,
}: {
  profile: Profile;
  email: string;
  examResults: ExamResult[];
  focusSessions: FocusSession[];
  tasks: Task[];
}) {
  const name = getDisplayName(profile, email);
  const { current, needed, pct } = getXpProgress(profile.xp);
  const insight = generateInsight(examResults, focusSessions, tasks);

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--card-border)",
      borderRadius: "16px", padding: "20px",
    }}>
      {/* Greeting + streak */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", fontWeight: 500 }}>
          {getGreeting()}
        </p>
        {profile.streak > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: "4px",
            background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.25)",
            borderRadius: "20px", padding: "3px 10px",
          }}>
            <span style={{ fontSize: "13px" }}>🔥</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#fb923c" }}>
              {profile.streak} day streak
            </span>
          </div>
        )}
      </div>

      <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "16px", lineHeight: 1.2 }}>
        {name}.
      </h1>

      {/* Level + XP bar */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--primary)" }}>
            Level {profile.level}
          </span>
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            {current} / {needed} XP
          </span>
        </div>
        <div style={{ background: "var(--muted)", borderRadius: "99px", height: "6px", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: "99px",
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--primary), #818cf8)",
            boxShadow: "0 0 8px var(--primary)",
            transition: "width 0.8s ease",
          }} />
        </div>
      </div>

      {/* Cortex insight */}
      <div style={{
        display: "flex", gap: "10px", alignItems: "flex-start",
        background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)",
        borderRadius: "10px", padding: "10px 12px",
      }}>
        <span style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>🔮</span>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>
          <span style={{ color: "var(--primary)", fontWeight: 600 }}>Cortex: </span>
          {insight}
        </p>
      </div>
    </div>
  );
}

// ─── Section 2: Today Panel ───────────────────────────────────────────────────

function TodayPanel({
  tasks,
  examResults,
  router,
}: {
  tasks: Task[];
  examResults: ExamResult[];
  router: ReturnType<typeof useRouter>;
}) {
  const today = getTodayString();
  const dueTodayTasks = tasks.filter(
    t => !t.completed && t.due_date === today
  );
  const overdueTasks = tasks.filter(
    t => !t.completed && t.due_date && t.due_date < today
  );

  // Next exam countdown — use most recent exam result's subject as proxy
  // In a real system this would come from an exams/schedule table
  const lastSubject = examResults[0]?.subject ?? null;

  const isEmpty = dueTodayTasks.length === 0 && overdueTasks.length === 0;

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--card-border)",
      borderRadius: "16px", padding: "20px",
    }}>
      <p style={{
        fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "14px",
      }}>
        Today
      </p>

      {isEmpty ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ fontSize: "2rem", marginBottom: "8px" }}>✅</p>
          <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
            All clear for today
          </p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "16px" }}>
            No tasks due. A great time to get ahead.
          </p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/focus")}
              style={primaryBtnStyle}
            >
              ⏱ Start Focus
            </button>
            <button
              onClick={() => router.push("/tasks")}
              style={ghostBtnStyle}
            >
              + Add Task
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Overdue — shown first, red-tinted */}
          {overdueTasks.slice(0, 2).map(task => (
            <TaskRow
              key={task.id}
              task={task}
              isOverdue
              onClick={() => router.push("/tasks")}
            />
          ))}
          {overdueTasks.length > 2 && (
            <button
              onClick={() => router.push("/tasks")}
              style={{ ...ghostBtnStyle, fontSize: "12px", alignSelf: "flex-start" }}
            >
              +{overdueTasks.length - 2} more overdue
            </button>
          )}

          {/* Due today */}
          {dueTodayTasks.slice(0, 3).map(task => (
            <TaskRow
              key={task.id}
              task={task}
              isOverdue={false}
              onClick={() => router.push("/tasks")}
            />
          ))}
          {dueTodayTasks.length > 3 && (
            <button
              onClick={() => router.push("/tasks")}
              style={{ ...ghostBtnStyle, fontSize: "12px", alignSelf: "flex-start" }}
            >
              +{dueTodayTasks.length - 3} more due today
            </button>
          )}

          {/* Focus CTA */}
          <button
            onClick={() => router.push("/focus")}
            style={{ ...primaryBtnStyle, marginTop: "6px" }}
          >
            ⏱ Start a Focus Session
          </button>
        </div>
      )}

      {/* Exam sim nudge */}
      {lastSubject && (
        <div style={{
          marginTop: "14px",
          display: "flex", alignItems: "center", gap: "10px",
          background: "rgba(99,102,241,0.07)", borderRadius: "10px", padding: "10px 12px",
          cursor: "pointer",
        }}
          onClick={() => router.push("/exam-sim")}
        >
          <span style={{ fontSize: "16px" }}>🎯</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>
              Practice {lastSubject}
            </p>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", margin: 0 }}>
              Run an exam simulation →
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  isOverdue,
  onClick,
}: {
  task: Task;
  isOverdue: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 12px", borderRadius: "10px", cursor: "pointer",
        background: isOverdue ? "rgba(239,68,68,0.07)" : "var(--muted)",
        border: `1px solid ${isOverdue ? "rgba(239,68,68,0.2)" : "transparent"}`,
      }}
    >
      <div style={{
        width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${isOverdue ? "#ef4444" : "var(--muted-foreground)"}`,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: "13px", fontWeight: 500,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0,
        }}>
          {task.title}
        </p>
        {isOverdue && task.due_date && (
          <p style={{ fontSize: "11px", color: "#ef4444", margin: 0, marginTop: "1px" }}>
            Overdue · {new Date(task.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
        )}
      </div>
      {task.subject && (
        <span style={{
          fontSize: "10px", padding: "2px 7px", borderRadius: "20px",
          background: "rgba(99,102,241,0.12)", color: "var(--primary)", fontWeight: 600,
          flexShrink: 0,
        }}>
          {task.subject}
        </span>
      )}
    </div>
  );
}

// ─── Section 3: Continue Learning ────────────────────────────────────────────

function ContinueLearning({
  examResults,
  router,
}: {
  examResults: ExamResult[];
  router: ReturnType<typeof useRouter>;
}) {
  if (examResults.length === 0) {
    return (
      <div style={{
        background: "var(--card)", border: "1px solid var(--card-border)",
        borderRadius: "16px", padding: "20px",
      }}>
        <p style={{
          fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "14px",
        }}>
          Continue Learning
        </p>
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p style={{ fontSize: "2rem", marginBottom: "8px" }}>📚</p>
          <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
            Nothing started yet
          </p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "16px" }}>
            Take your first exam simulation to start tracking progress.
          </p>
          <button onClick={() => router.push("/exam-sim")} style={primaryBtnStyle}>
            Start Exam Sim →
          </button>
        </div>
      </div>
    );
  }

  const latest = examResults[0];
  const topWeak = latest.weak_areas?.[0] ?? null;

  const getGradeColor = (score: number) => {
    if (score >= 70) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const color = getGradeColor(latest.score);

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--card-border)",
      borderRadius: "16px", padding: "20px",
    }}>
      <p style={{
        fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "14px",
      }}>
        Continue Learning
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
        {/* Score badge */}
        <div style={{
          width: "52px", height: "52px", borderRadius: "12px", flexShrink: 0,
          background: `${color}15`, border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column",
        }}>
          <span style={{ fontSize: "16px", fontWeight: 800, color, lineHeight: 1 }}>{latest.score}%</span>
          <span style={{ fontSize: "9px", color: "var(--muted-foreground)", marginTop: "1px" }}>last</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "15px", fontWeight: 700, margin: 0, marginBottom: "2px" }}>
            {latest.subject}
          </p>
          {latest.topic && (
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0, marginBottom: "4px" }}>
              {latest.topic}
            </p>
          )}
          {topWeak && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontSize: "10px" }}>⚠️</span>
              <p style={{ fontSize: "11px", color: "#f59e0b", margin: 0 }}>
                Weak: {topWeak}
              </p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => router.push("/exam-sim")}
        style={primaryBtnStyle}
      >
        Retry {latest.subject} →
      </button>
    </div>
  );
}

// ─── Section 4: Progress Snapshot ────────────────────────────────────────────

function ProgressSnapshot({
  profile,
  examResults,
  focusSessions,
}: {
  profile: Profile;
  examResults: ExamResult[];
  focusSessions: FocusSession[];
}) {
  // Weekly XP — sum xp_earned from focus sessions in last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyXp = focusSessions
    .filter(s => new Date(s.created_at) >= weekAgo)
    .reduce((sum, s) => sum + (s.xp_earned ?? 0), 0);

  // Focus minutes this week
  const weeklyFocusMin = focusSessions
    .filter(s => new Date(s.created_at) >= weekAgo)
    .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);

  // Avg exam score
  const avgScore = examResults.length > 0
    ? Math.round(examResults.reduce((sum, r) => sum + r.score, 0) / examResults.length)
    : null;

  const stats = [
    {
      label: "Weekly XP", value: weeklyXp > 0 ? `+${weeklyXp}` : "—",
      icon: "⚡", color: "#6366f1",
      sub: weeklyXp > 0 ? "this week" : "start a session",
    },
    {
      label: "Focus time", value: weeklyFocusMin > 0 ? `${weeklyFocusMin}m` : "—",
      icon: "⏱", color: "#8b5cf6",
      sub: weeklyFocusMin > 0 ? "this week" : "no sessions yet",
    },
    {
      label: "Avg score", value: avgScore !== null ? `${avgScore}%` : "—",
      icon: "📈", color: avgScore !== null ? (avgScore >= 60 ? "#22c55e" : "#f59e0b") : "#94a3b8",
      sub: avgScore !== null ? (avgScore >= 60 ? "on track" : "needs work") : "no exams yet",
    },
    {
      label: "Streak", value: profile.streak > 0 ? `${profile.streak}d` : "—",
      icon: "🔥", color: "#fb923c",
      sub: profile.streak > 0 ? "keep it going" : "start today",
    },
  ];

  return (
    <div>
      <p style={{
        fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "10px",
      }}>
        Progress
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {stats.map(stat => (
          <div key={stat.label} style={{
            background: `${stat.color}10`,
            border: `1px solid ${stat.color}25`,
            borderRadius: "12px", padding: "14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
              <span style={{ fontSize: "13px" }}>{stat.icon}</span>
              <p style={{
                fontSize: "10px", color: "var(--muted-foreground)",
                textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, margin: 0,
              }}>
                {stat.label}
              </p>
            </div>
            <p style={{ fontSize: "24px", fontWeight: 800, color: stat.color, margin: 0, lineHeight: 1 }}>
              {stat.value}
            </p>
            <p style={{ fontSize: "10px", color: "var(--muted-foreground)", margin: 0, marginTop: "3px" }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared Button Styles ─────────────────────────────────────────────────────

const primaryBtnStyle: React.CSSProperties = {
  background: "var(--primary)", color: "white", border: "none",
  borderRadius: "10px", padding: "10px 16px", fontWeight: 700,
  fontSize: "13px", cursor: "pointer", width: "100%",
  boxShadow: "0 0 12px rgba(99,102,241,0.3)",
};

const ghostBtnStyle: React.CSSProperties = {
  background: "transparent", color: "var(--muted-foreground)",
  border: "1px solid var(--card-border)", borderRadius: "10px",
  padding: "9px 14px", fontWeight: 600, fontSize: "13px",
  cursor: "pointer",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, FETCH_TIMEOUT_MS);

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          clearTimeout(timeoutId);
          router.push("/auth/login");
          return;
        }

        // Parallel fetch — all queries fire simultaneously
        const [profileRes, tasksRes, examRes, focusRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, level, xp, streak")
            .eq("id", user.id)
            .single(),

          supabase
            .from("tasks")
            .select("id, title, due_date, completed, subject")
            .eq("user_id", user.id)
            .eq("completed", false)
            .order("due_date", { ascending: true })
            .limit(20),

          supabase
            .from("exam_results")
            .select("id, subject, topic, score, weak_areas, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20),

          supabase
            .from("focus_sessions")
            .select("id, duration_minutes, xp_earned, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(30),
        ]);

        clearTimeout(timeoutId);
        if (cancelled) return;

        // Defensive: profile may not exist yet for new users
        const profile: Profile = profileRes.data ?? {
          display_name: null,
          level: 1,
          xp: 0,
          streak: 0,
        };

        setData({
          profile,
          tasks: tasksRes.data ?? [],
          examResults: examRes.data ?? [],
          focusSessions: focusRes.data ?? [],
          userEmail: user.email ?? "",
        });
        setLoading(false);
      } catch (err) {
        clearTimeout(timeoutId);
        if (!cancelled) {
          console.error("[Dashboard] init failed:", err);
          setLoading(false);
        }
      }
    };

    init();
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [router, supabase]);

  if (loading) return <DashboardSkeleton />;

  // Timeout fired with no data — new user or network failure
  if (!data) {
    return (
      <div style={{ padding: "60px 20px 100px", textAlign: "center" }}>
        <p style={{ fontSize: "2rem", marginBottom: "12px" }}>🛰</p>
        <p style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>
          Couldn't load your dashboard
        </p>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "20px" }}>
          Check your connection and try again.
        </p>
        <button onClick={() => window.location.reload()} style={primaryBtnStyle}>
          Retry
        </button>
      </div>
    );
  }

  const { profile, tasks, examResults, focusSessions, userEmail } = data;

  return (
    <div style={{ padding: "24px 20px 100px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Section 1 — Hero */}
      <HeroSection
        profile={profile}
        email={userEmail}
        examResults={examResults}
        focusSessions={focusSessions}
        tasks={tasks}
      />

      {/* Section 2 — Today */}
      <TodayPanel
        tasks={tasks}
        examResults={examResults}
        router={router}
      />

      {/* Section 3 — Continue Learning */}
      <ContinueLearning
        examResults={examResults}
        router={router}
      />

      {/* Section 4 — Progress Snapshot */}
      <ProgressSnapshot
        profile={profile}
        examResults={examResults}
        focusSessions={focusSessions}
      />

      {/* Quick actions footer */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", paddingTop: "4px" }}>
        <button onClick={() => router.push("/learn")} style={ghostBtnStyle}>
          🤖 AI Learn
        </button>
        <button onClick={() => router.push("/analytics")} style={ghostBtnStyle}>
          📊 Analytics
        </button>
      </div>
    </div>
  );
}
