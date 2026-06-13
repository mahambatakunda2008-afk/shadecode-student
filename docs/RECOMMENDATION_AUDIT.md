# Recommendation Systems Audit Report

## Executive Summary

This audit identifies all existing recommendation systems in the Shadecode Student codebase, analyzes duplicate logic, and provides a design for a consolidated Recommendation Engine.

## Existing Recommendation Systems

### 1. Curriculum Readiness System
**Location:** `src/lib/curriculum/readiness.ts`

**Functions:**
- `generateRecommendations()` - Generates recommendations based on:
  - Coverage percentage
  - Weak topics
  - Time to exam
  - Overall score
- `generateTopicRecommendedActions()` - Generates actions for individual topics based on readiness level

**Recommendation Types:**
- Coverage-based (focus on missing topics, balance new/revision, focus on revision)
- Weak topic-based (address weak topics urgently)
- Time-based (intensive revision, increase frequency, practice past papers)
- Score-based (focus on fundamentals, practice problems, work on exam technique)

### 2. Onboarding Recommendations System
**Location:** `src/lib/onboardingRecommendations.ts`

**Functions:**
- `generateOnboardingRecommendations()` - Generates recommendations based on:
  - User goals
  - Education level
  - Subject interests

**Recommendation Types:**
- Goal-to-subject mapping
- Goal-to-course mapping
- Starter lesson creation

**Mapping Tables:**
- `GOAL_TO_SUBJECT` - Maps goals to recommended subjects
- `GOAL_TO_COURSE_TITLE` - Maps goals to course titles

### 3. Curriculum Coverage System
**Location:** `src/lib/curriculum/coverage.ts`

**Functions:**
- `detectCurriculumGaps()` - Identifies gaps and provides recommended actions
- `getRecommendedStudyOrder()` - Provides study order recommendations
- `getTopicPriority()` - Calculates topic priority for study order

**Recommendation Types:**
- Gap-based (study topic, complete exercises, practice past questions)
- Priority-based (exam frequency, weight, difficulty, prerequisites)
- Study order (prerequisite-aware ordering)

### 4. Student Intelligence System
**Location:** `src/lib/student-intelligence/services/intelligence.ts`

**Functions:**
- `getRecommendations()` - Generates recommendations based on:
  - Progress (overall completion)
  - Performance (trends)
  - Activity (streak, consistency)
  - Cortex memory (weak topics)

**Recommendation Types:**
- Progress-based (focus on completing lessons)
- Weak area-based (review weak topics)
- Performance-based (improve declining trends)
- Activity-based (start/maintain streak, improve consistency)

### 5. Careers State System
**Location:** `src/lib/careers/state.ts`

**Functions:**
- `getCareerState()` - Provides career-based course recommendations

**Recommendation Types:**
- Career-to-subject mapping
- Career-to-course mapping
- Recommended next lesson within career subjects

### 6. Learning Path System
**Location:** `src/lib/learning-path.ts`

**Functions:**
- `initializeLearningPath()` - Generates learning path recommendations

**Recommendation Types:**
- Goal-to-focus-mode mapping
- Education-to-difficulty mapping
- Goal-to-subject boosts
- Daily goal minutes

**Mapping Tables:**
- `GOAL_TO_FOCUS_MODE` - Maps goals to focus modes
- `EDUCATION_TO_DIFFICULTY` - Maps education to difficulty
- `EDUCATION_TO_DAILY_MINUTES` - Maps education to daily study time
- `GOAL_SUBJECT_BOOSTS` - Maps goals to subject boosts

### 7. Cortex Generate Plan System
**Location:** `src/lib/cortex/generatePlan.ts`

**Functions:**
- `generateStudyPlan()` - Generates study plan tasks

**Recommendation Types:**
- Weak subject-based (revise core concepts, practice exam questions)
- Curriculum-based (continue recommended lesson, work on current lesson)
- Completion-based (progress through lessons, deep revision, mastery exercises)
- Prerequisite-based (complete prerequisite lessons)

## Duplicate Logic Identified

### 1. Weak Area Detection
**Locations:**
- Curriculum readiness: weak topics based on readiness level
- Curriculum coverage: weak topics based on score < 60
- Student intelligence: weak areas from Cortex memory
- Cortex generate plan: weakest subjects from snapshot

**Duplicate Logic:**
- Multiple systems detecting weak areas using different criteria
- No single source of truth for weak areas
- Inconsistent weak area identification

### 2. Lesson Recommendations
**Locations:**
- Curriculum index: recommendedNextLesson
- Careers state: recommendedNextLesson
- Cortex generate plan: recommended next lesson

**Duplicate Logic:**
- Multiple systems calculating recommended next lesson
- Different prioritization logic
- No unified lesson recommendation system

### 3. Subject Recommendations
**Locations:**
- Onboarding: goal-to-subject mapping
- Learning path: goal-based subject boosts
- Careers: career-recommended courses

**Duplicate Logic:**
- Multiple goal-to-subject mapping tables
- Different mapping logic in different systems
- No unified subject recommendation system

### 4. Time-Based Recommendations
**Locations:**
- Curriculum readiness: time to exam recommendations
- Learning path: daily goal minutes based on education
- Cortex generate plan: estimated minutes for tasks

**Duplicate Logic:**
- Multiple systems calculating time recommendations
- Different time estimation logic
- No unified time recommendation system

### 5. Priority Calculation
**Locations:**
- Curriculum coverage: getTopicPriority()
- Student intelligence: priority based on multiple factors
- Cortex generate plan: priority based on weak subjects

**Duplicate Logic:**
- Multiple priority calculation algorithms
- Different prioritization factors
- No unified priority system

## Consolidation Strategy

### Unified Recommendation Engine Design

**Inputs:**
- Curriculum progress (from Student Intelligence Layer)
- Weak areas (from Student Intelligence Layer)
- Exam readiness (from Curriculum readiness)
- Study activity (from Student Intelligence Layer)
- Goals (from user profile/onboarding)
- Career interests (from user profile/careers)

**Outputs:**
- Recommended lesson
- Recommended revision topic
- Recommended exam practice
- Recommended study action

**Architecture:**
```
RecommendationEngine
├── Input Aggregator
│   ├── Collect data from all sources
│   ├── Normalize data formats
│   └── Cache aggregated data
├── Priority Calculator
│   ├── Calculate topic priorities
│   ├── Calculate lesson priorities
│   └── Calculate action priorities
├── Recommendation Generator
│   ├── Generate lesson recommendations
│   ├── Generate revision recommendations
│   ├── Generate exam practice recommendations
│   └── Generate study action recommendations
└── Output Formatter
    ├── Format recommendations
    ├── Add metadata
    └── Return unified response
```

### Data Flow

```
Inputs → Input Aggregator → Priority Calculator → Recommendation Generator → Output Formatter → Recommendations
```

## Migration Plan

### Phase 1: Build Recommendation Engine
- Create RecommendationEngine class
- Implement input aggregation
- Implement priority calculation
- Implement recommendation generation
- Implement output formatting

### Phase 2: Update Existing Systems
- Update Curriculum readiness to use RecommendationEngine
- Update Onboarding to use RecommendationEngine
- Update Student Intelligence to use RecommendationEngine
- Update Careers to use RecommendationEngine
- Update Cortex to use RecommendationEngine

### Phase 3: Remove Duplicate Logic
- Remove duplicate weak area detection
- Remove duplicate lesson recommendation logic
- Remove duplicate subject recommendation logic
- Remove duplicate time-based recommendations
- Remove duplicate priority calculation

### Phase 4: Testing
- Test RecommendationEngine
- Test updated systems
- Test integration
- Performance testing

## Next Steps

1. Design RecommendationEngine architecture
2. Implement RecommendationEngine
3. Update existing systems
4. Remove duplicate logic
5. Test and commit
