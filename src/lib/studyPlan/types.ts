/**
 * /lib/studyPlan/types.ts
 *
 * Study Planning System Types
 *
 * Data structures for AI-assisted study planning
 */

export interface StudyGoals {
  targetGrade: "A*" | "A" | "B" | "C" | "D" | "E" | "U";
  examDate: string; // ISO date string
  availableHoursPerWeek: number;
  subjects: string[];
  prioritySubjects?: string[]; // Subjects that need more focus
}

export interface StudySession {
  id: string;
  date: string; // ISO date string
  subject: string;
  topic: string;
  durationMinutes: number;
  type: "learn" | "practice" | "revision" | "exam" | "catchup";
  completed: boolean;
  actualDurationMinutes?: number; // If different from planned
  notes?: string;
}

export interface WeeklySchedule {
  weekNumber: number;
  startDate: string;
  endDate: string;
  sessions: StudySession[];
  totalPlannedMinutes: number;
  totalCompletedMinutes: number;
  progress: number; // 0-100
}

export interface RevisionBlock {
  id: string;
  subject: string;
  topics: string[];
  scheduledDate: string;
  durationMinutes: number;
  priority: "high" | "medium" | "low";
  reason: string; // Why this revision is needed
}

export interface CatchUpRecommendation {
  id: string;
  subject: string;
  topic: string;
  missedSessions: number;
  recommendedAction: string;
  suggestedDate: string;
  estimatedDurationMinutes: number;
}

export interface StudyPlan {
  id: string;
  userId: string;
  goals: StudyGoals;
  startDate: string;
  endDate: string;
  weeklySchedules: WeeklySchedule[];
  revisionBlocks: RevisionBlock[];
  catchUpRecommendations: CatchUpRecommendation[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface PlanAdjustment {
  type: "add_session" | "remove_session" | "modify_duration" | "reschedule" | "add_revision";
  reason: string;
  originalSession?: StudySession;
  adjustedSession?: StudySession;
  priority: "urgent" | "important" | "optional";
}

export interface StudyProgress {
  totalSessionsPlanned: number;
  totalSessionsCompleted: number;
  totalPlannedMinutes: number;
  totalCompletedMinutes: number;
  averageSessionDuration: number;
  streakDays: number;
  onTrack: boolean;
  projectedGrade?: string;
}
