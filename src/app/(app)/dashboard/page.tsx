"use client";

import Cortex from "@/components/cortex/Cortex";
import RevisionQueue from "@/components/RevisionQueue";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { updateStreak } from "@/lib/utils/streak";
import Tour from "@/components/shared/Tour";
import { emitCortexEvent } from "@/lib/cortex/events/emit";
import { log } from "@/lib/observability";
import { RevisionItem } from "@/lib/revisionQueue";
import { TourProvider } from '@/context/TourContext';
import { ProductTour } from '@/components/tour/ProductTour';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  username: string;
  level: number;
  xp: number;
  streak: number;
}

interface Subject {
  id: string;
  name: string;
}

interface Task {
  id: string;
  subject_id: string;
  completed: boolean;
  title?: string;
  due_date?: string | null;
}

interface ExamResult {
  id: string;
  subject: string;
  topic: string | null;
  score: number;        // percentage 0–100
  weak_areas: string[];
  created_at: string;
}

interface FocusSession {
  id: string;
  duration_minutes: number;
  xp_earned: number;
  created_at: string;
}

// ─── CircularProgress (preserved exactly from original source) ────────────────

function CircularProgress({
  value, max, size = 80, color = "#6366f1", label, sublabel,
}: {
  value: number; max: number; size?: number;
  color?: string; label: string; sublabel?: string;
}) {
  const radius       = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent      = max > 0 ? Math.min(value / max, 1) : 0;
  const offset       = circumference - percent * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--muted)" strokeWidth="6" />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 4px ${color}80)` }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <p style={{ fontSize: size > 70 ? "18px" : "14px", fontWeight: 800, color, lineHeight: 1 }}>
            {label}
          </p>
        </div>
      </div>
      {sublabel && (
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", textAlign: "center" }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  const pulse: React.CSSProperties = {
    background: "var(--muted)", borderRadius: "8px",
    animation: "dash-pulse 1.5s ease-in-out infinite",
  };
  const card: React.CSSProperties = {
    background: "var(--card)", border: "1px solid var(--card-border)",
    borderRadius: "12px", padding: "16px",
  };

  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ ...pulse, height: "11px", width: "90px" }} />
          <div style={{ ...pulse, height: "22px", width: "160px", animationDelay: "0.1s" }} />
        </div>
        <div style={{ ...pulse, height: "34px", width: "72px", borderRadius: "8px" }} />
      </div>
      <div style={{ ...card, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "20px 16px" }}>
        {[0, 0.15, 0.3].map((delay, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <div style={{ ...pulse, width: "80px", height: "80px", borderRadius: "50%", animationDelay: `${delay}s` }} />
            <div style={{ ...pulse, height: "10px", width: "48px", animationDelay: `${delay + 0.1}s` }} />
          </div>
        ))}
      </div>
      <div style={{ ...card, display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ ...pulse, height: "12px", width: "120px" }} />
        <div style={{ ...pulse, height: "10px", width: "80px", animationDelay: "0.1s" }} />
        <div style={{ ...pulse, height: "5px", width: "100%", borderRadius: "99px", marginTop: "4px" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {[0, 0.08, 0.16, 0.24].map((delay, i) => (
          <div key={i} style={{ ...pulse, height: "76px", borderRadius: "12px", animationDelay: `${delay}s` }} />
        ))}
      </div>
      <div style={{ ...card, display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ ...pulse, height: "12px", width: "80px" }} />
        {[0, 0.1, 0.2].map((delay, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ ...pulse, height: "12px", width: "100px", animationDelay: `${delay}s` }} />
              <div style={{ ...pulse, height: "12px", width: "32px", animationDelay: `${delay}s` }} />
            </div>
            <div style={{ ...pulse, height: "5px", width: "100%", borderRadius: "99px", animationDelay: `${delay}s` }} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes dash-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>
    </div>
  );
}

// ─── Cortex Insight ───────────────────────────────────────────────────────────

function generateInsight(
  examResults: ExamResult[],
  focusSessions: FocusSession[],
  tasks: Task[],
  revisionItems?: RevisionItem[]
): string {
  // Revision queue items take priority — most actionable signal
  if (revisionItems && revisionItems.length >= 2) {
    const top    = revisionItems[0];
    const second = revisionItems[1];
    if (top.priority >= 3) {
      return `"${top.topic}" in ${top.subject} needs urgent attention — flagged ${top.priority} times.`;
    }
    if (top.priority >= 2) {
      return `Focus on "${top.topic}" and "${second.topic}" — both flagged as weak areas.`;
    }
  }
  if (revisionItems && revisionItems.length === 1 && revisionItems[0].priority >= 2) {
    const top = revisionItems[0];
    return `"${top.topic}" in ${top.subject} keeps coming up as a weak area. Revise it next.`;
  }

  // Evening focus pattern
  if (focusSessions.length >= 3) {
    const eveningCount = focusSessions.filter(s => new Date(s.created_at).getHours() >= 17).length;
    if (eveningCount / focusSessions.length > 0.5) {
      return "You focus best in the evening. Schedule your hardest work then.";
    }
  }

  // Subject declining
  if (examResults.length >= 3) {
    const bySubject: Record<string, number[]> = {};
    [...examResults].reverse().forEach(r => {
      if (!bySubject[r.subject]) bySubject[r.subject] = [];
      bySubject[r.subject].push(r.score);
    });
    for (const [subject, scores] of Object.entries(bySubject)) {
      if (scores.length >= 2 && scores[0] - scores[scores.length - 1] > 10) {
        return `${subject} performance has dropped recently. Time to review.`;
      }
    }
  }

  // Top weak area from exam history
  const weakCount: Record<string, number> = {};
  examResults.forEach(r =>
    (r.weak_areas || []).forEach(a => { weakCount[a] = (weakCount[a] || 0) + 1; })
  );
  const topWeak = Object.entries(weakCount).sort((a, b) => b[1] - a[1])[0];
  if (topWeak) return `"${topWeak[0]}" keeps appearing as a weak area. Target it next.`;

  // Sprint sessions
  if (focusSessions.filter(s => s.duration_minutes <= 15).length >= 2) {
    return "Sprint sessions earn XP faster per minute. Use them for review bursts.";
  }

  // Overdue tasks
  const today   = new Date().toISOString().split("T")[0];
  const overdue = tasks.filter(t => !t.completed && t.due_date && t.due_date < today);
  if (overdue.length > 0) {
    return `You have ${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}. Start with the oldest.`;
  }

  const defaults = [
    "Consistency beats intensity. Show up every day.",
    "Your next session is your most important one.",
    "Progress compounds. Keep the streak alive.",
  ];
  return defaults[new Date().getDay() % defaults.length];
}

// ─── Today Panel ──────────────────────────────────────────────────────────────

function TodayPanel({ tasks, examResults, router }: {
  tasks: Task[];
  examResults: ExamResult[];
  router: ReturnType<typeof useRouter>;
}) {
  const today         = new Date().toISOString().split("T")[0];
  const tasksWithDates = tasks.filter(t => t.due_date);
  const dueToday      = tasksWithDates.filter(t => !t.completed && t.due_date === today);
  const overdue       = tasksWithDates.filter(t => !t.completed && t.due_date! < today);
  const lastSubject   = examResults[0]?.subject ?? null;
  const hasDateData   = tasksWithDates.length > 0;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px" }}>
      <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "14px" }}>
        Today
      </p>

      {!hasDateData ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <ActionRow icon="⏱" label="Start a Focus session"  sub="Earn XP and build your streak" onClick={() => router.push("/focus")} />
          <ActionRow icon="🎯" label="Run an Exam Sim"        sub="Test what you know"            onClick={() => router.push("/exam-sim")} />
          {lastSubject && (
            <ActionRow icon="📖" label={`Continue ${lastSubject}`} sub="Pick up where you left off" onClick={() => router.push("/exam-sim")} />
          )}
        </div>
      ) : dueToday.length === 0 && overdue.length === 0 ? (
        <div style={{ textAlign: "center", padding: "12px 0 16px" }}>
          <p style={{ fontSize: "1.8rem", marginBottom: "6px" }}>✅</p>
          <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>All clear</p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "14px" }}>
            Nothing due today. Great time to get ahead.
          </p>
          <button onClick={() => router.push("/focus")} style={primaryBtn}>⏱ Start Focus Session</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {overdue.slice(0, 2).map(t => (
            <div key={t.id} onClick={() => router.push("/tasks")}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", cursor: "pointer", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #ef4444", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.title ?? "Untitled task"}
                </p>
                <p style={{ fontSize: "11px", color: "#ef4444", margin: 0 }}>
                  Overdue · {new Date(t.due_date!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          ))}
          {dueToday.slice(0, 3).map(t => (
            <div key={t.id} onClick={() => router.push("/tasks")}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", cursor: "pointer", background: "var(--muted)" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid var(--muted-foreground)", flexShrink: 0 }} />
              <p style={{ fontSize: "13px", fontWeight: 500, margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.title ?? "Untitled task"}
              </p>
            </div>
          ))}
          <button onClick={() => router.push("/focus")} style={{ ...primaryBtn, marginTop: "4px" }}>
            ⏱ Start Focus Session
          </button>
        </div>
      )}
    </div>
  );
}

function ActionRow({ icon, label, sub, onClick }: { icon: string; label: string; sub: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "10px", cursor: "pointer", background: "var(--muted)" }}>
      <span style={{ fontSize: "18px", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>{label}</p>
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", margin: 0 }}>{sub}</p>
      </div>
      <span style={{ color: "var(--muted-foreground)", fontSize: "14px", flexShrink: 0 }}>→</span>
    </div>
  );
}

// ─── Continue Learning ────────────────────────────────────────────────────────

function ContinueLearning({ examResults, router }: {
  examResults: ExamResult[];
  router: ReturnType<typeof useRouter>;
}) {
  if (examResults.length === 0) {
    return (
      <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "14px" }}>
          Continue Learning
        </p>
        <div style={{ textAlign: "center", padding: "8px 0 12px" }}>
          <p style={{ fontSize: "2rem", marginBottom: "8px" }}>📚</p>
          <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>Nothing started yet</p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "14px" }}>
            Take your first exam simulation to begin tracking progress.
          </p>
          <button onClick={() => router.push("/exam-sim")} style={primaryBtn}>Start Exam Sim →</button>
        </div>
      </div>
    );
  }

  const latest     = examResults[0];
  const topWeak    = latest.weak_areas?.[0] ?? null;
  const scoreColor = latest.score >= 70 ? "#22c55e" : latest.score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px" }}>
      <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "14px" }}>
        Continue Learning
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
        <div style={{ width: "50px", height: "50px", borderRadius: "12px", flexShrink: 0, background: `${scoreColor}15`, border: `1px solid ${scoreColor}30`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <span style={{ fontSize: "15px", fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{Math.round(latest.score)}%</span>
          <span style={{ fontSize: "9px", color: "var(--muted-foreground)" }}>last</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "15px", fontWeight: 700, margin: 0, marginBottom: "2px" }}>{latest.subject}</p>
          {latest.topic && (
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0, marginBottom: "3px" }}>{latest.topic}</p>
          )}
          {topWeak && (
            <p style={{ fontSize: "11px", color: "#f59e0b", margin: 0 }}>⚠️ Weak: {topWeak}</p>
          )}
        </div>
      </div>
      <button onClick={() => router.push("/exam-sim")} style={primaryBtn}>Retry {latest.subject} →</button>
    </div>
  );
}

// ─── Progress Snapshot ────────────────────────────────────────────────────────

function ProgressSnapshot({ profile, examResults, focusSessions }: {
  profile: Profile;
  examResults: ExamResult[];
  focusSessions: FocusSession[];
}) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weeklyXp   = focusSessions.filter(s => new Date(s.created_at) >= weekAgo).reduce((sum, s) => sum + (s.xp_earned ?? 0), 0);
  const weeklyMins = focusSessions.filter(s => new Date(s.created_at) >= weekAgo).reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
  const avgScore   = examResults.length > 0
    ? Math.round(examResults.reduce((sum, r) => sum + r.score, 0) / examResults.length)
    : null;

  const stats = [
    { label: "Weekly XP",  value: weeklyXp > 0 ? `+${weeklyXp}` : "—",      icon: "⚡", color: "#6366f1",  sub: weeklyXp > 0 ? "this week" : "start a session" },
    { label: "Focus",      value: weeklyMins > 0 ? `${weeklyMins}m` : "—",   icon: "⏱", color: "#8b5cf6",  sub: weeklyMins > 0 ? "this week" : "no sessions yet" },
    { label: "Avg Score",  value: avgScore !== null ? `${avgScore}%` : "—",  icon: "📈", color: avgScore !== null ? (avgScore >= 60 ? "#22c55e" : "#f59e0b") : "#94a3b8", sub: avgScore !== null ? (avgScore >= 60 ? "on track" : "needs work") : "no exams yet" },
    { label: "Streak",     value: profile.streak > 0 ? `${profile.streak}d` : "—", icon: "🔥", color: "#fb923c", sub: profile.streak > 0 ? "keep going" : "start today" },
  ];

  return (
    <div>
      <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "10px" }}>
        Progress
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: `${s.color}10`, border: `1px solid ${s.color}25`, borderRadius: "12px", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
              <span style={{ fontSize: "12px" }}>{s.icon}</span>
              <p style={{ fontSize: "10px", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, margin: 0 }}>
                {s.label}
              </p>
            </div>
            <p style={{ fontSize: "22px", fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: "10px", color: "var(--muted-foreground)", margin: 0, marginTop: "3px" }}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Subjects Empty State ─────────────────────────────────────────────────────

function SubjectsEmptyState({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
      <p style={{ fontSize: "2rem", marginBottom: "8px" }}>🗂</p>
      <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>No subjects yet</p>
      <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "16px" }}>
        Add your first subject to start tracking tasks and progress by topic.
      </p>
      <button onClick={() => router.push("/tasks")} style={primaryBtn}>Add a Subject →</button>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const primaryBtn: React.CSSProperties = {
  background: "var(--primary)", color: "white", border: "none",
  borderRadius: "10px", padding: "10px 16px", fontWeight: 700,
  fontSize: "13px", cursor: "pointer", width: "100%",
  boxShadow: "0 0 12px rgba(99,102,241,0.25)",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  
  const [profile,        setProfile]        = useState<Profile | null>(null);
  const [subjects,       setSubjects]       = useState<Subject[]>([]);
  const [tasks,          setTasks]          = useState<Task[]>([]);
  const [examResults,    setExamResults]    = useState<ExamResult[]>([]);
  const [focusSessions,  setFocusSessions]  = useState<FocusSession[]>([]);
  const [revisionItems,  setRevisionItems]  = useState<RevisionItem[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [cortexTrigger,  setCortexTrigger]  = useState(0);
  const [showTour,       setShowTour]       = useState(false);

  const router  = useRouter();
  const [supabase] = useState(() => createClient());
  const [currentUser, setCurrentUser] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          clearTimeout(timeoutId);
          router.push("/auth/login");
          return;
        }

        // ── All queries fire in parallel — including streak update ────────
        // updateStreak no longer blocks data fetching.
        // If streak fails, we log and continue — dashboard still loads.
        const [
          streakResult,
          { data: profileData,  error: profileError  },
          { data: subjectsData                        },
          { data: tasksData                           },
          { data: examData,     error: examError      },
          { data: focusData,    error: focusError     },
          { data: revisionData                        },
        ] = await Promise.all([
          updateStreak(user.id).catch(err => {
            log.streakUpdateFailed({ userId: user.id, error: String(err) });
            return null;
          }),
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("subjects").select("*").eq("user_id", user.id),
          supabase.from("tasks").select("*").eq("user_id", user.id),
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
          supabase
            .from("revision_queue")
            .select("*")
            .eq("user_id", user.id)
            .order("priority",  { ascending: false })
            .order("last_seen", { ascending: false })
            .limit(5),
        ]);

        clearTimeout(timeoutId);
        if (cancelled) return;

        // Log non-fatal query failures
        if (profileError) log.dashboardLoadFailed({ userId: user.id, stage: "profiles",      error: profileError.message });
        if (examError)    log.dashboardLoadFailed({ userId: user.id, stage: "exam_results",  error: examError.message   });
        if (focusError)   log.dashboardLoadFailed({ userId: user.id, stage: "focus_sessions",error: focusError.message  });

        setProfile(profileData ?? null);
        setSubjects(subjectsData   ?? []);
        setTasks(tasksData         ?? []);
        setExamResults(examData    ?? []);
        setFocusSessions(focusData ?? []);
        setRevisionItems(revisionData ?? []);
        setLoading(false);
        setCurrentUser(user.id);

        // Cortex events (preserved exactly)
        emitCortexEvent({
          userId: user.id,
          type:   "dashboard.loaded",
          source: "dashboard",
          data: {
            totalTasks:     tasksData?.length ?? 0,
            completedTasks: tasksData?.filter(t => t.completed).length ?? 0,
            subjects:       subjectsData?.length ?? 0,
          },
        });

        if (streakResult?.changed) {
          emitCortexEvent({
            userId: user.id,
            type:   "streak.updated",
            source: "dashboard",
            data: {
              streak:         streakResult.streak,
              previousStreak: streakResult.previousStreak,
            },
          });
        }

        setCortexTrigger(1);

        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          if (params.get("tour") === "true") setShowTour(true);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (!cancelled) {
          log.dashboardLoadFailed({ stage: "fetchData", error: String(err) });
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return <DashboardSkeleton />;

  // ── Derived stats (preserved exactly from original source) ────────────
  const totalTasks     = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const progress       = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  // xpToNextLevel formula preserved from original: level * 100
  const xpToNextLevel  = (profile?.level || 1) * 100;

  const cardStyle: React.CSSProperties = {
    background: "var(--card)", border: "1px solid var(--card-border)",
    borderRadius: "12px", padding: "16px",
  };

  const insight = generateInsight(examResults, focusSessions, tasks, revisionItems);

  return (
     <TourProvider
      hasCompletedTour={false}
      onboardingComplete={false}
    >
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* ── Header + sign out (preserved exactly) ──────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>Welcome back</p>
          <h1 style={{ fontSize: "28px", fontWeight: 800 }}>
            {profile?.username || "Student"} 👋
          </h1>
        </div>
        <button onClick={handleSignOut} style={{ background: "var(--muted)", border: "none", borderRadius: "8px", padding: "8px 12px", color: "var(--muted-foreground)", fontSize: "13px", cursor: "pointer" }}>
          Sign out
        </button>
      </div>

      {/* ── Circular progress row (preserved exactly) ──────────────────── */}
      <div style={{ ...cardStyle, display: "flex", justifyContent: "space-around", alignItems: "center" }}>
        <CircularProgress value={profile?.xp || 0} max={xpToNextLevel}                label={`L${profile?.level || 1}`}        sublabel={`${profile?.xp || 0} XP`} />
        <CircularProgress value={Math.min(profile?.streak || 0, 30)} max={30} color="#f59e0b" label={`${profile?.streak || 0}🔥`} sublabel="streak" />
        <CircularProgress value={completedTasks} max={totalTasks || 1} color="#22c55e" label={`${progress}%`}                    sublabel={`${completedTasks}/${totalTasks}`} />
      </div>

      {/* ── XP bar (with visual progress bar added) ────────────────────── */}
      <div style={cardStyle}>
        <p style={{ fontSize: "13px", fontWeight: 600 }}>
          Level {profile?.level || 1} → {(profile?.level || 1) + 1}
        </p>
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
          {profile?.xp || 0} / {xpToNextLevel} XP
        </p>
        <div style={{ background: "var(--muted)", borderRadius: "99px", height: "5px", marginTop: "10px", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: "99px",
            width: `${Math.min(((profile?.xp || 0) / xpToNextLevel) * 100, 100)}%`,
            background: "linear-gradient(90deg, var(--primary), #818cf8)",
            boxShadow: "0 0 6px rgba(99,102,241,0.5)",
            transition: "width 0.8s ease",
          }} />
        </div>
      </div>

      {/* ── Cortex Insight strip ───────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: "12px", padding: "12px 14px" }}>
        <span style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>🔮</span>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>
          <span style={{ color: "var(--primary)", fontWeight: 600 }}>Cortex: </span>
          {insight}
        </p>
      </div>

      {/* ── Today Panel ───────────────────────────────────────────────── */}
      <TodayPanel tasks={tasks} examResults={examResults} router={router} />

      {/* ── Subjects (enhanced empty state) ───────────────────────────── */}
      {subjects.length > 0 ? (
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, marginBottom: "12px" }}>Subjects</p>
          {subjects.map(subject => {
            const subjectTasks = tasks.filter(t => t.subject_id === subject.id);
            const done         = subjectTasks.filter(t => t.completed).length;
            const percent      = subjectTasks.length ? Math.round((done / subjectTasks.length) * 100) : 0;
            return (
              <div key={subject.id} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <p>{subject.name}</p>
                  <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{done}/{subjectTasks.length}</p>
                </div>
                <div style={{ background: "var(--muted)", height: "5px", borderRadius: "99px" }}>
                  <div style={{ width: `${percent}%`, height: "5px", background: "#6366f1", borderRadius: "99px", transition: "width 0.4s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <SubjectsEmptyState router={router} />
      )}

      {/* ── Continue Learning ──────────────────────────────────────────── */}
      <ContinueLearning examResults={examResults} router={router} />

      {/* ── Revision Queue ────────────────────────────────────────────── */}
      <RevisionQueue userId={currentUser} />

      {/* ── Progress Snapshot ─────────────────────────────────────────── */}
      <ProgressSnapshot
        profile={profile || { username: "", level: 1, xp: 0, streak: 0 }}
        examResults={examResults}
        focusSessions={focusSessions}
      />

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <button onClick={() => router.push("/learn")}
          style={{ background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--card-border)", borderRadius: "10px", padding: "10px 14px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
          🤖 AI Learn
        </button>
        <button onClick={() => router.push("/analytics")}
          style={{ background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--card-border)", borderRadius: "10px", padding: "10px 14px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
          📊 Analytics
        </button>
      </div>

      {/* ── Cortex component (preserved exactly) ──────────────────────── */}
      <div id="cortex-card">
        <Cortex userId={currentUser} trigger={cortexTrigger} />
      </div>

      {/* ── Tour (preserved exactly) ───────────────────────────────────── */}
      {showTour && (
        <Tour
          onComplete={async () => {
            setShowTour(false);
            await supabase.from("profiles").update({ onboarding_complete: true }).eq("id", currentUser);
            window.history.replaceState({}, "", "/dashboard");
          }}
        />
      )}
    </div>
     <ProductTour />
    </TourProvider>
  );
}
