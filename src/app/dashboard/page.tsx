"use client";

import Cortex from "@/components/cortex/Cortex";
import DailyChallenge from "@/components/DailyChallenge";
import AchievementModal from "@/modules/achievements/AchievementModal";

import {
  ACHIEVEMENTS,
  Achievement,
  RichAchievement,
  UserStats,
  handleAchievementEvent,
  getNewlyUnlockedAchievements,
} from "@/modules/achievements/achievements";

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

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [cortexTrigger, setCortexTrigger] = useState(0);
  const [showTour, setShowTour] = useState(false);

  // 🏆 Achievement system state
  const [achievementState, setAchievementState] =
    useState<Achievement[]>(ACHIEVEMENTS);

  const [unlockedAchievements, setUnlockedAchievements] =
    useState<RichAchievement[]>([]);

  const [showAchievementModal, setShowAchievementModal] =
    useState(false);

  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [currentUser, setCurrentUser] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const streakResult = await updateStreak(user.id);

      const [
        { data: profileData },
        { data: subjectsData },
        { data: tasksData },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("subjects").select("*").eq("user_id", user.id),
        supabase.from("tasks").select("*").eq("user_id", user.id),
      ]);

      setProfile(profileData);
      setSubjects(subjectsData || []);
      setTasks(tasksData || []);
      setLoading(false);
      setCurrentUser(user.id);

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

  // 🧠 Derived stats for engine
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const userStats: UserStats = {
    tasksCompleted: completedTasks,
    currentStreak: profile?.streak || 0,
    longestStreak: profile?.streak || 0,
    perfectDays: progress === 100 ? 1 : 0,
    loginStreak: profile?.streak || 0,
  };

  // 🔥 Run achievement engine whenever progress changes
  useEffect(() => {
    if (!profile) return;

    const updated = handleAchievementEvent(
      "TASK_COMPLETED",
      userStats,
      achievementState
    );

    const unlocked = getNewlyUnlockedAchievements(
      achievementState,
      updated
    );

    if (unlocked.length > 0) {
      setUnlockedAchievements(unlocked);
      setShowAchievementModal(true);
    }

    setAchievementState(updated);
  }, [completedTasks]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: "60px 24px 100px", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Welcome back</p>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>
            {profile?.username || "Student"} 👋
          </h1>
        </div>

        <button onClick={handleSignOut}>Sign out</button>
      </div>

      {/* Stats */}
      <div>
        <p>Tasks: {completedTasks}/{totalTasks}</p>
        <p>Progress: {progress}%</p>
      </div>

      {/* Daily Challenge */}
      <DailyChallenge userId={currentUser} />

      {/* Cortex */}
      <Cortex userId={currentUser} trigger={cortexTrigger} />

      {/* Achievement Modal */}
      <AchievementModal
        open={showAchievementModal}
        achievements={unlockedAchievements}
        onClose={() => {
          setShowAchievementModal(false);
          setUnlockedAchievements([]);
        }}
      />

      {/* Tour */}
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