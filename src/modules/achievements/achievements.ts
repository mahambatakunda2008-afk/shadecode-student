// src/modules/achievements/achievements.ts
// Shadecode Student - Achievement Engine

export type AchievementType =
  | "progress"
  | "streak"
  | "discipline"
  | "hidden";

export type AchievementRarity =
  | "common"
  | "rare"
  | "epic"
  | "legendary";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: AchievementType;
  requirement: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: Date;

  rarity: AchievementRarity;
  xpReward: number;
  icon: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type RichAchievement = Achievement;

export interface UserStats {
  tasksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  perfectDays: number;
  loginStreak: number;
  lastActive?: Date;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-task",
    title: "First Step",
    description: "Complete your first task",
    type: "progress",
    requirement: 1,
    progress: 0,
    unlocked: false,
    rarity: "common",
    xpReward: 25,
    icon: "🎯",
  },

  {
    id: "ten-tasks",
    title: "Getting Momentum",
    description: "Complete 10 tasks",
    type: "progress",
    requirement: 10,
    progress: 0,
    unlocked: false,
    rarity: "rare",
    xpReward: 100,
    icon: "⚡",
  },

  {
    id: "streak-3",
    title: "Warm Up",
    description: "Maintain a 3-day streak",
    type: "streak",
    requirement: 3,
    progress: 0,
    unlocked: false,
    rarity: "rare",
    xpReward: 75,
    icon: "🔥",
  },

  {
    id: "streak-7",
    title: "Consistency Spark",
    description: "Maintain a 7-day streak",
    type: "streak",
    requirement: 7,
    progress: 0,
    unlocked: false,
    rarity: "epic",
    xpReward: 150,
    icon: "🌟",
  },

  {
    id: "streak-30",
    title: "Unbreakable Focus",
    description: "Maintain a 30-day streak",
    type: "streak",
    requirement: 30,
    progress: 0,
    unlocked: false,
    rarity: "legendary",
    xpReward: 500,
    icon: "👑",
  },

  {
    id: "perfect-day",
    title: "Perfect Day",
    description: "Complete all tasks in a single day",
    type: "discipline",
    requirement: 1,
    progress: 0,
    unlocked: false,
    rarity: "rare",
    xpReward: 80,
    icon: "🏅",
  },

  {
    id: "week-of-focus",
    title: "Focused Week",
    description: "Complete all planned tasks for 5 days in a row",
    type: "discipline",
    requirement: 5,
    progress: 0,
    unlocked: false,
    rarity: "epic",
    xpReward: 250,
    icon: "🧠",
  },

  {
    id: "night-owl",
    title: "Night Owl",
    description: "Study consistently late at night",
    type: "hidden",
    requirement: 3,
    progress: 0,
    unlocked: false,
    rarity: "rare",
    xpReward: 120,
    icon: "🦉",
  },

  {
    id: "comeback-kid",
    title: "Comeback Kid",
    description: "Return after inactivity",
    type: "hidden",
    requirement: 1,
    progress: 0,
    unlocked: false,
    rarity: "epic",
    xpReward: 180,
    icon: "🚀",
  },
];

export function getRarityColor(rarity: AchievementRarity): string {
  switch (rarity) {
    case "common":
      return "#94a3b8";

    case "rare":
      return "#4f8cff";

    case "epic":
      return "#b84cff";

    case "legendary":
      return "#ffb84c";

    default:
      return "#ffffff";
  }
}

export function evaluateAchievements(
  userStats: UserStats,
  current: Achievement[] = ACHIEVEMENTS
): Achievement[] {
  return current.map((achievement) => {
    if (achievement.unlocked) return achievement;

    const progress = getAchievementProgress(
      achievement,
      userStats
    );

    const unlocked =
      progress >= achievement.requirement;

    return {
      ...achievement,
      progress,
      unlocked,
      unlockedAt: unlocked
        ? new Date()
        : achievement.unlockedAt,
    };
  });
}

function getAchievementProgress(
  achievement: Achievement,
  stats: UserStats
): number {
  switch (achievement.type) {
    case "progress":
      return stats.tasksCompleted;

    case "streak":
      return stats.currentStreak;

    case "discipline":
      return stats.perfectDays;

    case "hidden":
      return calculateHiddenProgress(
        achievement.id,
        stats
      );

    default:
      return 0;
  }
}

function calculateHiddenProgress(
  id: string,
  stats: UserStats
): number {
  switch (id) {
    case "night-owl":
      return Math.min(stats.loginStreak, 3);

    case "comeback-kid":
      return stats.lastActive ? 1 : 0;

    default:
      return 0;
  }
}

export function onTaskCompleted(
  stats: UserStats
): UserStats {
  return {
    ...stats,
    tasksCompleted:
      stats.tasksCompleted + 1,
  };
}

export function onStreakUpdate(
  stats: UserStats,
  isActive: boolean
): UserStats {
  if (!isActive) {
    return {
      ...stats,
      currentStreak: 0,
    };
  }

  const currentStreak =
    stats.currentStreak + 1;

  return {
    ...stats,
    currentStreak,
    longestStreak: Math.max(
      stats.longestStreak,
      currentStreak
    ),
  };
}

export function onPerfectDay(
  stats: UserStats
): UserStats {
  return {
    ...stats,
    perfectDays:
      stats.perfectDays + 1,
  };
}

export function getUnlockedAchievements(
  list: Achievement[]
): Achievement[] {
  return list.filter(
    (achievement) => achievement.unlocked
  );
}

export function getLockedAchievements(
  list: Achievement[]
): Achievement[] {
  return list.filter(
    (achievement) => !achievement.unlocked
  );
}

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
      updatedStats =
        onTaskCompleted(updatedStats);
      break;

    case "STREAK_UPDATED":
      updatedStats =
        onStreakUpdate(updatedStats, true);
      break;

    case "PERFECT_DAY":
      updatedStats =
        onPerfectDay(updatedStats);
      break;

    case "USER_RETURNED":
      updatedStats = {
        ...updatedStats,
        lastActive: new Date(),
        loginStreak:
          updatedStats.loginStreak + 1,
      };
      break;
  }

  return evaluateAchievements(
    updatedStats,
    achievements
  );
}

export function getNewlyUnlockedAchievements(
  previous: Achievement[],
  updated: Achievement[]
): RichAchievement[] {
  return updated.filter((updatedAchievement) => {
    const previousAchievement =
      previous.find(
        (a) => a.id === updatedAchievement.id
      );

    return (
      !previousAchievement?.unlocked &&
      updatedAchievement.unlocked
    );
  });
}

export interface AchievementUnlockEvent {
  achievements: RichAchievement[];
}

export function createUnlockPayload(
  achievements: RichAchievement[]
): AchievementUnlockEvent {
  return {
    achievements,
  };
}