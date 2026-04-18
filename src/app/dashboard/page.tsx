"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

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
    };

    fetchData();
  }, []);

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

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };

  return (
    <div style={{ padding: "60px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
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
        {[
          { label: "Level", value: profile?.level || 1, color: "var(--primary)" },
          { label: "XP", value: profile?.xp || 0, color: "var(--primary)" },
          { label: "🔥 Streak", value: `${profile?.streak || 0} days`, color: "#f59e0b" },
          { label: "Tasks", value: `${completedTasks}/${totalTasks}`, color: "var(--success)" },
        ].map((stat) => (
          <div key={stat.label} style={cardStyle}>
            <p style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>{stat.label}</p>
            <p style={{ fontSize: "24px", fontWeight: 800, color: stat.color, marginTop: "4px" }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* XP Progress */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600 }}>XP Progress</p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{profile?.xp || 0} / {xpToNextLevel}</p>
        </div>
        <div style={{ background: "var(--muted)", borderRadius: "99px", height: "8px" }}>
          <div style={{
            background: "var(--primary)",
            borderRadius: "99px",
            height: "8px",
            width: `${Math.min(((profile?.xp || 0) / xpToNextLevel) * 100, 100)}%`,
            boxShadow: "0 0 8px var(--primary-glow)",
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* Overall Progress */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600 }}>Overall Progress</p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{progress}%</p>
        </div>
        <div style={{ background: "var(--muted)", borderRadius: "99px", height: "8px" }}>
          <div style={{
            background: "var(--success)",
            borderRadius: "99px",
            height: "8px",
            width: `${progress}%`,
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
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {subjects.map((subject) => {
              const subjectTasks = tasks.filter(t => t.subject_id === subject.id);
              const subjectCompleted = subjectTasks.filter(t => t.completed).length;
              const subjectProgress = subjectTasks.length > 0
                ? Math.round((subjectCompleted / subjectTasks.length) * 100) : 0;
              return (
                <div key={subject.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 500 }}>{subject.name}</p>
                    <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                      {subjectCompleted}/{subjectTasks.length}
                    </p>
                  </div>
                  <div style={{ background: "var(--muted)", borderRadius: "99px", height: "4px" }}>
                    <div style={{
                      background: "var(--primary)",
                      borderRadius: "99px",
                      height: "4px",
                      width: `${subjectProgress}%`,
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
              <div key={achievement.id} style={{
                background: "var(--muted)",
                borderRadius: "8px",
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}>
                <span style={{ fontSize: "18px" }}>🏆</span>
                <p style={{ fontSize: "14px", fontWeight: 500 }}>{achievement.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}