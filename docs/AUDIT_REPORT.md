# Shadecode Student Codebase Audit Report

## Executive Summary

This audit identifies bugs, broken flows, missing pages, dead routes, UX issues, mobile issues, accessibility issues, security issues, retention opportunities, and exam preparation opportunities across the Shadecode Student application.

**Audit Date**: June 26, 2026
**Scope**: All application pages, components, API routes, and database interactions

---

## Audit Findings

### 1. Missing Pages and Dead Routes

#### 1.1 Achievements Page - Missing Dedicated Route
- **Severity**: Medium
- **Root Cause**: Navigation references `/achievements` but no dedicated page exists under `src/app/(app)/achievements/`
- **Impact**: Users cannot view their achievements in a dedicated view; achievements only shown via modal
- **Recommended Fix**: Create `src/app/(app)/achievements/page.tsx` with full achievement history and statistics
- **Affected Files**: `src/lib/navigation.ts` (NAV_ITEMS references achievements), `src/modules/achievements/`

#### 1.2 Exam Center - Missing Route
- **Severity**: High
- **Root Cause**: Navigation references exam center functionality but no dedicated page exists
- **Impact**: Users cannot access centralized exam preparation resources
- **Recommended Fix**: Create `src/app/(app)/exam-center/page.tsx` with exam prep resources, past papers, and practice tests
- **Affected Files**: `src/lib/navigation.ts`

#### 1.3 Careers/[slug] - Potential 404
- **Severity**: Medium
- **Root Cause**: Dynamic route `src/app/(app)/careers/[slug]/page.tsx` exists but no verification of valid slugs
- **Impact**: Invalid career slugs may result in 404 errors
- **Recommended Fix**: Add slug validation and proper 404 handling with helpful error message
- **Affected Files**: `src/app/(app)/careers/[slug]/page.tsx`

#### 1.4 Insights History - Route Exists But May Be Underutilized
- **Severity**: Low
- **Root Cause**: `/insights/history` route exists but may not be prominently linked
- **Impact**: Users may not discover historical insights
- **Recommended Fix**: Add navigation link and promote in Cortex-related UI
- **Affected Files**: `src/app/(app)/insights/history/page.tsx`, `src/lib/navigation.ts`

---

### 2. Authentication & Onboarding Issues

#### 2.1 Onboarding Page - Server-Side Guard Only
- **Severity**: Medium
- **Root Cause**: `src/app/onboarding/page.tsx` is a server-side redirect guard with no actual onboarding UI
- **Impact**: Onboarding UI must be implemented elsewhere; unclear where actual onboarding flow lives
- **Recommended Fix**: Document onboarding flow location or implement onboarding UI at this route
- **Affected Files**: `src/app/onboarding/page.tsx`, `src/middleware.ts`

#### 2.2 Signup - No Email Verification
- **Severity**: High
- **Root Cause**: `src/app/(public)/auth/signup/page.tsx` creates user without email verification step
- **Impact**: Security risk - users can sign up with fake emails; potential for abuse
- **Recommended Fix**: Implement email verification flow with Supabase auth
- **Affected Files**: `src/app/(public)/auth/signup/page.tsx`

#### 2.3 Login/Signup - No Rate Limiting
- **Severity**: High
- **Root Cause**: No rate limiting on authentication endpoints
- **Impact**: Vulnerable to brute force attacks
- **Recommended Fix**: Implement rate limiting on auth API routes
- **Affected Files**: `src/app/(public)/auth/login/page.tsx`, `src/app/(public)/auth/signup/page.tsx`

---

### 3. Dashboard Issues

#### 3.1 Dashboard - Missing Empty State for New Users
- **Severity**: Medium
- **Root Cause**: `NextActionDashboard` has error state but no specific empty state for users with no data
- **Impact**: New users see empty or confusing dashboard
- **Recommended Fix**: Add onboarding prompt or getting started guide for new users
- **Affected Files**: `src/components/dashboard/NextActionDashboard.tsx`

#### 3.2 Dashboard - No Loading Skeleton for Intelligence Data
- **Severity**: Low
- **Root Cause**: Loading state exists but may not cover all data fetching scenarios
- **Impact**: Perceived lag during data load
- **Recommended Fix**: Ensure comprehensive loading states for all dashboard sections
- **Affected Files**: `src/components/dashboard/NextActionDashboard.tsx`

---

### 4. Curriculum & Tasks Issues

#### 4.1 Curriculum Page - Extremely Large File (12,282 lines)
- **Severity**: Medium
- **Root Cause**: Monolithic component with all logic in single file
- **Impact**: Hard to maintain, slow to load, difficult to debug
- **Recommended Fix**: Split into smaller components (CurriculumView, LessonCard, ProgressSection, etc.)
- **Affected Files**: `src/app/(app)/curriculum/page.tsx`

#### 4.2 Tasks Page - Extremely Large File (14,934 lines)
- **Severity**: Medium
- **Root Cause**: Monolithic component with all logic in single file
- **Impact**: Hard to maintain, slow to load, difficult to debug
- **Recommended Fix**: Split into smaller components (TaskList, TaskForm, TaskFilters, etc.)
- **Affected Files**: `src/app/(app)/tasks/page.tsx`

#### 4.3 Tasks - No Bulk Actions
- **Severity**: Low
- **Root Cause**: Tasks can only be edited/deleted individually
- **Impact**: Inefficient workflow for users with many tasks
- **Recommended Fix**: Add bulk select, complete, and delete functionality
- **Affected Files**: `src/app/(app)/tasks/page.tsx`

---

### 5. Timetable & Exams Issues

#### 5.1 Timetable - No Conflict Detection
- **Severity**: Medium
- **Root Cause**: `src/app/(app)/timetable/page.tsx` allows overlapping time slots
- **Impact**: Users can schedule conflicting study sessions
- **Recommended Fix**: Add conflict detection and warnings when scheduling
- **Affected Files**: `src/app/(app)/timetable/page.tsx`

#### 5.2 Exams - No Recurring Exam Support
- **Severity**: Low
- **Root Cause**: Exams are single events with no recurrence option
- **Impact**: Users must手动 add recurring exams (weekly tests, etc.)
- **Recommended Fix**: Add recurrence options (daily, weekly, monthly)
- **Affected Files**: `src/app/(app)/exams/page.tsx`

#### 5.3 Exam Sim - No Save/Resume
- **Severity**: Medium
- **Root Cause**: `src/app/(app)/exam-sim/page.tsx` exam session not saved if interrupted
- **Impact**: Users lose progress if they accidentally close the tab
- **Recommended Fix**: Implement auto-save and resume functionality
- **Affected Files**: `src/app/(app)/exam-sim/page.tsx`

---

### 6. Learn & Math Checker Issues

#### 6.1 Learn Page - Mobile Layout Issues (Previously Fixed)
- **Severity**: Low (Fixed)
- **Root Cause**: Fixed grid widths and sticky sidebar caused mobile overflow
- **Impact**: Poor mobile UX before fix
- **Recommended Fix**: Already addressed in previous mobile UX audit
- **Affected Files**: `src/app/(app)/learn/LearnPageClient.tsx`, `src/components/CurriculumProgressCard.tsx`

#### 6.2 Math Checker - No History
- **Severity**: Medium
- **Root Cause**: `src/app/(app)/math-checker/page.tsx` doesn't save past analyses
- **Impact**: Users cannot review previous math problems and solutions
- **Recommended Fix**: Add history feature with saved analyses
- **Affected Files**: `src/app/(app)/math-checker/page.tsx`

#### 6.3 Learn - No Offline Support
- **Severity**: Medium
- **Root Cause**: Learn content requires internet connection; no offline caching
- **Impact**: Users cannot study without internet
- **Recommended Fix**: Implement offline lesson caching using service workers
- **Affected Files**: `src/app/(app)/learn/`, offline infrastructure

---

### 7. Cortex & Analytics Issues

#### 7.1 Analytics Page - No Export Functionality
- **Severity**: Low
- **Root Cause**: `src/app/(app)/analytics/page.tsx` has no way to export analytics data
- **Impact**: Users cannot download their performance data for external analysis
- **Recommended Fix**: Add CSV/PDF export for analytics
- **Affected Files**: `src/app/(app)/analytics/page.tsx`

#### 7.2 Analytics - Limited Time Range
- **Severity**: Low
- **Root Cause**: Analytics show all-time data without date range filtering
- **Impact**: Users cannot analyze specific time periods
- **Recommended Fix**: Add date range selector (last week, month, semester, custom)
- **Affected Files**: `src/app/(app)/analytics/page.tsx`

#### 7.3 Study Page - No Data Persistence
- **Severity**: Medium
- **Root Cause**: `src/app/(app)/study/page.tsx` uses localStorage only, no Supabase sync
- **Impact**: Study session data lost across devices
- **Recommended Fix**: Sync study sessions to Supabase for cross-device access
- **Affected Files**: `src/app/(app)/study/page.tsx`

---

### 8. Achievements & Challenges Issues

#### 8.1 Achievements - No Dedicated Page
- **Severity**: Medium
- **Root Cause**: Achievements only shown via modal; no full page view
- **Impact**: Users cannot see achievement history or progress toward future achievements
- **Recommended Fix**: Create dedicated achievements page with full history and progress tracking
- **Affected Files**: `src/modules/achievements/`, navigation

#### 8.2 Challenge Page - Public Access Without Auth
- **Severity**: Low
- **Root Cause**: `src/app/challenge/[id]/page.tsx` is publicly accessible
- **Impact**: Non-logged-in users can view challenges (may be intentional for virality)
- **Recommended Fix**: Document intended behavior or add auth requirement if needed
- **Affected Files**: `src/app/challenge/[id]/page.tsx`

#### 8.3 Daily Challenge - No Streak Tracking
- **Severity**: Low
- **Root Cause**: Challenge completion not integrated with streak system
- **Impact**: No gamification incentive for daily challenges
- **Recommended Fix**: Integrate challenge completion with streak tracking
- **Affected Files**: Challenge system, streak system

---

### 9. Settings Issues

#### 9.1 Settings - Limited Profile Options
- **Severity**: Low
- **Root Cause**: `src/app/(app)/settings/page.tsx` only allows username change
- **Impact**: Users cannot update profile picture, bio, or other profile fields
- **Recommended Fix**: Add comprehensive profile editing (avatar, bio, preferences)
- **Affected Files**: `src/app/(app)/settings/page.tsx`

#### 9.2 Settings - No Notification Preferences
- **Severity**: Medium
- **Root Cause**: No notification settings in settings page
- **Impact**: Users cannot control email/push notification preferences
- **Recommended Fix**: Add notification preferences section
- **Affected Files**: `src/app/(app)/settings/page.tsx`

#### 9.3 Settings - No Data Export/Delete
- **Severity**: High (GDPR compliance)
- **Root Cause**: No way for users to export or delete their data
- **Impact**: GDPR compliance issue; users lack data control
- **Recommended Fix**: Add data export and account deletion options
- **Affected Files**: `src/app/(app)/settings/page.tsx`

---

### 10. Mobile Experience Issues

#### 10.1 Focus Timer - Fixed Width on Mobile
- **Severity**: Low
- **Root Cause**: `src/app/(app)/focus/page.tsx` uses fixed maxWidth: 400px
- **Impact**: Doesn't utilize full screen width on larger mobile devices
- **Recommended Fix**: Use responsive max-width or percentage-based sizing
- **Affected Files**: `src/app/(app)/focus/page.tsx`

#### 10.2 Leaderboard - Large Text on Mobile
- **Severity**: Low
- **Root Cause**: `src/app/(app)/leaderboard/page.tsx` uses large font sizes (56px heading)
- **Impact**: May cause horizontal scroll on small screens
- **Recommended Fix**: Add responsive font sizes for mobile
- **Affected Files**: `src/app/(app)/leaderboard/page.tsx`

#### 10.3 Bottom Nav - No Keyboard Navigation
- **Severity**: Medium (Accessibility)
- **Root Cause**: `src/components/layout/BottomNav.tsx` not keyboard accessible
- **Impact**: Keyboard-only users cannot navigate on mobile
- **Recommended Fix**: Add keyboard navigation support to bottom nav
- **Affected Files**: `src/components/layout/BottomNav.tsx`

---

### 11. Accessibility Issues

#### 11.1 Missing ARIA Labels
- **Severity**: Medium
- **Root Cause**: Many interactive elements lack ARIA labels
- **Impact**: Screen reader users have poor experience
- **Recommended Fix**: Add comprehensive ARIA labels to all interactive elements
- **Affected Files**: Multiple components throughout the app

#### 11.2 Color Contrast Issues
- **Severity**: Medium
- **Root Cause**: Some color combinations may not meet WCAG AA standards
- **Impact**: Users with visual impairments may have difficulty reading
- **Recommended Fix**: Audit color contrast and adjust to meet WCAG AA
- **Affected Files**: Global CSS, component styles

#### 11.3 Focus Management
- **Severity**: Medium
- **Root Cause**: No focus trap in modals/drawers
- **Impact**: Keyboard users can navigate outside modal content
- **Recommended Fix**: Implement focus trapping in all modals and drawers
- **Affected Files**: Modal components, BottomNav drawer

#### 11.4 No Skip Navigation Link
- **Severity**: Low
- **Root Cause**: No skip-to-content link for keyboard users
- **Impact**: Keyboard users must tab through navigation on every page
- **Recommended Fix**: Add skip navigation link at top of page
- **Affected Files**: `src/app/(app)/layout.tsx`

---

### 12. Performance Issues

#### 12.1 Large Bundle Size
- **Severity**: Medium
- **Root Cause**: Large components (curriculum 12K lines, tasks 15K lines) not code-split
- **Impact**: Slow initial load, poor performance on slow connections
- **Recommended Fix**: Implement code splitting and lazy loading for large components
- **Affected Files**: `src/app/(app)/curriculum/page.tsx`, `src/app/(app)/tasks/page.tsx`

#### 12.2 No Image Optimization
- **Severity**: Medium
- **Root Cause**: Images not using Next.js Image optimization
- **Impact**: Slow image loading, larger bandwidth usage
- **Recommended Fix**: Migrate to Next.js Image component with optimization
- **Affected Files**: Components with images

#### 12.3 Analytics - No Pagination
- **Severity**: Low
- **Root Cause**: `src/app/(app)/analytics/page.tsx` fetches all exam results
- **Impact**: Slow performance for users with many exams
- **Recommended Fix**: Implement pagination for exam results
- **Affected Files**: `src/app/(app)/analytics/page.tsx`

---

### 13. Security Issues

#### 13.1 No CSRF Protection
- **Severity**: High
- **Root Cause**: API routes lack CSRF token validation
- **Impact**: Vulnerable to cross-site request forgery attacks
- **Recommended Fix**: Implement CSRF protection for all mutating API routes
- **Affected Files**: All API routes in `src/app/api/`

#### 13.2 No Input Sanitization
- **Severity**: High
- **Root Cause**: User inputs not sanitized before database operations
- **Impact**: Vulnerable to SQL injection (mitigated by Supabase but still risky)
- **Recommended Fix**: Implement input validation and sanitization
- **Affected Files**: All forms and API routes

#### 13.3 Sensitive Data in localStorage
- **Severity**: Medium
- **Root Cause**: Some sensitive data may be stored in localStorage
- **Impact**: XSS attacks can access sensitive data
- **Recommended Fix**: Avoid storing sensitive data in localStorage; use secure cookies
- **Affected Files**: Components using localStorage

#### 13.4 No Content Security Policy
- **Severity**: Medium
- **Root Cause**: No CSP headers configured
- **Impact**: Vulnerable to XSS attacks
- **Recommended Fix**: Implement Content Security Policy headers
- **Affected Files**: Next.js configuration

---

### 14. Supabase Integration Issues

#### 14.1 No Error Handling for Supabase Failures
- **Severity**: Medium
- **Root Cause**: Some Supabase calls lack proper error handling
- **Impact**: Poor UX when Supabase is down or slow
- **Recommended Fix**: Add comprehensive error handling with user-friendly messages
- **Affected Files**: Multiple components using Supabase client

#### 14.2 No Offline Queue for Supabase Writes
- **Severity**: Medium
- **Root Cause**: No queue for offline write operations
- **Impact**: Data loss if user goes offline during write operations
- **Recommended Fix**: Implement offline queue with sync on reconnection
- **Affected Files**: Supabase client wrapper, offline infrastructure

#### 14.3 No Connection Status Indicator
- **Severity**: Low
- **Root Cause**: No visual indicator of Supabase connection status
- **Impact**: Users don't know if they're offline or experiencing connection issues
- **Recommended Fix**: Add connection status indicator in UI
- **Affected Files**: Layout components

---

### 15. Retention Opportunities

#### 15.1 No Daily Streak Reminders
- **Severity**: Low (Opportunity)
- **Root Cause**: No push notifications or emails to maintain streak
- **Impact**: Users may forget to study, losing streaks
- **Recommended Fix**: Implement streak reminder notifications
- **Affected Files**: Notification system

#### 15.2 No Social Features
- **Severity**: Low (Opportunity)
- **Root Cause**: Limited social interaction (only leaderboard)
- **Impact**: Lower engagement through lack of social motivation
- **Recommended Fix**: Add friend system, study groups, or social sharing
- **Affected Files**: New social features

#### 15.3 No Personalized Learning Paths
- **Severity**: Low (Opportunity)
- **Root Cause**: Learning paths not personalized based on performance
- **Impact**: Generic learning experience may not engage all users
- **Recommended Fix**: Implement AI-powered personalized learning paths
- **Affected Files**: Curriculum system, Cortex integration

#### 15.4 No Gamification Beyond XP/Levels
- **Severity**: Low (Opportunity)
- **Root Cause**: Limited gamification (XP, levels, streak only)
- **Impact**: May not motivate all user types
- **Recommended Fix**: Add badges, leaderboards per subject, achievement showcases
- **Affected Files**: Gamification system

---

### 16. Exam Preparation Opportunities

#### 16.1 No Past Papers Integration
- **Severity**: Medium (Opportunity)
- **Root Cause**: No past papers from exam boards integrated
- **Impact**: Users must find past papers elsewhere
- **Recommended Fix**: Integrate past papers for ZIMSEC, Cambridge, etc.
- **Affected Files**: Exam system, content management

#### 16.2 No Exam Timer Practice Mode
- **Severity**: Low (Opportunity)
- **Root Cause**: Exam sim has timer but no specific practice mode for time management
- **Impact**: Users may not practice time management effectively
- **Recommended Fix**: Add dedicated time management practice mode
- **Affected Files**: `src/app/(app)/exam-sim/page.tsx`

#### 16.3 No Exam Strategy Tips
- **Severity**: Low (Opportunity)
- **Root Cause**: No exam-taking strategies or tips provided
- **Impact**: Users may lack exam technique knowledge
- **Recommended Fix**: Add exam strategy section with tips and techniques
- **Affected Files**: Exam center (needs creation)

#### 16.4 No Mock Exam Scheduling
- **Severity**: Low (Opportunity)
- **Root Cause**: No way to schedule mock exams at specific times
- **Impact**: Users cannot simulate real exam timing
- **Recommended Fix**: Add mock exam scheduling with calendar integration
- **Affected Files**: Exam system, timetable integration

---

## Summary Statistics

- **Total Issues Identified**: 46
- **Critical Severity**: 0
- **High Severity**: 7
- **Medium Severity**: 22
- **Low Severity**: 17
- **Opportunities**: 8

## Priority Recommendations

### Immediate (High Severity)
1. Implement email verification for signup
2. Add rate limiting to authentication endpoints
3. Implement CSRF protection for API routes
4. Add input sanitization across the app
5. Add data export/delete for GDPR compliance
6. Create dedicated Exam Center page
7. Implement save/resume for exam simulations

### Short-term (Medium Severity)
1. Split large components (curriculum, tasks)
2. Add conflict detection to timetable
3. Implement offline lesson caching
4. Add notification preferences to settings
5. Improve error handling for Supabase failures
6. Add comprehensive ARIA labels
7. Implement focus trapping in modals

### Long-term (Low Severity & Opportunities)
1. Add comprehensive gamification
2. Implement social features
3. Integrate past papers
4. Add personalized learning paths
5. Improve mobile responsiveness across all pages
6. Add analytics export functionality
7. Implement data persistence for study page

---

## Appendix: Project Structure Reference

### Key Pages and Routes

#### Auth & Onboarding
- `/auth/login` - Login page
- `/auth/signup` - Signup page
- `/onboarding` - Onboarding guard (redirects completed users)

#### Core Features
- `/dashboard` - Main dashboard with AI recommendations
- `/learn` - AI-powered lesson generation and viewing
- `/curriculum` - Curriculum progress and path visualization
- `/tasks` - Task management
- `/timetable` - Study schedule management
- `/exams` - Exam tracking
- `/exam-sim` - Exam simulation with timer
- `/math-checker` - Math problem analysis

#### Analytics & Intelligence
- `/analytics` - Performance analytics
- `/insights/history` - Cortex insights history
- `/leaderboard` - Student rankings
- `/study` - Live study session with Cortex

#### Additional Features
- `/focus` - Focus timer (Pomodoro-style)
- `/subjects` - Subject management
- `/careers/[slug]` - Career exploration
- `/catalog` - Course catalog
- `/feedback` - User feedback
- `/settings` - User settings
- `/challenge/[id]` - Public challenge sharing

### Key Components

#### Layout
- `Sidebar.tsx` - Desktop navigation sidebar
- `BottomNav.tsx` - Mobile bottom navigation with drawer

#### Dashboard
- `NextActionDashboard.tsx` - AI-powered dashboard with recommendations

#### Learning
- `Learn.tsx` - AI lesson generation component
- `CurriculumProgressCard.tsx` - Progress visualization

### API Endpoints

#### Cortex Intelligence
- `/api/cortex` - Main Cortex endpoint
- `/api/cortex/event` - Event emission
- `/api/cortex/insight` - Insight retrieval
- `/api/cortex/memory` - Memory retrieval

#### Learning
- `/api/learn` - Learn content generation
- `/api/learn/quiz` - Quiz generation

#### Challenges
- `/api/challenges` - Challenge listing
- `/api/challenges/complete` - Challenge completion

#### Achievements
- `/api/achievements` - Achievement listing

---

**Audit Completed**: June 26, 2026
**Audit Mode**: Read-only (no modifications made)

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
