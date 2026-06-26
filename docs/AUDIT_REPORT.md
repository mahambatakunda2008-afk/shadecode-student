# Shadecode Student Codebase Audit Report

## Executive Summary

This audit provides a comprehensive inventory of the Shadecode Student codebase, identifying existing features, database structures, API endpoints, dashboard components, duplicate functionality, and missing integrations. The goal is to design a unified Student Intelligence Layer that becomes the single source of truth for student data.

---

## 1. Existing Feature Inventory

### Core Application Features (src/app)

#### Learning Features
- **Learn Module** (`src/app/(app)/learn/`)
  - Lesson viewing and completion
  - Quiz functionality
  - AI-powered content generation
  - Parser and providers for content
  - Lesson types and structures

- **Curriculum Module** (`src/app/(app)/curriculum/`)
  - Curriculum path visualization
  - Progress tracking
  - Prerequisite management
  - Lesson unlocking logic

- **Study Module** (`src/app/(app)/study/`)
  - Study plan generation
  - Focus mode
  - Revision queue

#### Assessment Features
- **Exam Simulation** (`src/app/(app)/exam-sim/`)
  - Exam taking interface
  - Timer functionality
  - Question management
  - Result calculation

- **Exams Module** (`src/app/(app)/exams/`)
  - Exam history
  - Performance tracking
  - Result sharing

- **Math Checker** (`src/app/(app)/math-checker/`)
  - Mathematical problem solving
  - Step-by-step solutions

#### Analytics & Intelligence
- **Dashboard** (`src/app/(app)/dashboard/`)
  - Main student dashboard
  - Progress overview
  - Activity tracking

- **Analytics** (`src/app/(app)/analytics/`)
  - Performance analytics
  - Weak area detection
  - Progress visualization

- **Insights** (`src/app/(app)/insights/`)
  - AI-powered insights
  - Cortex integration
  - Personalized recommendations

#### Career & Goals
- **Careers** (`src/app/(app)/careers/`)
  - Career exploration
  - Career following
  - Skill mapping

- **Tasks** (`src/app/(app)/tasks/`)
  - Task management
  - Task completion tracking
  - Task creation

- **Timetable** (`src/app/(app)/timetable/`)
  - Schedule management
  - Timetable generation
  - Time blocking

#### Social & Gamification
- **Leaderboard** (`src/app/(app)/leaderboard/`)
  - Student rankings
  - Competition features

- **Challenge** (`src/app/(app)/challenge/`)
  - Daily challenges
  - Challenge attempts
  - Streak tracking

#### Content Management
- **Catalog** (`src/app/(app)/catalog/`)
  - Course catalog
  - Enrollment management
  - Course discovery

- **Subjects** (`src/app/(app)/subjects/`)
  - Subject management
  - Subject selection

#### User Management
- **Settings** (`src/app/(app)/settings/`)
  - User preferences
  - Profile management
  - Configuration

- **Onboarding** (`src/app/onboarding/`)
  - User onboarding flow
  - Initial setup

#### Offline & PWA
- **Offline** (`src/app/offline/`)
  - Offline functionality
  - Service worker integration

- **PWA Features**
  - Install prompts
  - Offline shell
  - Background sync

#### Specialized Features
- **Feedback** (`src/app/(app)/feedback/`)
  - User feedback collection
  - Feedback email

- **Results** (`src/app/results/`)
  - Result display
  - Performance summary

- **Win** (`src/app/win/`)
  - Achievement celebration

### Library Features (src/lib)

#### AI & Intelligence
- **Cortex** (`src/lib/cortex/`)
  - AI-powered learning engine
  - Memory system
  - Event system
  - Insight generation
  - Recommendation engine
  - Teacher mode
  - Tutor mode
  - Challenge generator
  - Course generation
  - Plan generation

- **AI Integration** (`src/lib/ai/`)
  - Revision generation
  - AI-powered content

#### Analytics & Tracking
- **Analytics** (`src/lib/analytics/`)
  - Weak area detection
  - Performance tracking

- **Observability** (`src/lib/observability.ts`)
  - System monitoring
  - Error tracking

#### Curriculum & Learning
- **Curriculum** (`src/lib/curriculum/`)
  - Curriculum state computation
  - Prerequisite management
  - Progress tracking
  - ZIMSEC alignment
  - Cambridge alignment
  - Coverage analysis
  - Exam readiness scoring

- **Learning Path** (`src/lib/learning-path.ts`)
  - Learning path generation
  - Progress tracking

- **Study Plan** (`src/lib/studyPlan/`)
  - Study plan generation
  - Plan management

#### Exam & Assessment
- **Exams** (`src/lib/exams/`)
  - Indigenous language exams
  - Marking schemes
  - Exam generation

- **Indigenous Languages** (`src/lib/languages/`)
  - Shona language support
  - Ndebele language support
  - Grammar lessons
  - Comprehension exercises
  - Literature studies
  - Vocabulary building
  - Idioms and proverbs

#### Career & Skills
- **Careers** (`src/lib/careers/`)
  - Career management
  - State tracking
  - User career preferences

#### Offline & Bandwidth
- **Offline** (`src/lib/offline/`)
  - Offline storage
  - Download manager
  - IndexedDB integration

- **Bandwidth** (`src/lib/bandwidth/`)
  - Bandwidth detection
  - Low-bandwidth mode
  - Network optimization

#### API & Integration
- **API** (`src/lib/api/`)
  - Gemini integration
  - OpenAI integration
  - Lessons API
  - User API

- **Supabase** (`src/lib/supabase/`)
  - Database client
  - Server client
  - Type definitions

#### Utilities
- **Utils** (`src/lib/utils.ts`)
  - General utilities

- **Navigation** (`src/lib/navigation.ts`)
  - Navigation helpers

- **Session** (`src/lib/session.ts`)
  - Session management

- **User Profile** (`src/lib/user-profile.ts`)
  - Profile management

- **Localization** (`src/lib/localization/`)
  - Internationalization

- **Socratic** (`src/lib/socratic/`)
  - Socratic tutoring

#### Onboarding & Tours
- **Onboarding** (`src/lib/onboarding/`)
  - Onboarding logic
  - Recommendations

- **Tour Steps** (`src/lib/tour-steps.ts`)
  - Tour configuration

#### Challenge & Revision
- **Challenge** (`src/lib/challenge.ts`)
  - Challenge logic
  - Challenge management

- **Revision Queue** (`src/lib/revisionQueue.ts`)
  - Revision management
  - Queue processing

---

## 2. Existing Database Inventory

### Database Tables (from supabase/migrations)

#### Core Learning Tables
1. **learn_lessons** (`0003_create_learn_lessons_table.sql`)
   - Lesson content storage
   - Progress tracking
   - Subject association
   - Difficulty levels
   - Updated timestamps

2. **lesson_prerequisites** (`0004_create_lesson_prerequisites_table.sql`)
   - Prerequisite relationships
   - Lesson dependencies
   - Cycle detection constraints

#### Course Generation Tables
3. **generated_course_drafts** (`0010_create_generated_course_drafts_table.sql`)
   - AI-generated course drafts
   - Approval workflow

4. **generated_course_approvals** (`0011_create_generated_course_approvals_table.sql`)
   - Course approval tracking
   - Admin review process

#### Career & Skills Tables
5. **careers** (`0012_create_careers_table.sql`)
   - Career information
   - Career metadata

6. **skills** (`0013_create_skills_and_mappings.sql`)
   - Skill definitions
   - Career-skill mappings

7. **user_careers** (`0015_create_user_careers_table.sql`)
   - User career preferences
   - Career following

#### Cortex Intelligence Tables
8. **cortex_insights** (`0016_create_cortex_insights_table.sql`)
   - AI-generated insights
   - User intelligence data
   - Learning recommendations
   - Weak area identification

9. **cortex_memory** (`0018_create_cortex_memory_table.sql`)
   - User learning memory
   - Progress tracking
   - Weak topics
   - Strong subjects
   - Study patterns

#### Gamification Tables
10. **daily_challenges** (`0001_create_daily_challenges_table.sql`)
    - Daily challenge definitions
    - Challenge tracking

#### User Profile Tables
11. **user_profiles** (implied from migrations)
    - User profile data
    - Enrolled courses
    - Country/exam board
    - Study goals

---

## 3. Existing API Inventory

### API Routes (src/app/api)

#### Cortex Intelligence APIs
- **POST** `/api/cortex` - Main Cortex endpoint
- **POST** `/api/cortex/event` - Event emission
- **GET** `/api/cortex/insight` - Insight retrieval
- **GET** `/api/cortex/memory` - Memory retrieval
- **GET** `/api/cortex/state` - State retrieval

#### Learning APIs
- **POST** `/api/learn` - Learn content generation
- **POST** `/api/learn/quiz` - Quiz generation
- **GET** `/api/learn/parser` - Content parsing
- **GET** `/api/learn/prompts` - Prompt templates
- **GET** `/api/learn/providers` - Provider configurations

#### Curriculum APIs
- **GET** `/api/curriculum` - Curriculum state retrieval

#### Exam APIs
- **POST** `/api/exam` - Exam submission
- **GET** `/api/exam/results` - Result retrieval

#### Challenge APIs
- **POST** `/api/challenge` - Challenge creation
- **POST** `/api/challenge/attempt` - Challenge attempt
- **GET** `/api/challenges` - Challenge listing
- **POST** `/api/challenges/complete` - Challenge completion

#### Career APIs
- **GET** `/api/careers/following` - Following list
- **POST** `/api/careers/[slug]/follow` - Follow career
- **POST** `/api/careers/[slug]/state` - Career state update
- **POST** `/api/admin/careers` - Admin career management

#### Catalog APIs
- **POST** `/api/catalog/enroll` - Course enrollment

#### Task APIs
- **POST** `/api/tasks` - Task creation
- **GET** `/api/tasks` - Task listing

#### Feedback APIs
- **POST** `/api/feedback` - Feedback submission
- **POST** `/api/feedback-email` - Feedback email

#### Onboarding APIs
- **POST** `/api/onboarding/complete` - Onboarding completion
- **POST** `/api/onboarding/reset` - Onboarding reset

#### Result APIs
- **POST** `/api/results` - Result submission

#### User APIs
- **POST** `/api/user/complete-tour` - Tour completion

#### Achievement APIs
- **GET** `/api/achievements` - Achievement listing

#### Analytics APIs
- **GET** `/api/insights` - Analytics insights

#### Revision APIs
- **POST** `/api/generate-revision` - Revision generation

#### Math Checker APIs
- **POST** `/api/math-checker` - Math problem solving

---

## 4. Existing Dashboard Inventory

### Dashboard Components (src/components)

#### Core Dashboard Components
- **CurriculumProgressCard** - Curriculum progress visualization
- **LearningJourney** - Learning journey timeline
- **StudyPlanDisplay** - Study plan visualization
- **WeakAreasPanel** - Weak area identification
- **RevisionQueue** - Revision queue management

#### Learning Components
- **Learn** - Main learning interface
- **LessonCard** - Lesson card display
- **CourseCatalog** - Course catalog interface
- **CourseGenerator** - AI course generation
- **CurriculumPath** - Curriculum path visualization

#### Assessment Components
- **ExamShareCard** - Exam result sharing
- **DailyChallenge** - Daily challenge display
- **BadgeDisplay** - Achievement badge display

#### Intelligence Components
- **CortexMemoryInsights** - Cortex memory visualization
- **SocraticTutor** - Socratic tutoring interface

#### Study Components
- **StudyGoalInput** - Study goal input
- **Focus Mode** - Focus mode interface

#### Career Components
- **FollowCareerButton** - Career following button

#### Utility Components
- **ProgressBar** - Progress bar
- **SubjectDropdown** - Subject selection
- **LazyImage** - Lazy loading images
- **LowBandwidthToggle** - Bandwidth mode toggle

#### PWA Components
- **OfflineShell** - Offline interface
- **PWAInstallPrompt** - PWA installation prompt

#### Onboarding Components
- 15 onboarding components in `src/components/onboarding/`

#### Tour Components
- 3 tour components in `src/components/tour/`

#### Layout Components
- 2 layout components in `src/components/layout/`

#### UI Components
- 2 UI component directories in `src/components/ui/`

---

## 5. Duplicate Functionality Report

### Identified Duplications

#### 1. Progress Tracking
- **Location**: Multiple locations
  - `src/lib/curriculum/index.ts` - Curriculum progress
  - `src/lib/cortex/memory.ts` - Memory-based progress
  - `src/lib/learning-path.ts` - Learning path progress
  - Database tables: `learn_lessons.progress`, `cortex_memory`

- **Issue**: Progress is tracked in multiple systems without synchronization
- **Impact**: Inconsistent progress data across features
- **Recommendation**: Create unified progress tracking system

#### 2. Weak Area Detection
- **Location**: Multiple implementations
  - `src/lib/analytics/weakAreaDetector.ts` - Analytics weak area detection
  - `src/lib/cortex/memory.ts` - Cortex weak area tracking
  - `src/lib/curriculum/readiness.ts` - Curriculum readiness weak topics
  - `src/components/WeakAreasPanel.tsx` - UI component

- **Issue**: Weak areas detected and stored in multiple places
- **Impact**: Inconsistent weak area identification
- **Recommendation**: Consolidate weak area detection logic

#### 3. Recommendation Systems
- **Location**: Multiple recommendation engines
  - `src/lib/cortex/` - Cortex recommendations
  - `src/lib/onboardingRecommendations.ts` - Onboarding recommendations
  - `src/lib/curriculum/coverage.ts` - Curriculum recommendations
  - `src/lib/curriculum/readiness.ts` - Readiness recommendations

- **Issue**: Recommendations generated by different systems
- **Impact**: Inconsistent or conflicting recommendations
- **Recommendation**: Create unified recommendation engine

#### 4. Event Tracking
- **Location**: Multiple event systems
  - `src/lib/cortex/events/` - Cortex event system
  - `src/lib/observability.ts` - Observability tracking
  - Database: `cortex_insights` vs analytics

- **Issue**: Events tracked in multiple systems
- **Impact**: Incomplete event data, difficulty in comprehensive analysis
- **Recommendation**: Consolidate event tracking

#### 5. User State Management
- **Location**: Multiple state sources
  - `src/lib/user-profile.ts` - User profile
  - `src/lib/cortex/memory.ts` - Cortex memory
  - Database: `user_profiles`, `cortex_memory`
  - `src/contexts/` - React contexts

- **Issue**: User state scattered across multiple systems
- **Impact**: Inconsistent user data, synchronization issues
- **Recommendation**: Create unified user state management

#### 6. Study Plan Generation
- **Location**: Multiple generators
  - `src/lib/cortex/generatePlan.ts` - Cortex plan generation
  - `src/lib/studyPlan/` - Study plan module
  - `src/lib/learning-path.ts` - Learning path generation

- **Issue**: Study plans generated by different systems
- **Impact**: Inconsistent study plans
- **Recommendation**: Consolidate study plan generation

#### 7. AI Integration
- **Location**: Multiple AI providers
  - `src/lib/api/gemini.ts` - Gemini integration
  - `src/lib/api/openai.ts` - OpenAI integration
  - `src/lib/ai.ts` - General AI integration
  - `src/lib/cortex/` - Cortex AI integration

- **Issue**: AI integration scattered across multiple files
- **Impact**: Inconsistent AI usage, difficulty in management
- **Recommendation**: Consolidate AI integration layer

#### 8. Content Generation
- **Location**: Multiple generators
  - `src/lib/cortex/generateCourse.ts` - Course generation
  - `src/lib/ai/generateRevision.ts` - Revision generation
  - `src/lib/cortex/challenge-generator.js` - Challenge generation

- **Issue**: Content generation logic duplicated
- **Impact**: Inconsistent content quality
- **Recommendation**: Consolidate content generation

---

## 6. Missing Integration Report

### Identified Missing Integrations

#### 1. Cortex ↔ Curriculum Integration
- **Issue**: Cortex insights not integrated with curriculum progress
- **Impact**: Recommendations don't consider curriculum state
- **Recommendation**: Integrate Cortex insights with curriculum tracking

#### 2. Exam Results ↔ Weak Area Detection
- **Issue**: Exam results not automatically updating weak areas
- **Impact**: Weak areas not updated based on exam performance
- **Recommendation**: Auto-update weak areas from exam results

#### 3. Study Plan ↔ Progress Tracking
- **Issue**: Study plans not updated based on actual progress
- **Impact**: Study plans become outdated
- **Recommendation**: Dynamic study plan updates based on progress

#### 4. Career Goals ↔ Learning Content
- **Issue**: Career goals not influencing content recommendations
- **Impact**: Learning content not aligned with career goals
- **Recommendation**: Align content recommendations with career goals

#### 5. Challenges ↔ Progress
- **Issue**: Challenge completion not integrated with progress tracking
- **Impact**: Challenge progress not reflected in overall progress
- **Recommendation**: Integrate challenge completion with progress

#### 6. Offline ↔ Online Sync
- **Issue**: Offline progress not fully synced with online state
- **Impact**: Progress discrepancies between offline/online
- **Recommendation**: Robust offline/online synchronization

#### 7. Bandwidth Mode ↔ Content Delivery
- **Issue**: Bandwidth mode not fully integrated with all content delivery
- **Impact**: Inconsistent low-bandwidth experience
- **Recommendation**: Comprehensive bandwidth mode integration

#### 8. Indigenous Languages ↔ Main Curriculum
- **Issue**: Indigenous language learning not integrated with main curriculum
- **Impact**: Separate learning tracks
- **Recommendation**: Integrate indigenous languages into main curriculum

#### 9. Exam Readiness ↔ Study Recommendations
- **Issue**: Exam readiness scores not driving study recommendations
- **Impact**: Recommendations not exam-focused
- **Recommendation**: Use exam readiness to drive recommendations

#### 10. Timetable ↔ Study Plan
- **Issue**: Timetable not integrated with study plan
- **Impact**: Scheduling conflicts, inefficient time management
- **Recommendation**: Integrate timetable with study plan

---

## 7. Platform Architecture Document

### Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  (Next.js App Router + React Components)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
│  (Next.js API Routes)                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Business Logic Layer                        │
│  (src/lib - Various modules)                                │
│  - Cortex Intelligence                                      │
│  - Curriculum Management                                    │
│  - Exam System                                              │
│  - Career Management                                        │
│  - Study Planning                                           │
│  - AI Integration                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer                                 │
│  (Supabase Database + IndexedDB)                            │
│  - User Profiles                                            │
│  - Lessons & Curriculum                                     │
│  - Cortex Intelligence                                      │
│  - Careers & Skills                                         │
│  - Challenges & Achievements                                │
└─────────────────────────────────────────────────────────────┘
```

### Current System Connections

#### Data Flow Diagram
```
User Actions → Frontend Components → API Routes → Business Logic → Database
     ↓              ↓                  ↓            ↓            ↓
  Dashboard   →  Cortex API    →   Cortex    →  Cortex Memory
  Learn       →  Learn API     →   AI Engine →  Lessons
  Exams       →  Exam API      →   Marking   →  Exam Results
  Careers     →  Career API    →   Career    →  User Careers
  Tasks       →  Task API      →   Task Mgmt →  Tasks
```

### Identified Architecture Issues

1. **No Central State Management**: User state scattered across multiple systems
2. **Duplicate Business Logic**: Similar functionality in multiple modules
3. **Weak Integration**: Systems operate independently with minimal integration
4. **Data Inconsistency**: Same data stored in multiple places without sync
5. **No Single Source of Truth**: No unified student intelligence layer

---

## 8. Unified Student Intelligence Layer Design

### Design Principles

1. **Single Source of Truth**: All student data centralized
2. **Event-Driven Architecture**: Real-time updates via events
3. **Modular Design**: Clear separation of concerns
4. **Scalable**: Easy to add new features
5. **Backward Compatible**: Existing features continue to work

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Unified Student Intelligence Layer               │
│  (Single Source of Truth for All Student Data)              │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Progress    │    │  Performance │    │  Activity    │
│  Module      │    │  Module      │    │  Module      │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Curriculum  │    │  Exam        │    │  Study       │
│  Progress    │    │  Performance │    │  Activity    │
│  Tracking    │    │  Tracking    │    │  Tracking    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Intelligence Engine                              │
│  - Recommendations                                          │
│  - Weak Area Detection                                      │
│  - Goal Tracking                                            │
│  - Achievement Tracking                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Store                                      │
│  - Unified student data                                     │
│  - Event history                                            │
│  - Intelligence snapshots                                   │
└─────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

#### Progress Module
- Curriculum progress tracking
- Lesson completion
- Subject progress
- Overall completion percentage
- Prerequisite satisfaction

#### Performance Module
- Exam scores
- Quiz results
- Challenge performance
- Historical performance
- Performance trends

#### Activity Module
- Study sessions
- Time spent
- Activity patterns
- Streak tracking
- Engagement metrics

#### Intelligence Engine
- Generate recommendations
- Detect weak areas
- Track goals
- Track achievements
- Provide insights

### Data Model

```typescript
interface StudentIntelligence {
  userId: string;
  
  // Progress
  progress: {
    curriculum: CurriculumProgress;
    lessons: LessonProgress[];
    subjects: SubjectProgress[];
    overallCompletion: number;
  };
  
  // Performance
  performance: {
    exams: ExamPerformance[];
    quizzes: QuizPerformance[];
    challenges: ChallengePerformance[];
    trends: PerformanceTrends;
  };
  
  // Activity
  activity: {
    sessions: StudySession[];
    timeSpent: TimeSpentBySubject;
    patterns: ActivityPatterns;
    streak: StreakInfo;
  };
  
  // Intelligence
  intelligence: {
    recommendations: Recommendation[];
    weakAreas: WeakArea[];
    goals: Goal[];
    achievements: Achievement[];
    insights: Insight[];
  };
  
  // Metadata
  lastUpdated: string;
  version: number;
}
```

### Integration Strategy

#### Phase 1: Data Consolidation
1. Create unified data store
2. Migrate existing data
3. Establish data synchronization
4. Remove duplicate data sources

#### Phase 2: Module Integration
1. Integrate Cortex with unified layer
2. Integrate curriculum with unified layer
3. Integrate exams with unified layer
4. Integrate study activities with unified layer

#### Phase 3: Feature Migration
1. Migrate progress tracking
2. Migrate performance tracking
3. Migrate activity tracking
4. Migrate intelligence features

#### Phase 4: Cleanup
1. Remove duplicate code
2. Remove duplicate data stores
3. Update all consumers
4. Deprecate old APIs

---

## 9. Next Steps

1. **Create detailed implementation plan** for unified layer
2. **Design database schema** for unified data store
3. **Implement data migration scripts**
4. **Build unified intelligence layer**
5. **Integrate existing systems**
6. **Test thoroughly**
7. **Migrate all consumers**
8. **Remove duplicate code**
9. **Update documentation**
10. **Monitor and optimize**

---

## 10. Conclusion

The Shadecode Student codebase has a rich feature set but suffers from significant duplication and weak integration. The proposed Unified Student Intelligence Layer will:

- Eliminate data duplication
- Provide single source of truth
- Improve system integration
- Enable better recommendations
- Simplify maintenance
- Improve performance
- Enable new features

The implementation should be done incrementally to minimize disruption to existing functionality.
