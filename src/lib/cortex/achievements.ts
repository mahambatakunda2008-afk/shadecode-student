/**
 * Cortex Achievement System
 *
 * Gamification engine that tracks student milestones,
 * awards achievements, and provides progress feedback.
 */

import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { awardXPBySource } from "@/lib/xp/manager";

// This whole module is only ever called from server-side API routes
// (api/achievements, api/cortex/mark-exam) acting on an explicit userId --
// never from a genuine browser session. The browser client
// (@/lib/supabase/client) has no session/cookies in that context, so RLS
// silently blocked every read and write here.
function createClient() {
  return createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Lucide icon name. Kept as a string so achievement data stays serializable. */
  icon: string;
  rarity: AchievementRarity;
  xpReward: number;
  condition: (stats: StudentStats) => boolean;
  secret?: boolean;
}

export interface StudentStats {
  totalTasksCompleted: number;
  totalExamsCompleted: number;
  totalLessonsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyMinutes: number;
  subjectsCount: number;
  averageExamScore: number;
  tasksCompletedToday: number;
  perfectExamCount: number;
}

export interface UnlockedAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  xpReward: number;
  unlockedAt: string;
  seen: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_task",
    title: "First Steps",
    description: "Complete your first task",
    icon: "Target",
    rarity: "common",
    xpReward: 25,
    condition: (s) => s.totalTasksCompleted >= 1,
  },
  {
    id: "task_master_10",
    title: "Task Master",
    description: "Complete 10 tasks",
    icon: "ListChecks",
    rarity: "common",
    xpReward: 50,
    condition: (s) => s.totalTasksCompleted >= 10,
  },
  {
    id: "task_champion_50",
    title: "Task Champion",
    description: "Complete 50 tasks",
    icon: "Trophy",
    rarity: "rare",
    xpReward: 150,
    condition: (s) => s.totalTasksCompleted >= 50,
  },
  {
    id: "first_exam",
    title: "Exam Warrior",
    description: "Complete your first exam",
    icon: "FileCheck2",
    rarity: "common",
    xpReward: 50,
    condition: (s) => s.totalExamsCompleted >= 1,
  },
  {
    id: "exam_pro_10",
    title: "Exam Pro",
    description: "Complete 10 exams",
    icon: "GraduationCap",
    rarity: "rare",
    xpReward: 200,
    condition: (s) => s.totalExamsCompleted >= 10,
  },
  {
    id: "streak_3",
    title: "Getting Started",
    description: "Maintain a 3-day study streak",
    icon: "Flame",
    rarity: "common",
    xpReward: 75,
    condition: (s) => s.currentStreak >= 3,
  },
  {
    id: "streak_7",
    title: "Week Warrior",
    description: "Maintain a 7-day study streak",
    icon: "Flame",
    rarity: "rare",
    xpReward: 150,
    condition: (s) => s.currentStreak >= 7,
  },
  {
    id: "streak_30",
    title: "Monthly Legend",
    description: "Maintain a 30-day study streak",
    icon: "Sparkles",
    rarity: "legendary",
    xpReward: 500,
    condition: (s) => s.currentStreak >= 30,
  },
  {
    id: "subject_explorer",
    title: "Subject Explorer",
    description: "Study 3 or more subjects",
    icon: "Search",
    rarity: "common",
    xpReward: 50,
    condition: (s) => s.subjectsCount >= 3,
  },
  {
    id: "subject_polyglot",
    title: "Subject Polyglot",
    description: "Study 5 or more subjects",
    icon: "Languages",
    rarity: "rare",
    xpReward: 150,
    condition: (s) => s.subjectsCount >= 5,
  },
  {
    id: "perfect_score",
    title: "Perfect Score",
    description: "Score 100% on any exam",
    icon: "BadgeCheck",
    rarity: "epic",
    xpReward: 250,
    condition: (s) => s.perfectExamCount >= 1,
  },
  {
    id: "study_marathon_5h",
    title: "Study Marathon",
    description: "Study for 5 hours total",
    icon: "Timer",
    rarity: "common",
    xpReward: 75,
    condition: (s) => s.totalStudyMinutes >= 300,
  },
  {
    id: "study_marathon_20h",
    title: "Dedicated Scholar",
    description: "Study for 20 hours total",
    icon: "BookOpen",
    rarity: "rare",
    xpReward: 300,
    condition: (s) => s.totalStudyMinutes >= 1200,
  },
  {
    id: "lesson_learner_5",
    title: "Eager Learner",
    description: "Complete 5 lessons",
    icon: "BookOpen",
    rarity: "common",
    xpReward: 50,
    condition: (s) => s.totalLessonsCompleted >= 5,
  },
  {
    id: "lesson_learner_25",
    title: "Knowledge Seeker",
    description: "Complete 25 lessons",
    icon: "BookOpen",
    rarity: "rare",
    xpReward: 200,
    condition: (s) => s.totalLessonsCompleted >= 25,
  },
  {
    id: "top_performer",
    title: "Top Performer",
    description: "Achieve average exam score above 80%",
    icon: "Star",
    rarity: "epic",
    xpReward: 350,
    condition: (s) => s.averageExamScore >= 80 && s.totalExamsCompleted >= 3,
  },
  {
    id: "daily_dedication",
    title: "Daily Dedication",
    description: "Complete tasks 7 days in a row",
    icon: "CalendarCheck",
    rarity: "epic",
    xpReward: 400,
    condition: (s) => s.longestStreak >= 7,
  },
];

const ACHIEVEMENT_TABLE = "user_achievements";

export async function getAchievements(): Promise<Achievement[]> {
  return ACHIEVEMENTS;
}

export async function getStudentStats(userId: string): Promise<StudentStats> {
  const supabase = createClient();

  const [tasksRes, memoryRes, profileRes, subjectsRes] = await Promise.all([
    supabase.from("tasks").select("completed, created_at").eq("user_id", userId),
    supabase.from("cortex_memory").select("exam_scores, total_lessons_completed, total_study_time_minutes, longest_streak, current_streak").eq("user_id", userId).single(),
    supabase.from("profiles").select("xp, level, streak").eq("id", userId).single(),
    supabase.from("subjects").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const tasks = (tasksRes.data ?? []) as Array<{ completed: boolean; created_at: string }>;
  const memory = memoryRes?.data as any;
  const profile = profileRes?.data as any;

  const today = new Date().toDateString();
  const tasksToday = tasks.filter((t) => {
    if (!t.completed) return false;
    const taskDate = new Date(t.created_at).toDateString();
    return taskDate === today;
  });

  const examScores: Array<{ score: number; percentage?: number }> = memory?.exam_scores ?? [];
  const examPct = (e: { score: number; percentage?: number }) => e.percentage ?? e.score ?? 0;
  const avgScore = examScores.length > 0
    ? Math.round(examScores.reduce((s: number, e) => s + examPct(e), 0) / examScores.length)
    : 0;

  return {
    totalTasksCompleted: tasks.filter((t) => t.completed).length,
    totalExamsCompleted: examScores.length,
    totalLessonsCompleted: memory?.total_lessons_completed ?? 0,
    currentStreak: profile?.streak ?? 0,
    longestStreak: memory?.longest_streak ?? 0,
    totalStudyMinutes: memory?.total_study_time_minutes ?? 0,
    subjectsCount: subjectsRes.count ?? 0,
    averageExamScore: avgScore,
    tasksCompletedToday: tasksToday.length,
    perfectExamCount: examScores.filter((e) => examPct(e) === 100).length,
  };
}

export async function checkAndUnlockAchievements(userId: string): Promise<UnlockedAchievement[]> {
  const supabase = createClient();
  const stats = await getStudentStats(userId);

  const { data: existing } = await supabase
    .from(ACHIEVEMENT_TABLE)
    .select("achievement_id")
    .eq("user_id", userId);

  const unlockedIds = new Set((existing ?? []).map((r: any) => r.achievement_id));
  const newlyUnlocked: UnlockedAchievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.id)) continue;
    if (!achievement.condition(stats)) continue;

    const unlocked: UnlockedAchievement = {
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      rarity: achievement.rarity,
      xpReward: achievement.xpReward,
      unlockedAt: new Date().toISOString(),
      seen: false,
    };

    const { error } = await supabase
      .from(ACHIEVEMENT_TABLE)
      .insert({
        user_id: userId,
        achievement_id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        xp_reward: achievement.xpReward,
        unlocked_at: unlocked.unlockedAt,
      });

    if (!error) {
      newlyUnlocked.push(unlocked);
      await awardXPBySource(userId, "achievement_unlock", { rarity: achievement.rarity });
    }
  }

  return newlyUnlocked;
}

export async function getUserAchievements(userId: string): Promise<UnlockedAchievement[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from(ACHIEVEMENT_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  return (data ?? []).map((r: any) => ({
    id: r.achievement_id,
    title: r.title,
    description: r.description,
    icon: r.icon,
    rarity: r.rarity as AchievementRarity,
    xpReward: r.xp_reward,
    unlockedAt: r.unlocked_at,
    seen: r.seen ?? false,
  }));
}
