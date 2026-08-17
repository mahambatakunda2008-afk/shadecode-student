import { getMemory, updateMemory } from "./memory";
import { scoreAnswer, type ScoreAnswerInput } from "./tools/scoring";
import { generateTutoringResponse } from "./tools/tutor";
import { getCurriculumState } from "@/lib/curriculum";
import {
  trackStudySession,
  trackExamResult,
  updateStreak,
  generateRecommendation,
} from "./memoryTracker";

export type CortexInput = {
  userId: string;
  type: "learn" | "practice" | "exam" | "feedback";
  payload: unknown;
};

export type CortexOutput = {
  response: string;
  nextAction?: string;
  recommendation?: string;
  updatedState?: {
    snapshot: CortexSnapshot;
  };
};

type CortexSnapshot = {
  streak: number;
  level: number;
  xp: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  subjects: string[];
  frequentlyStudiedSubjects: string[];
  strongSubjects: string[];
  weakSubjects: string[];
  averageSessionDuration: number;
  totalStudySessions: number;
  averageExamScore: number;
  longestStreak: number;
  totalLessonsCompleted: number;
  totalStudyTimeMinutes: number;
  curriculumCompletionPercent?: number;
  currentLesson?: { id: string; title: string } | null;
  recommendedNextLesson?: { id: string; title: string } | null;
  completedLessonCount?: number;
  lockedLessonCount?: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asPositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

async function buildSnapshot(userId: string, memory = await getMemory(userId)): Promise<CortexSnapshot> {
  let curriculumState = null;
  try {
    curriculumState = await getCurriculumState(userId);
  } catch (error) {
    console.error("[cortex] failed to fetch curriculum state:", error);
  }

  const totalTasks = Math.max(0, memory.totalTasks ?? 0);
  const completedTasks = Math.min(totalTasks, Math.max(0, memory.completedTasks ?? 0));

  const snapshot: CortexSnapshot = {
    streak: Math.max(0, memory.streak ?? 0),
    level: Math.max(1, memory.level ?? 1),
    xp: Math.max(0, memory.xp ?? 0),
    totalTasks,
    completedTasks,
    pendingTasks: Math.max(0, totalTasks - completedTasks),
    subjects: memory.subjects ?? [],
    frequentlyStudiedSubjects: memory.frequentlyStudiedSubjects ?? [],
    strongSubjects: memory.strongSubjects ?? [],
    weakSubjects: memory.weakSubjects ?? [],
    averageSessionDuration: Math.max(0, memory.averageSessionDuration ?? 0),
    totalStudySessions: Math.max(0, memory.totalStudySessions ?? 0),
    averageExamScore: Math.max(0, memory.averageExamScore ?? 0),
    longestStreak: Math.max(0, memory.longestStreak ?? 0),
    totalLessonsCompleted: Math.max(0, memory.totalLessonsCompleted ?? 0),
    totalStudyTimeMinutes: Math.max(0, memory.totalStudyTimeMinutes ?? 0),
  };

  if (curriculumState) {
    snapshot.curriculumCompletionPercent = curriculumState.completionPercent;
    snapshot.currentLesson = curriculumState.currentLesson
      ? { id: curriculumState.currentLesson.id, title: curriculumState.currentLesson.title }
      : null;
    snapshot.recommendedNextLesson = curriculumState.recommendedNextLesson
      ? { id: curriculumState.recommendedNextLesson.id, title: curriculumState.recommendedNextLesson.title }
      : null;
    snapshot.completedLessonCount = curriculumState.completedLessons.length;
    snapshot.lockedLessonCount = curriculumState.lockedLessons.length;
  }

  return snapshot;
}

async function outputState(userId: string) {
  const memory = await getMemory(userId);
  return { snapshot: await buildSnapshot(userId, memory) };
}

export async function CortexCore(input: CortexInput): Promise<CortexOutput> {
  if (!input.userId?.trim()) {
    throw new Error("Cortex requires an authenticated user id");
  }

  const memory = await getMemory(input.userId);
  const snapshot = await buildSnapshot(input.userId, memory);
  const context = {
    level: memory.level,
    streak: memory.streak,
    weakTopics: memory.weakTopics,
    weakSubjects: memory.weakSubjects,
    strongSubjects: memory.strongSubjects,
    snapshot,
  };

  switch (input.type) {
    case "learn": {
      const payload = asRecord(input.payload);
      const topic = asString(payload.topic) ?? "your current topic";
      const response = await generateTutoringResponse(topic, context);

      // Update the streak before trackStudySession, because that tracker writes
      // lastStudyDate. Reversing the order would make every session look same-day.
      await updateStreak(input.userId, true);

      const subjectId = asString(payload.subjectId);
      const subjectName = asString(payload.subjectName);
      if (subjectId && subjectName) {
        await trackStudySession({
          userId: input.userId,
          subjectId,
          subjectName,
          durationMinutes: asPositiveNumber(payload.durationMinutes, 15),
          completedAt: new Date().toISOString(),
        });
      }

      await updateMemory(input.userId, { lastTopic: topic });
      const recommendation = await generateRecommendation(input.userId);

      return {
        response,
        nextAction: "continue_learning",
        recommendation,
        updatedState: await outputState(input.userId),
      };
    }

    case "practice": {
      const result = await scoreAnswer(asRecord(input.payload) as ScoreAnswerInput);
      await updateMemory(input.userId, {
        lastScore: result.score,
        weakTopics: result.weakTopics,
      });

      const recommendation = await generateRecommendation(input.userId);
      return {
        response: result.feedback,
        nextAction: result.score >= 80 ? "advance_or_recall" : "review_and_retry",
        recommendation,
        updatedState: await outputState(input.userId),
      };
    }

    case "exam": {
      const payload = asRecord(input.payload);
      const subject = asString(payload.subject);
      const score = payload.score;
      if (subject && typeof score === "number" && Number.isFinite(score)) {
        await trackExamResult({
          userId: input.userId,
          subject,
          score: Math.max(0, Math.min(100, score)),
          completedAt: new Date().toISOString(),
        });
      }

      const recommendation = await generateRecommendation(input.userId);
      return {
        response: "Exam mode activated. Good luck.",
        nextAction: "lock_learning_mode",
        recommendation,
        updatedState: await outputState(input.userId),
      };
    }

    case "feedback": {
      await updateMemory(input.userId, { feedback: input.payload });
      return {
        response: "Got it. I'm adjusting your learning path.",
        nextAction: "continue_learning",
        updatedState: await outputState(input.userId),
      };
    }

    default:
      throw new Error(`Unsupported Cortex action: ${String(input.type)}`);
  }
}
