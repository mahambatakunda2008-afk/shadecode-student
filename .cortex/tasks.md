# 🧠 Cortex Task Roadmap
> This file is read by Cortex Engine every cycle.
> Cortex picks the highest priority incomplete task and works on it.
> Do not delete completed tasks — they are part of the audit trail.

---

## How Cortex Uses This File

- `[ ]` = pending — Cortex will pick this up
- `[~]` = in progress — Cortex is working on it
- `[x]` = done — merged into main
- Priority: `🔴 high` `🟡 medium` `🟢 low`

Cortex works top to bottom, high priority first. Max 1-2 tasks per cycle.

---

## 🔴 Phase 1 — Retention Hooks (Do First)

- [ ] 🔴 **Daily Challenges System**
  - Create a `daily_challenges` Supabase table (id, title, description, xp_reward, date, type)
  - Build `/api/challenges/today` endpoint that returns today's challenge
  - Build `DailyChallenge` React component showing challenge + completion button
  - Reset challenges every midnight automatically
  - Award XP on completion, update user record
  - File targets: `lib/challenges.js`, `app/api/challenges/route.js`, `components/DailyChallenge.jsx`

- [ ] 🔴 **Badges & Achievements System**
  - Create `badges` and `user_badges` Supabase tables
  - Define 10 starter badges: First Login, 3-Day Streak, 7-Day Streak, 10 Tasks Done, First Insight, Night Owl, Early Bird, Subject Master, XP Milestone, Cortex Veteran
  - Build badge award logic that triggers after each session
  - Build `BadgeDisplay` component showing earned badges with unlock animations
  - File targets: `lib/badges.js`, `components/BadgeDisplay.jsx`, `components/BadgeUnlock.jsx`

- [ ] 🔴 **Cortex Insight History**
  - Build `/insights/history` page showing all past Cortex insights for the user
  - Group insights by week, show patterns over time
  - Add a "most repeated pattern" summary at the top
  - Make insights searchable by subject or date
  - File targets: `app/insights/history/page.jsx`, `components/InsightTimeline.jsx`

---

## 🟡 Phase 2 — Social & Competition

- [ ] 🟡 **Leaderboard**
  - Create leaderboard page `/leaderboard` showing top students by XP this week
  - Show rank, username, XP, streak
  - Highlight current user's position even if not in top 10
  - Add weekly reset logic
  - File targets: `app/leaderboard/page.jsx`, `app/api/leaderboard/route.js`

- [ ] 🟡 **Goals System**
  - Let users set a study goal (e.g. "Complete 20 tasks this week", "Study Math every day")
  - Cortex tracks progress toward goal and mentions it in insights
  - Show goal progress bar on dashboard
  - File targets: `lib/goals.js`, `components/GoalTracker.jsx`, `app/api/goals/route.js`

- [ ] 🟡 **Study Streak Improvements**
  - Make streaks more visible — show flame icon, streak count on dashboard
  - Add streak freeze mechanic (one free miss per week)
  - Notify user if streak is at risk (end of day with no activity)
  - File targets: `components/StreakDisplay.jsx`, `lib/streaks.js`

---

## 🟢 Phase 3 — Polish & Experience

- [ ] 🟢 **Subject Progress Visualization**
  - Show per-subject progress bars or radar chart on dashboard
  - Track time spent and tasks completed per subject
  - Cortex uses this data to generate more specific insights
  - File targets: `components/SubjectProgress.jsx`, `lib/subjects.js`

- [ ] 🟢 **Dashboard Redesign**
  - Consolidate XP, streak, daily challenge, and latest Cortex insight into one clean dashboard
  - Make it feel alive — recent activity feed, next challenge, badge progress
  - File targets: `app/dashboard/page.jsx`, `components/Dashboard.jsx`

- [ ] 🟢 **Onboarding Flow**
  - First-time users get a 3-step onboarding: pick subjects, set a goal, meet Cortex
  - Reduces early drop-off from confusion
  - File targets: `app/onboarding/page.jsx`, `components/OnboardingSteps.jsx`

- [ ] 🟢 **Cortex Prompt Quality Improvement**
  - Review current Gemini prompt used for insight generation
  - Improve specificity — insights should reference actual subject names and task counts
  - Add tone calibration — insights should feel sharp and analytical, never generic
  - File targets: `lib/cortex/prompts.js`

---

## ✅ Completed

*Nothing yet — Cortex hasn't started. First cycle incoming.*

---

## 📋 Cortex Rules

1. Always open a PR — never push directly to main
2. One task at a time — finish before starting next
3. Update this file each cycle — mark tasks `[~]` when starting, `[x]` when PR is merged
4. Update DEVLOG.md every cycle
5. If a task is too large, split it and do Part 1 first
6. Prioritize retention over aesthetics
7. Keep code consistent with existing Next.js + Supabase + Node stack
