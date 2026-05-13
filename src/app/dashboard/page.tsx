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

function CircularProgress({
  value,
  max,
  size = 80,
  color = "#6366f1",
  label,
  sublabel,
}: {
  value: number;
  max: number;
  size?: number;
  color?: string;
  label: string;
  sublabel?: string;
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
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1s ease",
              filter: `drop-shadow(0 0 4px ${color}80)`,
            }}
          />
        </svg>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
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

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [cortexTrigger, setCortexTrigger] = useState(0);
  const [showTour, setShowTour] = useState(false);

  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [currentUser, setCurrentUser] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const streakResult = await updateStreak(user.id);

      const [{ data: profileData }, { data: subjectsData }, { data: tasksData }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("subjects").select("*").eq("user_id", user.id),
          supabase.from("tasks").select("*").eq("user_id", user.id),
        ]);

      setProfile(profileData);
      setSubjects(subjectsData || []);
      setTasks(tasksData || []);
      setLoading(false);
      setCurrentUser(user.id);

      // Cortex analytics
      emitCortexEvent({
        userId: user.id,
        type: "dashboard.loaded",
        source: "dashboard",
        data: {
          totalTasks: tasksData?.length || 0,
          completedTasks: tasksData?.filter((t) => t.completed).length || 0,
          subjects: subjectsData?.length || 0,
        },
      });

      if (streakResult?.changed) {
        emitCortexEvent({
          userId: user.id,
          type: "streak.updated",
          source: "dashboard",
          data: {
            streak: streakResult.streak,
            previousStreak: streakResult.previousStreak,
          },
        });
      }

      setCortexTrigger(1);

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("tour") === "true") setShowTour(true);
      }
    };

    fetchData();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading)
    return (
      <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
        Loading...
      </div>
    );

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const xpToNextLevel = (profile?.level || 1) * 100;

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };

  return (
    <div style={{ padding: "60px 24px 100px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>Welcome back</p>
          <h1 style={{ fontSize: "24px", fontWeight: 800 }}>
            {profile?.username || "Student"} 👋
          </h1>
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

      {/* Progress row */}
      <div
        style={{
          ...cardStyle,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        <CircularProgress
          value={profile?.xp || 0}
          max={xpToNextLevel}
          label={`L${profile?.level || 1}`}
          sublabel={`${profile?.xp || 0} XP`}
        />

        <CircularProgress
          value={Math.min(profile?.streak || 0, 30)}
          max={30}
          color="#f59e0b"
          label={`${profile?.streak || 0}🔥`}
          sublabel="streak"
        />

        <CircularProgress
          value={completedTasks}
          max={totalTasks || 1}
          color="#22c55e"
          label={`${progress}%`}
          sublabel={`${completedTasks}/${totalTasks}`}
        />
      </div>

      {/* XP bar */}
      <div style={cardStyle}>
        <p style={{ fontSize: "13px", fontWeight: 600 }}>
          Level {profile?.level || 1} → {(profile?.level || 1) + 1}
        </p>
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
          {profile?.xp || 0} / {xpToNextLevel} XP
        </p>
      </div>

      <DailyChallenge userId={currentUser} />

      {/* Subjects */}
      {subjects.length > 0 && (
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, marginBottom: "12px" }}>Subjects</p>

          {subjects.map((subject) => {
            const subjectTasks = tasks.filter((t) => t.subject_id === subject.id);
            const done = subjectTasks.filter((t) => t.completed).length;
            const percent = subjectTasks.length
              ? Math.round((done / subjectTasks.length) * 100)
              : 0;

            return (
              <div key={subject.id} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <p>{subject.name}</p>
                  <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                    {done}/{subjectTasks.length}
                  </p>
                </div>

                <div style={{ background: "var(--muted)", height: "5px", borderRadius: "99px" }}>
                  <div
                    style={{
                      width: `${percent}%`,
                      height: "5px",
                      background: "#6366f1",
                      borderRadius: "99px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div id="cortex-card">
        <Cortex userId={currentUser} trigger={cortexTrigger} />
      </div>

      {showTour && (
        <Tour
          onComplete={async () => {
            setShowTour(false);
            await supabase
              .from("profiles")
              .update({ onboarding_complete: true })
              .eq("id", currentUser);

            window.history.replaceState({}, "", "/dashboard");
          }}
        />
      )}
    </div>
  );
}
