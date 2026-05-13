// Shadecode Student - Achievements Module
// Minimal, scalable, retention-focused implementation

export type AchievementType = "progress" | "streak" | "discipline" | "hidden";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: AchievementType;
  requirement: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface UserStats {
  tasksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  perfectDays: number; // completed all planned tasks in a day
  loginStreak: number;
  lastActive?: Date;
}

// -----------------------------
// ACHIEVEMENT DEFINITIONS
// -----------------------------

export const ACHIEVEMENTS: Achievement[] = [
  // Progress
  {
    id: "first-task",
    title: "First Step",
    description: "Complete your first task",
    type: "progress",
    requirement: 1,
    progress: 0,
    unlocked: false,
  },
  {
    id: "ten-tasks",
    title: "Getting Momentum",
    description: "Complete 10 tasks",
    type: "progress",
    requirement: 10,
    progress: 0,
    unlocked: false,
  },

  // Streaks
  {
    id: "streak-3",
    title: "Warm Up",
    description: "Maintain a 3-day streak",
    type: "streak",
    requirement: 3,
    progress: 0,
    unlocked: false,
  },
  {
    id: "streak-7",
    title: "Consistency Spark",
    description: "Maintain a 7-day streak",
    type: "streak",
    requirement: 7,
    progress: 0,
    unlocked: false,
  },
  {
    id: "streak-30",
    title: "Unbreakable Focus",
    description: "Maintain a 30-day streak",
    type: "streak",
    requirement: 30,
    progress: 0,
    unlocked: false,
  },

  // Discipline
  {
    id: "perfect-day",
    title: "Perfect Day",
    description: "Complete all tasks in a single day",
    type: "discipline",
    requirement: 1,
    progress: 0,
    unlocked: false,
  },
  {
    id: "week-of-focus",
    title: "Focused Week",
    description: "Complete all planned tasks for 5 days in a row",
    type: "discipline",
    requirement: 5,
    progress: 0,
    unlocked: false,
  },

  // Hidden
  {
    id: "night-owl",
    title: "Night Owl",
    description: "Study consistently late at night",
    type: "hidden",
    requirement: 3,
    progress: 0,
    unlocked: false,
  },
  {
    id: "comeback-kid",
    title: "Comeback Kid",
    description: "Return after inactivity",
    type: "hidden",
    requirement: 1,
    progress: 0,
    unlocked: false,
  },
];

// -----------------------------
// CORE ENGINE
// -----------------------------

export function evaluateAchievements(
  userStats: UserStats,
  current: Achievement[] = ACHIEVEMENTS
): Achievement[] {
  return current.map((a) => {
    if (a.unlocked) return a;

    let progress = 0;

    switch (a.type) {
      case "progress":
        progress = userStats.tasksCompleted;
        break;

      case "streak":
        progress = userStats.currentStreak;
        break;

      case "discipline":
        progress = userStats.perfectDays;
        break;

      case "hidden":
        progress = calculateHiddenProgress(a.id, userStats);
        break;
    }

    const unlocked = progress >= a.requirement;

    return {
      ...a,
      progress,
      unlocked,
      unlockedAt: unlocked && !a.unlocked ? new Date() : a.unlockedAt,
    };
  });
}

// -----------------------------
// HIDDEN LOGIC (simple but expandable)
// -----------------------------

function calculateHiddenProgress(id: string, stats: UserStats): number {
  switch (id) {
    case "night-owl":
      return stats.loginStreak >= 3 ? 3 : stats.loginStreak;

    case "comeback-kid":
      return stats.lastActive ? 1 : 0;

    default:
      return 0;
  }
}

// -----------------------------
// EVENT UPDATERS
// -----------------------------

export function onTaskCompleted(stats: UserStats): UserStats {
  return {
    ...stats,
    tasksCompleted: stats.tasksCompleted + 1,
  };
}

export function onStreakUpdate(stats: UserStats, isActive: boolean): UserStats {
  if (!isActive) {
    return {
      ...stats,
      currentStreak: 0,
    };
  }

  return {
    ...stats,
    currentStreak: stats.currentStreak + 1,
    longestStreak: Math.max(stats.longestStreak, stats.currentStreak + 1),
  };
}

export function onPerfectDay(stats: UserStats): UserStats {
  return {
    ...stats,
    perfectDays: stats.perfectDays + 1,
  };
}

// -----------------------------
// UTIL
// -----------------------------

export function getUnlockedAchievements(list: Achievement[]) {
  return list.filter((a) => a.unlocked);
}

export function getLockedAchievements(list: Achievement[]) {
  return list.filter((a) => !a.unlocked);
}

// -----------------------------
// INTEGRATION LAYER (NEXT STEP)
// -----------------------------
// This is where Shadecode connects achievements to real app events.
// Wire these functions into your task, timetable, and streak systems.

export type AchievementEvent =
  | "TASK_COMPLETED"
  | "STREAK_UPDATED"
  | "PERFECT_DAY"
  | "USER_RETURNED";

export function handleAchievementEvent(
  event: AchievementEvent,
  stats: UserStats,
  achievements: Achievement[] = ACHIEVEMENTS
): Achievement[] {
  let updatedStats = { ...stats };

  switch (event) {
    case "TASK_COMPLETED":
      updatedStats = onTaskCompleted(updatedStats);
      break;

    case "STREAK_UPDATED":
      updatedStats = onStreakUpdate(updatedStats, true);
      break;

    case "PERFECT_DAY":
      updatedStats = onPerfectDay(updatedStats);
      break;

    case "USER_RETURNED":
      updatedStats = {
        ...updatedStats,
        lastActive: new Date(),
        loginStreak: updatedStats.loginStreak + 1,
      };
      break;
  }

  const evaluated = evaluateAchievements(updatedStats, achievements);

  const newlyUnlocked = evaluated.filter(
    (a, i) => !achievements[i]?.unlocked && a.unlocked
  );

  // This is your dopamine hook point
  if (newlyUnlocked.length > 0) {
    triggerAchievementUnlockEvent(newlyUnlocked);
  }

  return evaluated;
}

// -----------------------------
// UNLOCK HOOK (UI CONNECTOR)
// -----------------------------

function triggerAchievementUnlockEvent(newAchievements: Achievement[]) {
  // Replace this with your UI system (toast, modal, animation engine)
  console.log("🎉 Achievement Unlocked:", newAchievements.map(a => a.title));
}

// -----------------------------
// WHAT TO DO NEXT
// -----------------------------
// 1. Connect handleAchievementEvent to your task completion flow
// 2. Replace console.log with real UI popup system
// 3. Persist updated achievements to database per user
// 4. Add animation layer for unlock events

