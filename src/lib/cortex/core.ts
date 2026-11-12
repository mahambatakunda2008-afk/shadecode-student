import { getMemory, updateMemory } from "./memory";
import { resolveAuthenticatedCortexStudentContext } from "./student-context";
import { scoreAnswer, type ScoreAnswerInput } from "./tools/scoring";
import { generateTutoringResponse } from "./tools/tutor";
import { getCurriculumState } from "@/lib/curriculum";
import type { SystemCurriculumContext } from "@/lib/curriculum/system-curriculum-context";
import { trackExamResult, generateRecommendation } from "./memoryTracker";

export type CortexInput = {
  userId: string;
  /** Verified by Supabase Auth before being used for RLS-scoped learner reads. */
  accessToken?: string;
  type: "learn" | "practice" | "exam" | "feedback";
  payload: unknown;
  /** Exact verified curriculum context resolved by the API gateway. */
  curriculum?: SystemCurriculumContext | null;
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

async function buildSnapshot(userId: string, memory?: Awaited<ReturnType<typeof getMemory>>): Promise<CortexSnapshot> {
  const resolvedMemory = memory ?? await getMemory(userId);
  let curriculumState = null;
  try {
    curriculumState = await getCurriculumState(userId);
  } catch (error) {
    console.error("[cortex] failed to fetch curriculum state:", error);
  }

  const totalTasks = Math.max(0, resolvedMemory.totalTasks ?? 0);
  const completedTasks = Math.min(totalTasks, Math.max(0, resolvedMemory.completedTasks ?? 0));

  const snapshot: CortexSnapshot = {
    streak: Math.max(0, resolvedMemory.streak ?? 0),
    level: Math.max(1, resolvedMemory.level ?? 1),
    xp: Math.max(0, resolvedMemory.xp ?? 0),
    totalTasks,
    completedTasks,
    pendingTasks: Math.max(0, totalTasks - completedTasks),
    subjects: resolvedMemory.subjects ?? [],
    frequentlyStudiedSubjects: resolvedMemory.frequentlyStudiedSubjects ?? [],
    strongSubjects: resolvedMemory.strongSubjects ?? [],
    weakSubjects: resolvedMemory.weakSubjects ?? [],
    averageSessionDuration: Math.max(0, resolvedMemory.averageSessionDuration ?? 0),
    totalStudySessions: Math.max(0, resolvedMemory.totalStudySessions ?? 0),
    averageExamScore: Math.max(0, resolvedMemory.averageExamScore ?? 0),
    longestStreak: Math.max(0, resolvedMemory.longestStreak ?? 0),
    totalLessonsCompleted: Math.max(0, resolvedMemory.totalLessonsCompleted ?? 0),
    totalStudyTimeMinutes: Math.max(0, resolvedMemory.totalStudyTimeMinutes ?? 0),
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
  return { snapshot: await buildSnapshot(userId) };
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
    curriculum: input.curriculum ?? null,
  };

  switch (input.type) {
    case "learn": {
      const payload = asRecord(input.payload);
      const topic = asString(payload.topic) ?? "your current topic";
      const subjectId = asString(payload.subjectId);
      const subjectName = asString(payload.subjectName);
      let studentContext = null;
      try {
        studentContext = await resolveAuthenticatedCortexStudentContext(input.accessToken);
      } catch (error) {
        // Saved progress remains usable even if the learner-context read is temporarily unavailable.
        console.error("[cortex] learner context unavailable; continuing without cross-session topic evidence:", error);
      }
      const response = await generateTutoringResponse(topic, {
        ...context,
        studentContext,
        subjectId,
        subjectName,
      });

      // Remember the topic for continuity, but do not treat opening an
      // explanation as a completed session or streak event.
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
      const practicePayload = asRecord(input.payload);
      const practiceTopic = asString(practicePayload.topic);
      const practiceSubject = asString(practicePayload.subjectName) ?? asString(practicePayload.subject);
      if (result.score !== null) {
        await updateMemory(input.userId, {
          lastPracticeScore: result.score,
          ...(practiceTopic ? { lastPracticeTopic: practiceTopic } : {}),
          ...(practiceSubject ? { lastPracticeSubject: practiceSubject } : {}),
          ...(input.curriculum?.identity.syllabusId
            ? { lastPracticeSyllabusId: input.curriculum.identity.syllabusId }
            : {}),
          weakTopics: result.weakTopics,
        });
      } else if (practiceTopic) {
        // Preserve study continuity without recording an unverified score.
        await updateMemory(input.userId, { lastTopic: practiceTopic });
      }

      const recommendation = await generateRecommendation(input.userId);
      return {
        response: result.feedback,
        nextAction: result.needsReview
          ? "review_with_marking_guide"
          : result.score !== null && result.score >= 80
            ? "advance_or_recall"
            : "review_and_retry",
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
      const feedbackPayload = asRecord(input.payload);
      const feedbackText = typeof input.payload === "string"
        ? input.payload.trim()
        : asString(feedbackPayload.feedback) ?? asString(feedbackPayload.message);
      if (feedbackText) {
        await updateMemory(input.userId, { feedback: feedbackText.slice(0, 500) });
      }
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
