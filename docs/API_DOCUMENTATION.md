# Unified Student Intelligence Layer API Documentation

## Overview

The Unified Student Intelligence Layer (USIL) provides a comprehensive API for accessing student intelligence data including curriculum progress, exam performance, study activity, and AI-powered recommendations.

## Base URL

```
/api/student-intelligence
```

## Authentication

All API endpoints require authentication. The user ID is extracted from the session or provided as a parameter.

## Direct Function Calls

For internal use, you can call the services directly:

```typescript
import { getStudentIntelligence, invalidateAllCaches } from '@/lib/student-intelligence';
import { progressService } from '@/lib/student-intelligence';
import { performanceService } from '@/lib/student-intelligence';
import { activityService } from '@/lib/student-intelligence';
import { intelligenceEngine } from '@/lib/student-intelligence';

// Get complete student intelligence
const intelligence = await getStudentIntelligence(userId);

// Invalidate all caches
await invalidateAllCaches(userId);

// Get specific service data
const progress = await progressService.getProgress(userId);
const performance = await performanceService.getPerformance(userId);
const activity = await activityService.getActivity(userId);
const intelligence = await intelligenceEngine.getIntelligence(userId);
```

## API Endpoints

### GET /api/student-intelligence/:userId

Get complete student intelligence for a user.

**Parameters:**
- `userId` (path parameter): User ID

**Response:**
```typescript
{
  success: boolean;
  data?: StudentIntelligence;
  error?: string;
  timestamp: string;
}
```

**Example:**
```bash
GET /api/student-intelligence/user-123
```

**Response Body:**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "progress": {
      "curriculum": {
        "totalLessons": 50,
        "completedLessons": 25,
        "inProgressLessons": 10,
        "lockedLessons": 15,
        "completionPercentage": 50,
        "weightedCompletion": 52,
        "currentLesson": "lesson-1",
        "recommendedNextLesson": "lesson-2"
      },
      "lessons": [...],
      "subjects": [...],
      "overallCompletion": 50,
      "lastUpdated": "2024-01-01T00:00:00Z"
    },
    "performance": {
      "exams": [...],
      "quizzes": [...],
      "challenges": [...],
      "trends": {
        "overallTrend": "improving",
        "subjectTrends": {},
        "averageScore": 75,
        "recentAverage": 80,
        "improvementRate": 5
      },
      "lastUpdated": "2024-01-01T00:00:00Z"
    },
    "activity": {
      "sessions": [...],
      "timeSpent": {},
      "patterns": {
        "mostActiveTime": "14:00",
        "mostActiveDay": "Monday",
        "averageDailyStudyTime": 60,
        "studyFrequency": 1.5,
        "consistencyScore": 75
      },
      "streak": {
        "currentStreak": 7,
        "longestStreak": 14,
        "lastStudyDate": "2024-01-01T00:00:00Z"
      },
      "lastUpdated": "2024-01-01T00:00:00Z"
    },
    "intelligence": {
      "recommendations": [...],
      "weakAreas": [...],
      "goals": [...],
      "achievements": [...],
      "insights": [...],
      "lastUpdated": "2024-01-01T00:00:00Z"
    },
    "version": 1,
    "lastUpdated": "2024-01-01T00:00:00Z",
    "cacheKey": "usil:user-123:1704067200000"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### GET /api/student-intelligence/:userId/progress

Get progress data for a user.

**Parameters:**
- `userId` (path parameter): User ID

**Response:**
```typescript
{
  success: boolean;
  data?: StudentProgress;
  cached: boolean;
  timestamp: string;
}
```

**Example:**
```bash
GET /api/student-intelligence/user-123/progress
```

### GET /api/student-intelligence/:userId/performance

Get performance data for a user.

**Parameters:**
- `userId` (path parameter): User ID

**Response:**
```typescript
{
  success: boolean;
  data?: StudentPerformance;
  cached: boolean;
  timestamp: string;
}
```

**Example:**
```bash
GET /api/student-intelligence/user-123/performance
```

### GET /api/student-intelligence/:userId/activity

Get activity data for a user.

**Parameters:**
- `userId` (path parameter): User ID

**Response:**
```typescript
{
  success: boolean;
  data?: StudentActivity;
  cached: boolean;
  timestamp: string;
}
```

**Example:**
```bash
GET /api/student-intelligence/user-123/activity
```

### GET /api/student-intelligence/:userId/intelligence

Get intelligence data for a user.

**Parameters:**
- `userId` (path parameter): User ID

**Response:**
```typescript
{
  success: boolean;
  data?: StudentIntelligenceData;
  cached: boolean;
  timestamp: string;
}
```

**Example:**
```bash
GET /api/student-intelligence/user-123/intelligence
```

### GET /api/student-intelligence/:userId/recommendations

Get recommendations for a user.

**Parameters:**
- `userId` (path parameter): User ID

**Response:**
```typescript
{
  success: boolean;
  data?: Recommendation[];
  cached: boolean;
  timestamp: string;
}
```

**Example:**
```bash
GET /api/student-intelligence/user-123/recommendations
```

**Response Body:**
```json
{
  "success": true,
  "data": [
    {
      "id": "rec-1",
      "type": "lesson",
      "priority": "high",
      "title": "Focus on completing lessons",
      "description": "Your overall completion is below 50%. Focus on completing more lessons to improve your progress.",
      "action": "Continue with current lesson",
      "estimatedTime": 30,
      "reason": "Low overall completion rate",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "cached": false,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### GET /api/student-intelligence/:userId/weak-areas

Get weak areas for a user.

**Parameters:**
- `userId` (path parameter): User ID

**Response:**
```typescript
{
  success: boolean;
  data?: WeakArea[];
  cached: boolean;
  timestamp: string;
}
```

**Example:**
```bash
GET /api/student-intelligence/user-123/weak-areas
```

### GET /api/student-intelligence/:userId/goals

Get goals for a user.

**Parameters:**
- `userId` (path parameter): User ID

**Response:**
```typescript
{
  success: boolean;
  data?: Goal[];
  cached: boolean;
  timestamp: string;
}
```

**Example:**
```bash
GET /api/student-intelligence/user-123/goals
```

### GET /api/student-intelligence/:userId/achievements

Get achievements for a user.

**Parameters:**
- `userId` (path parameter): User ID

**Response:**
```typescript
{
  success: boolean;
  data?: Achievement[];
  cached: boolean;
  timestamp: string;
}
```

**Example:**
```bash
GET /api/student-intelligence/user-123/achievements
```

### GET /api/student-intelligence/:userId/insights

Get insights for a user.

**Parameters:**
- `userId` (path parameter): User ID

**Response:**
```typescript
{
  success: boolean;
  data?: Insight[];
  cached: boolean;
  timestamp: string;
}
```

**Example:**
```bash
GET /api/student-intelligence/user-123/insights
```

### POST /api/student-intelligence/:userId/invalidate-cache

Invalidate all caches for a user.

**Parameters:**
- `userId` (path parameter): User ID

**Response:**
```typescript
{
  success: boolean;
  timestamp: string;
}
```

**Example:**
```bash
POST /api/student-intelligence/user-123/invalidate-cache
```

### POST /api/student-intelligence/:userId/record-session

Record a study session for a user.

**Parameters:**
- `userId` (path parameter): User ID
- Body: StudySession object

**Request Body:**
```typescript
{
  sessionId: string;
  subject: string;
  lessonId?: string;
  startTime: string;
  endTime: string;
  duration: number;
  activities: Activity[];
}
```

**Response:**
```typescript
{
  success: boolean;
  timestamp: string;
}
```

**Example:**
```bash
POST /api/student-intelligence/user-123/record-session
Content-Type: application/json

{
  "sessionId": "session-1",
  "subject": "Mathematics",
  "lessonId": "lesson-1",
  "startTime": "2024-01-01T10:00:00Z",
  "endTime": "2024-01-01T11:00:00Z",
  "duration": 60,
  "activities": [
    {
      "type": "lesson",
      "itemId": "lesson-1",
      "startTime": "2024-01-01T10:00:00Z",
      "endTime": "2024-01-01T11:00:00Z",
      "duration": 60
    }
  ]
}
```

### POST /api/student-intelligence/:userId/add-exam-result

Add an exam result for a user.

**Parameters:**
- `userId` (path parameter): User ID
- Body: ExamPerformance object

**Request Body:**
```typescript
{
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
```

**Response:**
```typescript
{
  success: boolean;
  timestamp: string;
}
```

**Example:**
```bash
POST /api/student-intelligence/user-123/add-exam-result
Content-Type: application/json

{
  "examId": "exam-1",
  "subject": "Mathematics",
  "score": 75,
  "totalMarks": 100,
  "percentage": 75,
  "grade": "B",
  "date": "2024-01-01T00:00:00Z",
  "weakAreas": ["Algebra", "Geometry"],
  "strongAreas": ["Statistics", "Probability"]
}
```

## Data Types

### StudentIntelligence

```typescript
interface StudentIntelligence {
  userId: string;
  progress: StudentProgress;
  performance: StudentPerformance;
  activity: StudentActivity;
  intelligence: StudentIntelligenceData;
  version: number;
  lastUpdated: string;
  cacheKey: string;
}
```

### StudentProgress

```typescript
interface StudentProgress {
  curriculum: CurriculumProgress;
  lessons: LessonProgress[];
  subjects: SubjectProgress[];
  overallCompletion: number;
  lastUpdated: string;
}
```

### StudentPerformance

```typescript
interface StudentPerformance {
  exams: ExamPerformance[];
  quizzes: QuizPerformance[];
  challenges: ChallengePerformance[];
  trends: PerformanceTrends;
  lastUpdated: string;
}
```

### StudentActivity

```typescript
interface StudentActivity {
  sessions: StudySession[];
  timeSpent: TimeSpentBySubject;
  patterns: ActivityPatterns;
  streak: StreakInfo;
  lastUpdated: string;
}
```

### StudentIntelligenceData

```typescript
interface StudentIntelligenceData {
  recommendations: Recommendation[];
  weakAreas: WeakArea[];
  goals: Goal[];
  achievements: Achievement[];
  insights: Insight[];
  lastUpdated: string;
}
```

## Caching

All endpoints use intelligent caching to improve performance:

- **Progress**: 5 minutes TTL
- **Performance**: 10 minutes TTL
- **Activity**: 5 minutes TTL
- **Intelligence**: 15 minutes TTL
- **Full intelligence**: 10 minutes TTL

You can manually invalidate caches using the `/invalidate-cache` endpoint.

## Error Handling

All endpoints return a consistent error response:

```typescript
{
  success: false;
  error: string;
  timestamp: string;
}
```

Common error codes:
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not found
- `500`: Internal server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- 100 requests per minute per user
- 1000 requests per hour per user

## Usage Examples

### React Component

```typescript
import { useEffect, useState } from 'react';
import { getStudentIntelligence } from '@/lib/student-intelligence';

export default function StudentDashboard({ userId }: { userId: string }) {
  const [intelligence, setIntelligence] = useState<StudentIntelligence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadIntelligence() {
      const data = await getStudentIntelligence(userId);
      setIntelligence(data);
      setLoading(false);
    }
    loadIntelligence();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!intelligence) return <div>Error loading data</div>;

  return (
    <div>
      <h1>Student Intelligence</h1>
      <div>Overall Completion: {intelligence.progress.overallCompletion}%</div>
      <div>Current Streak: {intelligence.activity.streak.currentStreak} days</div>
      <div>Performance Trend: {intelligence.performance.trends.overallTrend}</div>
    </div>
  );
}
```

### Server-Side Usage

```typescript
import { getStudentIntelligence } from '@/lib/student-intelligence';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return Response.json({ error: 'User ID required' }, { status: 400 });
  }

  const intelligence = await getStudentIntelligence(userId);

  if (!intelligence) {
    return Response.json({ error: 'Failed to load intelligence' }, { status: 500 });
  }

  return Response.json({ success: true, data: intelligence });
}
```

## Migration Guide

### Migrating from Direct Cortex Calls

**Before:**
```typescript
import { getMemory } from '@/lib/cortex/memory';

const memory = await getMemory(userId);
const weakTopics = memory.weakTopics;
```

**After:**
```typescript
import { intelligenceEngine } from '@/lib/student-intelligence';

const intelligence = await intelligenceEngine.getIntelligence(userId);
const weakAreas = intelligence.data.weakAreas;
```

### Migrating from Direct Curriculum Calls

**Before:**
```typescript
import { getCurriculumState } from '@/lib/curriculum';

const state = await getCurriculumState(userId);
const completion = state.completionPercent;
```

**After:**
```typescript
import { progressService } from '@/lib/student-intelligence';

const progress = await progressService.getProgress(userId);
const completion = progress.data.overallCompletion;
```

## Support

For questions or issues related to the USIL API, contact:
- Development Team: dev@shadecode.com
- Documentation: docs/AUDIT_REPORT.md
- Architecture: docs/STUDENT_INTELLIGENCE_LAYER_ARCHITECTURE.md
- Migration Plan: docs/MIGRATION_PLAN.md
