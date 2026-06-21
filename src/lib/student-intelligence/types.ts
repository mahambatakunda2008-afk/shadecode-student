/**
 * /lib/student-intelligence/types.ts
 *
 * Unified Student Intelligence Layer - Core Data Types
 */

/* ─────────────────────────────────────────────
   CORE STUDENT INTELLIGENCE
───────────────────────────────────────────── */

export interface StudentIntelligence {
  userId: string;
  
  // Progress
  progress: StudentProgress;
  
  // Performance
  performance: StudentPerformance;
  
  // Activity
  activity: StudentActivity;
  
  // Intelligence
  intelligence: StudentIntelligenceData;
  
  // Metadata
  version: number;
  lastUpdated: string;
  cacheKey: string;
}

/* ─────────────────────────────────────────────
   PROGRESS TYPES
───────────────────────────────────────────── */

export interface StudentProgress {
  curriculum: CurriculumProgress;
  lessons: LessonProgress[];
  subjects: SubjectProgress[];
  overallCompletion: number;
  lastUpdated: string;
}

export interface CurriculumProgress {
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  lockedLessons: number;
  completionPercentage: number;
  weightedCompletion: number;
  currentLesson: string | null;
  recommendedNextLesson: string | null;
}

export interface LessonProgress {
  lessonId: string;
  lessonTitle: string;
  subject: string;
  progress: number;
  completed: boolean;
  lastAttempted: string;
  timeSpent: number;
  attempts: number;
}

export interface SubjectProgress {
  subject: string;
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  averageScore: number;
  timeSpent: number;
}

/* ─────────────────────────────────────────────
   PERFORMANCE TYPES
───────────────────────────────────────────── */

export interface StudentPerformance {
  exams: ExamPerformance[];
  quizzes: QuizPerformance[];
  challenges: ChallengePerformance[];
  trends: PerformanceTrends;
  lastUpdated: string;
}

export interface ExamPerformance {
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

export interface QuizPerformance {
  quizId: string;
  lessonId: string;
  subject: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  date: string;
}

export interface ChallengePerformance {
  challengeId: string;
  completed: boolean;
  score: number;
  date: string;
  streak: number;
}

export interface PerformanceTrends {
  overallTrend: "improving" | "stable" | "declining";
  subjectTrends: Record<string, "improving" | "stable" | "declining">;
  averageScore: number;
  recentAverage: number;
  improvementRate: number;
}

/* ─────────────────────────────────────────────
   ACTIVITY TYPES
───────────────────────────────────────────── */

export interface StudentActivity {
  sessions: StudySession[];
  timeSpent: TimeSpentBySubject;
  patterns: ActivityPatterns;
  streak: StreakInfo;
  lastUpdated: string;
}

export interface StudySession {
  sessionId: string;
  subject: string;
  lessonId?: string;
  startTime: string;
  endTime: string;
  duration: number;
  activities: Activity[];
}

export interface Activity {
  type: "lesson" | "quiz" | "exam" | "challenge" | "revision";
  itemId: string;
  startTime: string;
  endTime: string;
  duration: number;
}

export interface TimeSpentBySubject {
  [subject: string]: {
    totalMinutes: number;
    sessions: number;
    averageSessionLength: number;
  };
}

export interface ActivityPatterns {
  mostActiveTime: string;
  mostActiveDay: string;
  averageDailyStudyTime: number;
  studyFrequency: number;
  consistencyScore: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
}

/* ─────────────────────────────────────────────
   INTELLIGENCE TYPES
───────────────────────────────────────────── */

export interface StudentIntelligenceData {
  recommendations: Recommendation[];
  weakAreas: WeakArea[];
  goals: Goal[];
  achievements: Achievement[];
  insights: Insight[];
  lastUpdated: string;
}

export interface Recommendation {
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

export interface WeakArea {
  topicId: string;
  topic: string;
  subject: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  lastAssessed: string;
  recommendedActions: string[];
  estimatedTimeToImprove: number;
}

export interface Goal {
  goalId: string;
  type: "grade" | "completion" | "time" | "streak";
  target: number;
  current: number;
  deadline: string;
  status: "not-started" | "in-progress" | "completed" | "missed";
  createdAt: string;
}

export interface Achievement {
  achievementId: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface Insight {
  insightId: string;
  type: "behavior" | "learning" | "performance" | "recommendation";
  title: string;
  content: string;
  actionable: boolean;
  createdAt: string;
}

/* ─────────────────────────────────────────────
   ADAPTER INTERFACE
───────────────────────────────────────────── */

export interface SystemAdapter {
  name: string;
  initialize(): Promise<void>;
  getProgress(userId: string): Promise<Partial<StudentProgress>>;
  getPerformance(userId: string): Promise<Partial<StudentPerformance>>;
  getActivity(userId: string): Promise<Partial<StudentActivity>>;
  getIntelligence(userId: string): Promise<Partial<StudentIntelligenceData>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEvent(event: any): Promise<void>;
}

/* ─────────────────────────────────────────────
   CACHE TYPES
───────────────────────────────────────────── */

export interface CacheEntry<T = unknown> {
  data: T;
  createdAt: string;
  expiresAt: string;
  version: number;
}

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  version: number;
}

/* ─────────────────────────────────────────────
   EVENT TYPES
───────────────────────────────────────────── */

export type StudentIntelligenceEvent =
  | "progress.updated"
  | "performance.updated"
  | "activity.updated"
  | "intelligence.updated"
  | "cache.invalidated"
  | "adapter.synced";

export interface StudentIntelligenceEventData {
  userId: string;
  type: StudentIntelligenceEvent;
  timestamp: string;
  data?: Record<string, unknown>;
}

/* ─────────────────────────────────────────────
   SERVICE RESPONSE TYPES
───────────────────────────────────────────── */

export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  cached: boolean;
  timestamp: string;
}

/* ─────────────────────────────────────────────
   MIGRATION TYPES
───────────────────────────────────────────── */

export interface MigrationState {
  phase: "foundation" | "implementation" | "migration" | "cleanup" | "complete";
  currentStep: string;
  completedSteps: string[];
  startedAt: string;
  estimatedCompletion: string;
}

export interface MigrationProgress {
  userId: string;
  state: MigrationState;
  dataMigrated: {
    progress: boolean;
    performance: boolean;
    activity: boolean;
    intelligence: boolean;
  };
  adaptersMigrated: string[];
  lastUpdated: string;
}
