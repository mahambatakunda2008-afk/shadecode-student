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


// -----------------------------
// UI LAYER: ACHIEVEMENT UNLOCK SYSTEM
// -----------------------------
// This is the emotional core of Shadecode achievements.
// Replace console logging with this system for real user impact.

export interface AchievementUnlockPayload {
  achievements: Achievement[];
}

export function showAchievementUnlock(payload: AchievementUnlockPayload) {
  const { achievements } = payload;

  // Step 1: Create overlay container
  const overlay = document.createElement("div");
  overlay.id = "achievement-unlock-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "rgba(0,0,0,0.75)";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";
  overlay.style.color = "white";
  overlay.style.fontFamily = "sans-serif";

  // Step 2: Build content
  const container = document.createElement("div");
  container.style.textAlign = "center";
  container.style.animation = "popIn 0.6s ease-out";

  const title = document.createElement("h1");
  title.innerText = "🎉 Achievement Unlocked";
  title.style.fontSize = "2rem";
  title.style.marginBottom = "1rem";

  container.appendChild(title);

  achievements.forEach((a) => {
    const badge = document.createElement("div");
    badge.style.margin = "1rem 0";
    badge.style.padding = "1rem 2rem";
    badge.style.border = "2px solid white";
    badge.style.borderRadius = "12px";
    badge.style.display = "inline-block";

    const name = document.createElement("h2");
    name.innerText = a.title;

    const desc = document.createElement("p");
    desc.innerText = a.description;
    desc.style.opacity = "0.8";

    badge.appendChild(name);
    badge.appendChild(desc);

    container.appendChild(badge);
  });

  const hint = document.createElement("p");
  hint.innerText = "Keep going. Momentum is building.";
  hint.style.marginTop = "2rem";
  hint.style.opacity = "0.6";

  container.appendChild(hint);
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  // Step 3: Auto remove after delay
  setTimeout(() => {
    overlay.remove();
  }, 3500);
}

// -----------------------------
// ANIMATION KEYFRAME INJECTION
// -----------------------------

const style = document.createElement("style");
style.innerHTML = `
@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
`;
document.head.appendChild(style);

// -----------------------------
// NEXT EVOLUTION
// -----------------------------
// Replace DOM system with:
// - React modal system OR
// - Framer Motion animations
// - Sound effects (optional)
// - Particle bursts for elite achievements


// -----------------------------
// EVOLUTION: RARITY + REACT-READY UNLOCK SYSTEM
// -----------------------------
// This upgrades Shadecode from "popup engine" → "experience engine"

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export interface RichAchievement extends Achievement {
  rarity?: AchievementRarity;
  xpReward?: number;
}

// Suggested rarity rules (design layer, not enforced logic yet):
// common     -> basic progress
// rare       -> streak milestones
// epic       -> discipline consistency
// legendary  -> hidden + comeback + extreme consistency

export function getRarityColor(rarity?: AchievementRarity) {
  switch (rarity) {
    case "rare": return "#4f8cff";
    case "epic": return "#b84cff";
    case "legendary": return "#ffb84c";
    default: return "#ffffff";
  }
}

// -----------------------------
// REACT-READY UNLOCK MODEL (replaces DOM system)
// -----------------------------

export interface AchievementUnlockEvent {
  achievements: RichAchievement[];
}

/*
Example React usage (future implementation):

<AchievementModal
  open={true}
  achievements={unlockedAchievements}
  onClose={...}
/>

with Framer Motion:
- fade background
- scale + spring badge reveal
- stagger multiple achievements
*/

export function createUnlockPayload(achievements: RichAchievement[]): AchievementUnlockEvent {
  return {
    achievements
  };
}

// -----------------------------
// NEXT ARCHITECTURE SHIFT
// -----------------------------
// Replace showAchievementUnlock (DOM) with:
// 1. React modal system
// 2. Framer Motion animations
// 3. rarity-based glow effects
// 4. sound design layer (optional)
//
// RESULT:
// Shadecode becomes emotionally "cinematic" instead of functional UI


// -----------------------------
// REACT EXPERIENCE LAYER: ACHIEVEMENT MODAL (FRAMER MOTION)
// -----------------------------
// This replaces DOM popups with a production-grade cinematic unlock experience.

/*
Dependencies (assumed):
- react
- framer-motion
*/

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface AchievementModalProps {
  open: boolean;
  achievements: RichAchievement[];
  onClose: () => void;
}

export function AchievementModal({ open, achievements, onClose }: AchievementModalProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            style={{
              background: "#111",
              borderRadius: "16px",
              padding: "24px",
              minWidth: "320px",
              maxWidth: "420px",
              color: "white",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: "16px" }}>🎉 Achievement Unlocked</h2>

            {achievements.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                  margin: "12px 0",
                  padding: "12px",
                  borderRadius: "12px",
                  border: `1px solid ${getRarityColor(a.rarity)}`,
                  boxShadow: `0 0 12px ${getRarityColor(a.rarity)}33`,
                }}
              >
                <div style={{ fontWeight: 600 }}>{a.title}</div>
                <div style={{ opacity: 0.7, fontSize: "0.9rem" }}>
                  {a.description}
                </div>
                {a.rarity && (
                  <div style={{ fontSize: "0.75rem", marginTop: "6px", color: getRarityColor(a.rarity) }}>
                    {a.rarity.toUpperCase()}
                  </div>
                )}
              </motion.div>
            ))}

            <div style={{ marginTop: "16px", opacity: 0.6, fontSize: "0.85rem" }}>
              Momentum is building. Keep going.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// -----------------------------
// CONNECTOR NOTE
// -----------------------------
// Wire this component to triggerAchievementUnlockEvent
// using global state (Redux, Zustand, Context, etc.)
//
// NEXT POSSIBLE UPGRADE:
// - particle burst system for legendary achievements
// - sound engine (low latency audio feedback)
// - queue system for multiple unlocks

