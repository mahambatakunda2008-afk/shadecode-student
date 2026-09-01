import type { StudyLevel } from "@/types";

/** The three future product experiences. The current app remains a single codebase. */
export type ShadecodeExperience = "discovery" | "student" | "campus";

/** Shared education context consumed by Discovery, Student and Campus. */
export interface EducationContext {
  studyLevel: StudyLevel;
  experience: ShadecodeExperience;
  institutionId?: string;
  institutionName?: string;
  programmeId?: string;
  programmeName?: string;
  yearLevel?: string;
  semester?: string;
  curriculumId?: string;
  curriculumVersion?: string;
  subjectIds?: string[];
  courseIds?: string[];
}

/** Stable identity for a learning activity regardless of which experience renders it. */
export interface LearningActivityRef {
  activityId: string;
  kind: "lesson" | "question" | "quiz" | "exam" | "project" | "reading" | "practice" | "challenge";
  subjectId?: string;
  topicId?: string;
  curriculumId?: string;
}

/** A learner attempt is evidence. It is not itself the canonical learning event. */
export interface LearningAttemptRef {
  attemptId: string;
  activityId: string;
  startedAt?: string;
  completedAt?: string;
  score?: number;
  correct?: boolean;
  responseSeconds?: number;
  confidence?: number;
}

/** Minimal shared state needed by specialized experiences. */
export interface LearnerPlatformState {
  userId: string;
  education: EducationContext;
  activeActivityId?: string;
  recentActivityIds?: string[];
  lastAttempt?: LearningAttemptRef;
}
