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

## ✅ Phase 0 — Database Foundation (Complete)

These tables already exist in Supabase. Do NOT recreate them.
Existing tables: `achievements`, `cortex_insights`, `daily_challenges`, `exams`, `insights`, `profiles`, `study_topics`, `subjects`, `tasks`, `timetable`

- [x] 🔴 Create `insights` Supabase table
- [x] 🔴 Create `daily_challenges` Supabase table
- [x] 🔴 Create `achievements` Supabase table
- [x] 🔴 Create `cortex_insights` Supabase table
- [x] 🔴 insights table is confirmed working (empty = no data yet, not broken)    

---

## 🔴 Phase 1 — Frontend Features (Do Now)

- [x] 🔴 **Daily Challenge Component**
  - Already implemented on main: `src/components/DailyChallenge.jsx` (fetches `/api/challenges/today`), `src/app/api/challenges/today/route.js`, `src/app/api/challenges/today/complete/route.js`.
  - Was still marked `[ ]` here, causing 4 separate autonomous cycles (2026-08-04/05) to independently regenerate this same feature, opening PRs #77, #78, #79, #80 -- all now redundant/superseded, closed manually. #80 additionally broke the production build (deprecated `createServerComponentClient` import from `@supabase/auth-helpers-nextjs`, and destructively rewrote the existing 167-line working `challenges/today/route.js` down to a broken 61-line version). Marking `[x]` here so future cycles don't repeat this.

- [x] 🔴 **Badges & Achievements Display**
  - Already implemented on main under a different name: `src/app/(app)/achievements/page.tsx`, `src/contexts/AchievementsContext.tsx`, `src/hooks/useAchievements.ts`, `src/app/api/achievements/route.ts` (17-achievement catalog, rarity tiers, XP rewards, `user_achievements` table), plus `AchievementToast.tsx` for unlock notifications. Wired into exam-sim, tasks, lessons, and the app layout.
  - Was still marked `[ ]` here, causing separate cycles to independently rebuild this as `BadgeDisplay.jsx` + a second, conflicting `route.js` in the same folder as the real `route.ts` (10-badge catalog reading straight from the older, orphaned `achievements` table, incompatible id/field shape with the real system). `route.js` was silently shadowed by `route.ts` at build time and never executed; `BadgeDisplay.jsx` was never imported anywhere. Both deleted as dead code (2026-08-07). Marking `[x]` here so future cycles don't repeat this -- same bug class as the Daily Challenge duplication above.

- [ ] 🔴 **Cortex Insight History Page**
  - Build `src/app/insights/history/page.jsx`
  - Show all past Cortex insights for the logged-in user from `insights` table
  - Group by week, show date and insight text
  - Add a "most frequent pattern" summary at the top
  - File targets: `src/app/insights/history/page.jsx`, `src/components/InsightTimeline.jsx`

---

## 🟡 Phase 2 — Social & Competition

- [ ] 🟡 **Leaderboard Page**
  - Build `src/app/leaderboard/page.jsx`
  - Show top students ranked by XP this week
  - Display rank, username, XP, streak
  - Highlight current user's position even if not in top 10
  - File targets: `src/app/leaderboard/page.jsx`, `src/app/api/leaderboard/route.js`

- [ ] 🟡 **Goals System**
  - Let users set a weekly study goal
  - Show goal progress bar on dashboard
  - Cortex mentions goal progress in insights
  - File targets: `src/components/GoalTracker.jsx`, `src/app/api/goals/route.js`

- [ ] 🟡 **Streak Display Improvements**
  - Make streaks more visible on dashboard — flame icon, streak count
  - Add streak freeze mechanic (one free miss per week)
  - File targets: `src/components/StreakDisplay.jsx`, `src/lib/streaks.js`

---

## 🟢 Phase 3 — Polish & Experience

- [ ] 🟢 **Subject Progress Visualization**
  - Show per-subject progress bars or radar chart on dashboard
  - Use `study_topics` and `subjects` tables
  - File targets: `src/components/SubjectProgress.jsx`

- [ ] 🟢 **Dashboard Redesign**
  - Consolidate XP, streak, daily challenge, and latest Cortex insight
  - Make it feel alive — recent activity feed, next challenge, badge progress
  - File targets: `src/app/dashboard/page.jsx`

- [ ] 🟢 **Onboarding Flow**
  - 3-step onboarding for first-time users: pick subjects, set a goal, meet Cortex
  - File targets: `src/app/onboarding/page.jsx`

- [ ] 🟢 **Cortex Prompt Quality Improvement**
  - Improve Gemini prompt for insight generation
  - Insights should reference actual subject names and task counts
  - File targets: `src/lib/cortex/prompts.js`

---

## ✅ Completed

- [x] Cortex Engine setup and GitHub Actions scheduler
- [x] Supabase schema discovery
- [x] Database foundation (all core tables exist)
- [x] insights table created
- [x] daily_challenges table created
- [x] achievements table created

---

## 📋 Cortex Rules

1. Always open a PR — never push directly to main
2. One task at a time — finish before starting next
3. Update this file each cycle — mark tasks `[~]` when starting, `[x]` when PR is merged
4. Update DEVLOG.md every cycle
5. If a task is too large, split it and do Part 1 first
6. Prioritize retention over aesthetics
7. Keep code consistent with existing Next.js + Supabase + Node stack
8. NEVER create database tables that already exist — check the list above first
9. All app code goes under src/ — never at root level
10. Use ES module syntax (import/export) in all app files
11. NEVER use @supabase/auth-helpers-nextjs — use @supabase/supabase-js directly
12. Math Checker and Learn pages already exist — do not recreate them
13. The `insights` table EXISTS and is working — it is empty because no insights have been generated yet, NOT because it is broken. Do NOT recreate it or try to fix its schema.
14. Skip any task related to creating tables or fixing schemas — go directly to Phase 1 frontend tasks.

