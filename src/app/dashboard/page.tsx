"use client";

import Cortex from "@/components/cortex/Cortex";
import DailyChallenge from "@/components/DailyChallenge";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { updateStreak } from "@/lib/utils/streak";
import Tour from "@/components/shared/Tour";
import { emitCortexEvent } from "@/lib/cortex/events/emit";

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
}

interface Achievement {
  id: string;
  title: string;
}

const ACHIEVEMENT_ICONS: Record<string, string> = {
  "First Completion": "🎯",
  "On A Roll": "🔥",
  "Study Machine": "⚡",
  "3 Day Streak": "🔥",
  "7 Day Streak": "🌟",
  "14 Day Streak": "💎",
  "Perfect Score": "🏅",
  "First Login": "👋",
  "Night Owl": "🦉",
  "Early Bird": "🌅",
};

function getAchievementIcon(title: string): string {
  for (const [key, icon] of Object.entries(ACHIEVEMENT_ICONS)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "🏆";
}

function CircularProgress({ value, max, size = 80, color = "#6366f1", label, sublabel }: {
  value: number; max: number; size?: number; color?: string; label: string; sublabel?: string;
}) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - percent * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth="6" />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 4px ${color}80)` }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column",
        }}>
          <p style={{ fontSize: size > 70 ? "18px" : "14px", fontWeight: 800, color, lineHeight: 1 }}>{label}</p>
        </div>
      </div>
      {sublabel && <p style={{ fontSize: "11px", color: "var(--muted-foreground)", textAlign: "center" }}>{sublabel}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [cortexTrigger, setCortexTrigger] = useState(0);
  const [newAchievement, setNewAchievement] = useState<string | null>(null);
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [currentUser, setCurrentUser] = useState<string>("");
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const streakResult = await updateStreak(user.id);

      const [{ data: profileData }, { data: subjectsData }, { data: tasksData }, { data: achievementsData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("subjects").select("*").eq("user_id", user.id),
        supabase.from("tasks").select("*").eq("user_id", user.id),
        supabase.from("achievements").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      setProfile(profileData);
      setSubjects(subjectsData || []);
      setTasks(tasksData || []);
      setAchievements(achievementsData || []);
      setLoading(false);
      setCurrentUser(user.id);

      // Show newest achievement as toast
      if (achievementsData && achievementsData.length > 0) {
        const newest = achievementsData[0];
        const isRecent = new Date().getTime() - new Date(newest.created_at).getTime() < 60000;
        if (isRecent) {
          setNewAchievement(newest.title);
          setTimeout(() => setNewAchievement(null), 4000);
        }
      }

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("tour") === "true") setShowTour(true);
      }

      emitCortexEvent({
        userId: user.id,
        type: "dashboard.loaded",
        source: "dashboard",
        data: {
          totalTasks: tasksData?.length || 0,
          completedTasks: tasksData?.filter((task) => task.completed).length || 0,
          subjects: subjectsData?.length || 0,
        },
      });

      if (streakResult?.changed) {
        emitCortexEvent({
          userId: user.id,
          type: "streak.updated",
          source: "dashboard",
          data: { streak: streakResult.streak, previousStreak: streakResult.previousStreak },
        });
      }

      setCortexTrigger(1);
    };

    fetchData();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return (
    <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
      Loading...
    </div>
  );

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const xpToNextLevel = (profile?.level || 1) * 100;
  const xpPercent = Math.min(((profile?.xp || 0) / xpToNextLevel) * 100, 100);
  const streak = profile?.streak || 0;

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };

  return (
    <div style={{ padding: "60px 24px 100px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        @keyframes badgeIn {
          from { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-20px) translateX(-50%); }
          to { opacity: 1; transform: translateY(0) translateX(-50%); }
        }
        @keyframes streakPulse {
          0%, 100% { box-shadow: 0 0 0 0 transparent; }
          50% { box-shadow: 0 0 20px 4px rgba(245,158,11,0.3); }
        }
        .stat-card { transition: transform 0.2s ease; }
        .stat-card:hover { transform: translateY(-2px); }
        .badge-icon {
          animation: badgeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          cursor: default;
        }
        .badge-icon:hover { transform: scale(1.2); transition: transform 0.2s ease; }
        .streak-pulse { animation: streakPulse 2s ease-in-out infinite; }
      `}</style>

      {/* Achievement toast */}
      {newAchievement && (
        <div style={{
          position: "fixed", top: "80px", left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(245,158,11,0.95)",
          color: "white",
          padding: "10px 20px",
          borderRadius: "99px",
          fontWeight: 700,
          fontSize: "14px",
          zIndex: 200,
          animation: "toastIn 0.3s ease forwards",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 20px rgba(245,158,11,0.4)",
        }}>
          🏆 Achievement unlocked: {newAchievement}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>Welcome back</p>
          <h1 style={{ fontSize: "24px", fontWeight: 800 }}>{profile?.username || "Student"} 👋</h1>
        </div>
        <button onClick={handleSignOut} style={{
          background: "var(--muted)", border: "none", borderRadius: "8px",
          padding: "8px 12px", color: "var(--muted-foreground)", fontSize: "13px", cursor: "pointer",
        }}>
          Sign out
        </button>
      </div>

      {/* Circular progress row */}
      <div style={{
        ...cardStyle,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "20px 16px",
      }}>
        <CircularProgress
          value={profile?.xp || 0}
          max={xpToNextLevel}
          size={80}
          color="#6366f1"
          label={`L${profile?.level || 1}`}
          sublabel={`${profile?.xp || 0} XP`}
        />
        <CircularProgress
          value={Math.min(streak, 30)}
          max={30}
          size={80}
          color="#f59e0b"
          label={`${streak}🔥`}
          sublabel={streak === 1 ? "1 day" : `${streak} days`}
        />
        <CircularProgress
          value={completedTasks}
          max={totalTasks || 1}
          size={80}
          color="#22c55e"
          label={`${progress}%`}
          sublabel={`${completedTasks}/${totalTasks} tasks`}
        />
      </div>

      {/* XP Progress bar */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600 }}>Level {profile?.level || 1} → {(profile?.level || 1) + 1}</p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{profile?.xp || 0} / {xpToNextLevel} XP</p>
        </div>
        <div style={{ background: "var(--muted)", borderRadius: "99px", height: "8px", overflow: "hidden" }}>
          <div style={{
            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
            borderRadius: "99px", height: "8px",
            width: `${xpPercent}%`,
            boxShadow: "0 0 12px rgba(99,102,241,0.6)",
            transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
          }} />
        </div>
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "6px", opacity: 0.7 }}>
          {xpToNextLevel - (profile?.xp || 0)} XP until next level
        </p>
      </div>

      {/* Daily Challenge */}
      <DailyChallenge userId={currentUser} />

      {/* Subjects */}
      {subjects.length > 0 && (
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, marginBottom: "12px" }}>Subjects</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {subjects.map((subject) => {
              const subjectTasks = tasks.filter(t => t.subject_id === subject.id);
              const subjectCompleted = subjectTasks.filter(t => t.completed).length;
              const subjectProgress = subjectTasks.length > 0
                ? Math.round((subjectCompleted / subjectTasks.length) * 100) : 0;
              return (
                <div key={subject.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 500 }}>{subject.name}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                        {subjectCompleted}/{subjectTasks.length}
                      </p>
                      {subjectProgress === 100 && <span>✅</span>}
                    </div>
                  </div>
                  <div style={{ background: "var(--muted)", borderRadius: "99px", height: "5px" }}>
                    <div style={{
                      background: subjectProgress === 100 ? "#22c55e" : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                      borderRadius: "99px", height: "5px",
                      width: `${subjectProgress}%`,
                      transition: "width 0.5s ease",
                      boxShadow: subjectProgress > 0 ? "0 0 6px rgba(99,102,241,0.4)" : "none",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Achievements — badge grid */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: "12px" }}>Achievements</p>
        {achievements.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>No achievements yet. Start studying!</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {achievements.map((achievement, i) => (
              <div
                key={achievement.id}
                className="badge-icon"
                title={achievement.title}
                style={{
                  animationDelay: `${i * 0.05}s`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  width: "64px",
                }}
              >
                <div style={{
                  width: "48px", height: "48px", borderRadius: "12px",
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "24px",
                }}>
                  {getAchievementIcon(achievement.title)}
                </div>
                <p style={{
                  fontSize: "10px", color: "var(--muted-foreground)",
                  textAlign: "center", lineHeight: 1.2,
                  overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", width: "100%",
                }}>
                  {achievement.title}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div id="cortex-card">
        <Cortex userId={currentUser} trigger={cortexTrigger} />
      </div>

      {showTour && (
        <Tour onComplete={async () => {
          setShowTour(false);
          await supabase.from("profiles").update({ onboarding_complete: true }).eq("id", currentUser);
          window.history.replaceState({}, "", "/dashboard");
        }} />
      )}
    </div>
  );
}
