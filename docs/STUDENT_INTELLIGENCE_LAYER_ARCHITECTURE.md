# Unified Student Intelligence Layer Architecture

## Overview

The Unified Student Intelligence Layer (USIL) is a central aggregation service that becomes the single source of truth for all student-related data. It consolidates data from multiple existing systems and provides a unified API for accessing student intelligence.

## Design Principles

1. **Non-Breaking**: Existing APIs continue to work without modification
2. **Gradual Migration**: Systems can migrate incrementally
3. **Adapter Pattern**: Build adapters for existing systems rather than rewriting
4. **Single Source of Truth**: All student data aggregated in one place
5. **Backward Compatible**: Existing functionality preserved
6. **Event-Driven**: Real-time updates via event system
7. **Cache-First**: Optimized performance with intelligent caching

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Existing Systems                         │
│  (Cortex, Curriculum, Exams, Study, Careers, etc.)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Adapter Layer                             │
│  (Adapters for each existing system)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Unified Student Intelligence Layer              │
│  (Single Source of Truth)                                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Progress    │    │  Performance │    │  Activity    │
│  Service     │    │  Service     │    │  Service     │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Intelligence Engine                             │
│  (Recommendations, Weak Areas, Achievements, Goals)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Unified API Layer                               │
│  (REST API + GraphQL + Direct Function Calls)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Consumers                                      │
│  (Frontend, Mobile, External Systems)                       │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

```
src/lib/student-intelligence/
├── types.ts                    # Core data types and interfaces
├── index.ts                    # Main entry point
├── services/
│   ├── progress.ts             # Progress aggregation service
│   ├── performance.ts          # Performance aggregation service
│   ├── activity.ts             # Activity aggregation service
│   └── intelligence.ts         # Intelligence engine
├── adapters/
│   ├── cortex.adapter.ts       # Cortex system adapter
│   ├── curriculum.adapter.ts   # Curriculum system adapter
│   ├── exams.adapter.ts        # Exams system adapter
│   ├── study.adapter.ts        # Study system adapter
│   └── careers.adapter.ts      # Careers system adapter
├── cache/
│   ├── cache.ts                # Cache implementation
│   └── invalidation.ts         # Cache invalidation logic
├── events/
│   ├── emitter.ts              # Event emission
│   └── listener.ts             # Event listening
└── api/
    ├── routes.ts               # API route definitions
    └── handlers.ts             # API request handlers
```

## Data Model

### Core Types

```typescript
interface StudentIntelligence {
  userId: string;
  
  // Progress
  progress: {
    curriculum: CurriculumProgress;
    lessons: LessonProgress[];
    subjects: SubjectProgress[];
    overallCompletion: number;
    lastUpdated: string;
  };
  
  // Performance
  performance: {
    exams: ExamPerformance[];
    quizzes: QuizPerformance[];
    challenges: ChallengePerformance[];
    trends: PerformanceTrends;
    lastUpdated: string;
  };
  
  // Activity
  activity: {
    sessions: StudySession[];
    timeSpent: TimeSpentBySubject;
    patterns: ActivityPatterns;
    streak: StreakInfo;
    lastUpdated: string;
  };
  
  // Intelligence
  intelligence: {
    recommendations: Recommendation[];
    weakAreas: WeakArea[];
    goals: Goal[];
    achievements: Achievement[];
    insights: Insight[];
    lastUpdated: string;
  };
  
  // Metadata
  version: number;
  lastUpdated: string;
  cacheKey: string;
}
```

### Progress Types

```typescript
interface CurriculumProgress {
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  lockedLessons: number;
  completionPercentage: number;
  weightedCompletion: number;
  currentLesson: string | null;
  recommendedNextLesson: string | null;
}

interface LessonProgress {
  lessonId: string;
  lessonTitle: string;
  subject: string;
  progress: number;
  completed: boolean;
  lastAttempted: string;
  timeSpent: number;
  attempts: number;
}

interface SubjectProgress {
  subject: string;
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  averageScore: number;
  timeSpent: number;
}
```

### Performance Types

```typescript
interface ExamPerformance {
  examId: string;
  subject: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  date: string;
  weakAreas: string[];
  strongAreas: string[];
}

interface QuizPerformance {
  quizId: string;
  lessonId: string;
  subject: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  date: string;
}

interface ChallengePerformance {
  challengeId: string;
  completed: boolean;
  score: number;
  date: string;
  streak: number;
}

interface PerformanceTrends {
  overallTrend: "improving" | "stable" | "declining";
  subjectTrends: Record<string, "improving" | "stable" | "declining">;
  averageScore: number;
  recentAverage: number;
  improvementRate: number;
}
```

### Activity Types

```typescript
interface StudySession {
  sessionId: string;
  subject: string;
  lessonId?: string;
  startTime: string;
  endTime: string;
  duration: number;
  activities: Activity[];
}

interface Activity {
  type: "lesson" | "quiz" | "exam" | "challenge" | "revision";
  itemId: string;
  startTime: string;
  endTime: string;
  duration: number;
}

interface TimeSpentBySubject {
  [subject: string]: {
    totalMinutes: number;
    sessions: number;
    averageSessionLength: number;
  };
}

interface ActivityPatterns {
  mostActiveTime: string;
  mostActiveDay: string;
  averageDailyStudyTime: number;
  studyFrequency: number;
  consistencyScore: number;
}

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
}
```

### Intelligence Types

```typescript
interface Recommendation {
  id: string;
  type: "lesson" | "revision" | "practice" | "break" | "goal";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action: string;
  estimatedTime: number;
  reason: string;
  createdAt: string;
}

interface WeakArea {
  topicId: string;
  topic: string;
  subject: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  lastAssessed: string;
  recommendedActions: string[];
  estimatedTimeToImprove: number;
}

interface Goal {
  goalId: string;
  type: "grade" | "completion" | "time" | "streak";
  target: number;
  current: number;
  deadline: string;
  status: "not-started" | "in-progress" | "completed" | "missed";
  createdAt: string;
}

interface Achievement {
  achievementId: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface Insight {
  insightId: string;
  type: "behavior" | "learning" | "performance" | "recommendation";
  title: string;
  content: string;
  actionable: boolean;
  createdAt: string;
}
```

## Service Architecture

### Progress Service

**Responsibilities:**
- Aggregate curriculum progress from multiple sources
- Calculate overall completion percentages
- Track lesson and subject progress
- Provide progress recommendations
- Cache progress data for performance

**Data Sources:**
- `src/lib/curriculum/index.ts` - Curriculum state
- `learn_lessons` table - Lesson progress
- `cortex_memory` table - Memory-based progress
- `lesson_prerequisites` table - Prerequisites

**API:**
```typescript
class ProgressService {
  getProgress(userId: string): Promise<StudentIntelligence['progress']>;
  getCurriculumProgress(userId: string): Promise<CurriculumProgress>;
  getLessonProgress(userId: string, lessonId?: string): Promise<LessonProgress[]>;
  getSubjectProgress(userId: string, subject?: string): Promise<SubjectProgress[]>;
  updateProgress(userId: string, progress: Partial<LessonProgress>): Promise<void>;
  invalidateCache(userId: string): Promise<void>;
}
```

### Performance Service

**Responsibilities:**
- Aggregate exam, quiz, and challenge performance
- Calculate performance trends
- Identify weak and strong areas
- Provide performance insights
- Cache performance data

**Data Sources:**
- Exam results from exam system
- Quiz results from learn system
- Challenge data from challenge system
- `cortex_insights` table - Performance insights

**API:**
```typescript
class PerformanceService {
  getPerformance(userId: string): Promise<StudentIntelligence['performance']>;
  getExamPerformance(userId: string): Promise<ExamPerformance[]>;
  getQuizPerformance(userId: string): Promise<QuizPerformance[]>;
  getChallengePerformance(userId: string): Promise<ChallengePerformance[]>;
  getPerformanceTrends(userId: string): Promise<PerformanceTrends>;
  addExamResult(userId: string, result: ExamPerformance): Promise<void>;
  invalidateCache(userId: string): Promise<void>;
}
```

### Activity Service

**Responsibilities:**
- Aggregate study session data
- Calculate time spent by subject
- Identify activity patterns
- Track streak information
- Provide activity insights

**Data Sources:**
- Study session tracking
- Time tracking from learn system
- Activity logs from various systems
- Streak data from challenge system

**API:**
```typescript
class ActivityService {
  getActivity(userId: string): Promise<StudentIntelligence['activity']>;
  getStudySessions(userId: string, limit?: number): Promise<StudySession[]>;
  getTimeSpent(userId: string): Promise<TimeSpentBySubject>;
  getActivityPatterns(userId: string): Promise<ActivityPatterns>;
  getStreakInfo(userId: string): Promise<StreakInfo>;
  recordSession(userId: string, session: StudySession): Promise<void>;
  invalidateCache(userId: string): Promise<void>;
}
```

### Intelligence Engine

**Responsibilities:**
- Generate recommendations based on all data
- Detect weak areas using multiple sources
- Track goals and achievements
- Provide actionable insights
- Coordinate with Cortex for AI-powered insights

**Data Sources:**
- All three services (Progress, Performance, Activity)
- Cortex intelligence system
- Career goals
- User preferences

**API:**
```typescript
class IntelligenceEngine {
  getIntelligence(userId: string): Promise<StudentIntelligence['intelligence']>;
  getRecommendations(userId: string): Promise<Recommendation[]>;
  getWeakAreas(userId: string): Promise<WeakArea[]>;
  getGoals(userId: string): Promise<Goal[]>;
  getAchievements(userId: string): Promise<Achievement[]>;
  getInsights(userId: string): Promise<Insight[]>;
  generateRecommendations(userId: string): Promise<Recommendation[]>;
  detectWeakAreas(userId: string): Promise<WeakArea[]>;
  invalidateCache(userId: string): Promise<void>;
}
```

## Adapter Pattern

### Adapter Interface

```typescript
interface SystemAdapter {
  name: string;
  initialize(): Promise<void>;
  getProgress(userId: string): Promise<any>;
  getPerformance(userId: string): Promise<any>;
  getActivity(userId: string): Promise<any>;
  getIntelligence(userId: string): Promise<any>;
  onEvent(event: any): Promise<void>;
}
```

### Cortex Adapter

```typescript
class CortexAdapter implements SystemAdapter {
  name = "cortex";
  
  async initialize(): Promise<void> {
    // Initialize Cortex connection
  }
  
  async getProgress(userId: string): Promise<any> {
    // Get progress from Cortex memory
    const memory = await getMemory(userId);
    return {
      weakTopics: memory.weakTopics,
      strongSubjects: memory.subjects,
      // ... other progress data
    };
  }
  
  async getPerformance(userId: string): Promise<any> {
    // Get performance from Cortex insights
    const insights = await getCortexInsights(userId);
    return {
      recentExamScore: insights.lastExamScore,
      weakAreas: insights.lastExamWeakAreas,
      // ... other performance data
    };
  }
  
  async getActivity(userId: string): Promise<any> {
    // Get activity from Cortex events
    const events = await getCortexEvents(userId);
    return {
      recentActivity: events,
      // ... other activity data
    };
  }
  
  async getIntelligence(userId: string): Promise<any> {
    // Get intelligence from Cortex
    const insights = await getCortexInsights(userId);
    return {
      recommendations: insights.recommendations,
      // ... other intelligence data
    };
  }
  
  async onEvent(event: any): Promise<void> {
    // Forward events to Cortex
    await emitCortexEvent(event);
  }
}
```

## Caching Strategy

### Cache Keys

```typescript
function getCacheKey(userId: string, module: string): string {
  return `usil:${userId}:${module}`;
}

function getFullCacheKey(userId: string): string {
  return `usil:${userId}:full`;
}
```

### Cache TTL

- Progress: 5 minutes
- Performance: 10 minutes
- Activity: 5 minutes
- Intelligence: 15 minutes
- Full intelligence: 10 minutes

### Cache Invalidation

- Manual invalidation via API
- Event-driven invalidation
- TTL-based invalidation
- Version-based invalidation

## API Layer

### REST API Endpoints

```
GET  /api/student-intelligence/:userId
GET  /api/student-intelligence/:userId/progress
GET  /api/student-intelligence/:userId/performance
GET  /api/student-intelligence/:userId/activity
GET  /api/student-intelligence/:userId/intelligence
GET  /api/student-intelligence/:userId/recommendations
GET  /api/student-intelligence/:userId/weak-areas
GET  /api/student-intelligence/:userId/goals
GET  /api/student-intelligence/:userId/achievements
GET  /api/student-intelligence/:userId/insights
POST /api/student-intelligence/:userId/invalidate-cache
POST /api/student-intelligence/:userId/record-session
POST /api/student-intelligence/:userId/add-exam-result
```

### Direct Function Calls

```typescript
import { getStudentIntelligence } from '@/lib/student-intelligence';

const intelligence = await getStudentIntelligence(userId);
```

## Migration Plan

### Phase 1: Foundation (Week 1-2)
- Create core data types and interfaces
- Implement basic service structure
- Set up caching layer
- Create adapter interfaces
- Implement Cortex adapter

### Phase 2: Service Implementation (Week 3-4)
- Implement Progress service
- Implement Performance service
- Implement Activity service
- Implement Intelligence Engine
- Create API endpoints
- Write integration tests

### Phase 3: Adapter Implementation (Week 5-6)
- Implement Curriculum adapter
- Implement Exams adapter
- Implement Study adapter
- Implement Careers adapter
- Test all adapters

### Phase 4: Gradual Migration (Week 7-8)
- Migrate Dashboard to use USIL
- Migrate Analytics to use USIL
- Migrate Insights to use USIL
- Migrate Study Plan to use USIL
- Monitor performance

### Phase 5: Cleanup (Week 9-10)
- Remove duplicate code
- Deprecate old APIs
- Update documentation
- Optimize performance
- Final testing

## Backward Compatibility

### Existing APIs Continue to Work

All existing APIs will continue to function without modification. The USIL will:

1. **Read from existing systems**: Initially, USIL will read data from existing systems
2. **Gradual migration**: Systems can migrate to read from USIL incrementally
3. **Adapter pattern**: Adapters ensure compatibility with existing systems
4. **No breaking changes**: Existing functionality is preserved

### Migration Path

1. **Phase 1**: USIL reads from existing systems (read-only)
2. **Phase 2**: Systems start reading from USIL (dual-read)
3. **Phase 3**: Systems write to USIL (write-through)
4. **Phase 4**: Systems migrate to USIL-only (migration complete)

## Integration Tests

### Test Coverage

- Service unit tests
- Adapter integration tests
- API endpoint tests
- Cache invalidation tests
- Performance tests
- Migration tests

### Test Scenarios

1. **Progress Service Tests**
   - Test curriculum progress calculation
   - Test lesson progress aggregation
   - Test subject progress calculation
   - Test cache invalidation

2. **Performance Service Tests**
   - Test exam performance aggregation
   - Test performance trend calculation
   - Test weak area detection
   - Test cache invalidation

3. **Activity Service Tests**
   - Test study session recording
   - Test time spent calculation
   - Test activity pattern detection
   - Test streak tracking

4. **Intelligence Engine Tests**
   - Test recommendation generation
   - Test weak area detection
   - Test goal tracking
   - Test achievement tracking

5. **Adapter Tests**
   - Test Cortex adapter
   - Test Curriculum adapter
   - Test Exams adapter
   - Test Study adapter

6. **API Tests**
   - Test all API endpoints
   - Test error handling
   - Test authentication
   - Test rate limiting

## Performance Considerations

### Optimization Strategies

1. **Caching**: Multi-level caching (memory, Redis, database)
2. **Lazy Loading**: Load data only when needed
3. **Batch Processing**: Process multiple requests together
4. **Incremental Updates**: Update only changed data
5. **Background Jobs**: Heavy processing in background
6. **Database Indexing**: Proper indexes for fast queries

### Monitoring

- API response times
- Cache hit rates
- Error rates
- Data freshness
- System health

## Security Considerations

1. **Authentication**: All API endpoints require authentication
2. **Authorization**: Users can only access their own data
3. **Data Privacy**: Sensitive data encrypted
4. **Rate Limiting**: Prevent abuse
5. **Audit Logging**: Track all data access

## Next Steps

1. Implement core data types and interfaces
2. Implement Progress service
3. Implement Performance service
4. Implement Activity service
5. Implement Intelligence Engine
6. Create adapters for existing systems
7. Implement API endpoints
8. Write integration tests
9. Create migration scripts
10. Document usage and API
