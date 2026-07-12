<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:cortex-architecture -->
# Cortex Architecture (Shadecode Student)

## Intelligence Layer (`src/lib/cortex/`)
- **intelligence.ts** — Generates full intelligence reports, study pattern analysis, personalized prompts
- **lessonGenerator.ts** — AI-powered lesson content generation with practice questions
- **examGenerator.ts** — AI-powered exam paper generation with varied question types
- **markingEngine.ts** — AI-powered exam marking with partial credit and feedback
- **mathEngine.ts** — AI math problem solver with step-by-step solutions
- **achievements.ts** — Gamification engine: 17 achievements across 4 rarity tiers

## Runtime (`src/lib/cortex/runtime/`)
- **ai-gateway.ts** — Central AI dispatcher with caching, fingerprinting, deduplication
- **engine.ts** — Fingerprinting and deterministic insight resolution
- **insights.ts** — Canonical cortex_insights table access layer
- **templates.ts** — Deterministic insight templates (offline/fallback)
- **cache.ts** — In-memory cache with TTL
- **scores.ts** — Score computation

## Core (`src/lib/cortex/`)
- **core.ts** — CortexCore decision engine (learn/practice/exam/feedback routing)
- **router.ts** — CortexRouter: memory-first question routing (local → teacher AI)
- **memory.ts** — Persistent memory via cortex_memory table + in-memory cache
- **memoryTracker.ts** — Tracks study sessions, exam results, streaks, lessons
- **teacher.ts** — TeacherAI with multi-provider fallback (OpenAI → Gemini → Cloudflare → OpenRouter)
- **localModel.ts** — Lightweight local inference engine
- **tutor.ts** — Session-based tutoring recommendations

## API Routes (`src/app/api/cortex/`)
- `/cortex` (POST) — CortexCore routing, behavioral insights, career APIs
- `/cortex/intelligence` — Full intelligence reports + study patterns
- `/cortex/generate-lesson` — AI lesson generation
- `/cortex/generate-exam` — AI exam generation
- `/cortex/mark-exam` — AI exam marking + achievement checking
- `/cortex/math-check` — AI math solving and answer checking
- `/cortex/insight` — Insight CRUD

## Hooks (`src/hooks/`)
- **useCortexIntelligence** — Fetch intelligence reports and patterns
- **useLessonGenerator** — Generate AI lessons
- **useExamGenerator** — Generate and mark exams
- **useMathChecker** — Solve and check math problems
- **useAchievements** — Track and unlock achievements

## Pages (`src/app/(app)/`)
- **dashboard/** — Includes CortexIntelligencePanel sidebar
- **achievements/** — Achievement gallery with progress tracking
- **ai-lesson/** — AI lesson generator page
- **exam-sim/** — Practice exams with AI marking
- **math-checker/** — Math problem solver and checker

## New Database Tables
- **user_achievements** — Unlocked achievements per user (migration: 0023)

## Build
- `npm run dev` — Development
- `npm run build` — Production build (pre-existing ts errors in CourseCatalog.tsx and revisionQueue.ts are unrelated)
- `npm run lint` — ESLint
<!-- END:cortex-architecture -->
