/**
 * /lib/recommendation-engine/types.ts
 *
 * Recommendation Engine - Types
 */

/**
 * Input data for the Recommendation Engine
 */
export interface RecommendationEngineInput {
  userId: string;
  curriculumProgress: CurriculumProgressInput;
  weakAreas: WeakAreaInput[];
  examReadiness: ExamReadinessInput;
  studyActivity: StudyActivityInput;
  goals: GoalInput[];
  careerInterests: CareerInterestInput[];
}

export interface CurriculumProgressInput {
  overallCompletion: number;
  curriculum: {
    totalLessons: number;
    completedLessons: number;
    inProgressLessons: number;
    lockedLessons: number;
    completionPercentage: number;
    weightedCompletion: number;
    currentLesson: { id: string; title: string } | null;
    recommendedNextLesson: { id: string; title: string } | null;
  };
  lessons: LessonProgressInput[];
  subjects: SubjectProgressInput[];
}

export interface LessonProgressInput {
  lessonId: string;
  lessonTitle: string;
  subject: string;
  progress: number;
  completed: boolean;
  lastAttempted: string;
  timeSpent: number;
  attempts: number;
}

export interface SubjectProgressInput {
  subject: string;
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  weightedCompletion: number;
}

export interface WeakAreaInput {
  topicId: string;
  topic: string;
  subject: string;
  severity: "critical" | "high" | "medium" | "low";
  score: number;
  lastAssessed: string;
  recommendedActions: string[];
  estimatedTimeToImprove: number;
  /**
   * 0-100, from src/lib/cortex/retentionRisk.ts. Optional and additive --
   * existing callers that don't set it get identical behavior to before
   * this field existed. Represents Priority Engine Factor 4 ("Retention
   * Risk") from blueprints/MISSION CONTROL/Chapter 7.docx.
   */
  retentionRisk?: number;
  /** Human-readable explanation paired with retentionRisk, e.g. "Not reviewed in 12 days". */
  retentionReason?: string;
}

export interface ExamReadinessInput {
  subject: string;
  board: string;
  level: string;
  overallScore: number;
  readinessLevel: "Not Ready" | "Basic" | "Intermediate" | "Advanced" | "Exam Ready";
  predictedGrade: string;
  confidence: number;
  timeToExam: number; // days
  topicReadiness: Record<string, TopicReadinessInput>;
}

export interface TopicReadinessInput {
  topicId: string;
  score: number;
  readiness: "Not Ready" | "Basic" | "Intermediate" | "Advanced" | "Ready";
  confidence: number;
  recommendedActions: string[];
}

export interface StudyActivityInput {
  sessions: StudySessionInput[];
  timeSpent: Record<string, TimeSpentInput>;
  patterns: ActivityPatternsInput;
  streak: StreakInfoInput;
}

export interface StudySessionInput {
  sessionId: string;
  subject: string;
  lessonId?: string;
  startTime: string;
  endTime: string;
  duration: number;
  activities: ActivityInput[];
}

export interface ActivityInput {
  type: "lesson" | "quiz" | "exam" | "revision";
  itemId: string;
  startTime: string;
  endTime: string;
  duration: number;
}

export interface TimeSpentInput {
  totalMinutes: number;
  sessions: number;
  averageSessionLength: number;
}

export interface ActivityPatternsInput {
  mostActiveTime: string;
  mostActiveDay: string;
  averageDailyStudyTime: number;
  studyFrequency: number;
  consistencyScore: number;
}

export interface StreakInfoInput {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
}

export interface GoalInput {
  id: string;
  goal: string;
  priority: "high" | "medium" | "low";
  targetDate?: string;
  completed: boolean;
}

export interface CareerInterestInput {
  careerId: string;
  careerName: string;
  recommendedSubjects: string[];
  recommendedCourses: CourseRecommendationInput[];
}

export interface CourseRecommendationInput {
  subjectId: string;
  subjectName: string;
  note: string;
  enrolled: boolean;
  total: number;
  completed: number;
  completionPercent: number;
}

/**
 * Output from the Recommendation Engine
 */
export interface RecommendationEngineOutput {
  recommendedLesson: RecommendedLesson;
  recommendedRevisionTopic: RecommendedRevisionTopic;
  recommendedExamPractice: RecommendedExamPractice;
  recommendedStudyAction: RecommendedStudyAction;
  metadata: RecommendationMetadata;
}

export interface RecommendedLesson {
  lessonId: string;
  lessonTitle: string;
  subject: string;
  reason: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedTime: number;
  prerequisites: string[];
}

export interface RecommendedRevisionTopic {
  topicId: string;
  topic: string;
  subject: string;
  reason: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedTime: number;
  recommendedActions: string[];
}

export interface RecommendedExamPractice {
  examId?: string;
  subject: string;
  topic: string;
  reason: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedTime: number;
  practiceType: "past_papers" | "topic_specific" | "mixed" | "timed";
}

export interface RecommendedStudyAction {
  action: string;
  reason: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedTime: number;
  category: "lesson" | "revision" | "exam" | "practice" | "break" | "review";
}

export interface RecommendationMetadata {
  generatedAt: string;
  userId: string;
  confidence: number;
  factors: string[];
  cacheKey: string;
}

/**
 * Priority calculation types
 */
export interface PriorityScore {
  topicId: string;
  lessonId?: string;
  subject: string;
  score: number;
  factors: PriorityFactor[];
}

export interface PriorityFactor {
  factor: string;
  weight: number;
  value: number;
}

/**
 * Recommendation context
 */
export interface RecommendationContext {
  timeToExam: number;
  overallCompletion: number;
  currentStreak: number;
  consistencyScore: number;
  weakAreaCount: number;
  goalCount: number;
  careerInterestCount: number;
}
