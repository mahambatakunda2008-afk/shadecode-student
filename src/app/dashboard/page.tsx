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

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [cortexTrigger, setCortexTrigger] = useState(0);
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
        supabase.from("achievements").select("*").eq("user_id", user.id),
      ]);

      setProfile(profileData);
      setSubjects(subjectsData || []);
      setTasks(tasksData || []);
      setAchievements(achievementsData || []);
      setLoading(false);
      setCurrentUser(user.id);
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

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };

  const stats = [
    {
      id: "xp-card",
      label: "Level",
      value: profile?.level || 1,
      icon: "⚡",
      color: "#6366f1",
      glow: "rgba(99,102,241,0.15)",
      border: "rgba(99,102,241,0.3)",
      sub: `${profile?.xp || 0} XP total`,
    },
    {
      id: "",
      label: "XP",
      value: profile?.xp || 0,
      icon: "🔮",
      color: "#8b5cf6",
      glow: "rgba(139,92,246,0.15)",
      border: "rgba(139,92,246,0.3)",
      sub: `${xpToNextLevel - (profile?.xp || 0)} to next level`,
    },
    {
      id: "streak-card",
      label: "Streak",
      value: `${profile?.streak || 0}`,
      icon: "🔥",
      color: "#f59e0b",
      glow: "rgba(245,158,11,0.15)",
      border: "rgba(245,158,11,0.3)",
      sub: profile?.streak === 1 ? "1 day" : `${profile?.streak || 0} days`,
    },
    {
      id: "",
      label: "Tasks",
      value: `${completedTasks}/${totalTasks}`,
      icon: "✅",
      color: "#22c55e",
      glow: "rgba(34,197,94,0.15)",
      border: "rgba(34,197,94,0.3)",
      sub: `${progress}% complete`,
    },
  ];

  return (
    <div style={{ padding: "60px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        @keyframes cardPulse {
          0%, 100% { box-shadow: 0 0 0 0 transparent; }
          50% { box-shadow: 0 0 16px 2px var(--glow-color); }
        }
        .stat-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card:hover {
          transform: translateY(-2px);
        }
        .streak-active {
          animation: cardPulse 3s ease-in-out infinite;
          --glow-color: rgba(245,158,11,0.3);
        }
        .xp-bar-fill {
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .achievement-badge {
          transition: transform 0.2s ease;
        }
        .achievement-badge:hover {
          transform: scale(1.02);
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>Welcome back</p>
          <h1 style={{ fontSize: "24px", fontWeight: 800 }}>{profile?.username || "Student"} 👋</h1>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            background: "var(--muted)",
            border: "none",
            borderRadius: "8px",
            padding: "8px 12px",
            color: "var(--muted-foreground)",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            id={stat.id || undefined}
            className={`stat-card${stat.label === "Streak" && (profile?.streak || 0) > 1 ? " streak-active" : ""}`}
            style={{
              background: stat.glow,
              border: `1px solid ${stat.border}`,
              borderRadius: "14px",
              padding: "16px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background icon watermark */}
            <div style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "3rem",
              opacity: 0.1,
              pointerEvents: "none",
              userSelect: "none",
            }}>
              {stat.icon}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <span style={{ fontSize: "14px" }}>{stat.icon}</span>
              <p style={{ color: "var(--muted-foreground)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                {stat.label}
              </p>
            </div>
            <p style={{
              fontSize: "28px",
              fontWeight: 800,
              color: stat.color,
              lineHeight: 1,
              marginBottom: "4px",
            }}>
              {stat.value}
            </p>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", opacity: 0.7 }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* XP Progress */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600 }}>XP Progress</p>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>
              Level {profile?.level || 1} → Level {(profile?.level || 1) + 1}
            </p>
          </div>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{profile?.xp || 0} / {xpToNextLevel}</p>
        </div>
        <div style={{ background: "var(--muted)", borderRadius: "99px", height: "8px", position: "relative", overflow: "hidden" }}>
          <div
            className="xp-bar-fill"
            style={{
              background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
              borderRadius: "99px",
              height: "8px",
              width: `${xpPercent}%`,
              boxShadow: "0 0 12px rgba(99,102,241,0.6)",
            }}
          />
        </div>
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "6px", opacity: 0.7 }}>
          {xpToNextLevel - (profile?.xp || 0)} XP until next level
        </p>
      </div>

      {/* Daily Challenge */}
      <DailyChallenge userId={currentUser} />

      {/* Overall Progress */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600 }}>Overall Progress</p>
          <p style={{ fontSize: "13px", color: progress === 100 ? "#22c55e" : "var(--muted-foreground)" }}>{progress}%</p>
        </div>
        <div style={{ background: "var(--muted)", borderRadius: "99px", height: "8px" }}>
          <div style={{
            background: progress === 100 ? "#22c55e" : "linear-gradient(90deg, #22c55e, #16a34a)",
            borderRadius: "99px",
            height: "8px",
            width: `${progress}%`,
            boxShadow: progress > 0 ? "0 0 8px rgba(34,197,94,0.5)" : "none",
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* Subjects */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: "12px" }}>Subjects</p>
        {subjects.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>No subjects yet. Add them in Tasks.</p>
        ) : (
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
                      {subjectProgress === 100 && <span style={{ fontSize: "12px" }}>✅</span>}
                    </div>
                  </div>
                  <div style={{ background: "var(--muted)", borderRadius: "99px", height: "5px" }}>
                    <div style={{
                      background: subjectProgress === 100
                        ? "linear-gradient(90deg, #22c55e, #16a34a)"
                        : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                      borderRadius: "99px",
                      height: "5px",
                      width: `${subjectProgress}%`,
                      boxShadow: subjectProgress > 0
                        ? subjectProgress === 100
                          ? "0 0 6px rgba(34,197,94,0.4)"
                          : "0 0 6px rgba(99,102,241,0.4)"
                        : "none",
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: "12px" }}>Achievements</p>
        {achievements.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>No achievements yet. Start studying!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="achievement-badge"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "18px" }}>🏆</span>
                <p style={{ fontSize: "14px", fontWeight: 500 }}>{achievement.title}</p>
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
