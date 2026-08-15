import { getMemory, updateMemory } from "./memory";
import { scoreAnswer } from "./tools/scoring";
import { generateTutoringResponse } from "./tools/tutor";
import { getCurriculumState } from "@/lib/curriculum";
import { trackStudySession, trackExamResult, updateStreak, generateLearningInsight, generateRecommendation } from "./memoryTracker";

export type CortexInput = {
    userId: string;
    type: "learn" | "practice" | "exam" | "feedback";
    payload: any;
};

export type CortexOutput = {
    response: string;
    nextAction?: string;
    updatedState?: any;
};

export async function CortexCore(input: CortexInput): Promise<CortexOutput> {
    const memory = await getMemory(input.userId);

    // 1. Understand context
    // Fetch curriculum state once per Cortex request and adapt it into a lightweight summary.
    let curriculumState = null;
    try {
      curriculumState = await getCurriculumState(input.userId);
    } catch (e) {
      // Keep behavior safe if curriculum fetch fails
      console.error("[cortex] failed to fetch curriculum state:", e);
      curriculumState = null;
    }

    // Build a minimal snapshot that merges memory-derived fields and optional curriculum fields
    const snapshot: any = {
      streak: memory.streak,
      level: memory.level,
      xp: (memory as any).xp ?? 0,
      totalTasks: (memory as any).totalTasks ?? 0,
      completedTasks: (memory as any).completedTasks ?? 0,
      pendingTasks: ((memory as any).totalTasks ?? 0) - ((memory as any).completedTasks ?? 0),
      subjects: (memory as any).subjects ?? [],
      // Add persistent memory insights
      frequentlyStudiedSubjects: memory.frequentlyStudiedSubjects,
      strongSubjects: memory.strongSubjects,
      weakSubjects: memory.weakSubjects,
      averageSessionDuration: memory.averageSessionDuration,
      totalStudySessions: memory.totalStudySessions,
      averageExamScore: memory.averageExamScore,
      longestStreak: memory.longestStreak,
      totalLessonsCompleted: memory.totalLessonsCompleted,
      totalStudyTimeMinutes: memory.totalStudyTimeMinutes,
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

    const context = {
        level: memory.level,
        streak: memory.streak,
        weakTopics: memory.weakTopics,
        weakSubjects: memory.weakSubjects,
        strongSubjects: memory.strongSubjects,
        snapshot,
    };

    // 2. Route intent (SINGLE DECISION POINT)
    switch (input.type) {
        case "learn": {
            const response = await generateTutoringResponse(
                input.payload.topic,
                context
            );

            // Update streak BEFORE trackStudySession. trackStudySession
            // writes lastStudyDate = now, so calling it first would make
            // updateStreak's own lastStudyDate read always equal "today" --
            // meaning it always took the "already studied today, no change"
            // branch and the streak counter could never actually increment.
            // Verified via direct read of both functions on 2026-08-13.
            await updateStreak(input.userId, true);

            // Track study session for persistent memory
            if (input.payload.subjectId && input.payload.subjectName) {
                await trackStudySession({
                    userId: input.userId,
                    subjectId: input.payload.subjectId,
                    subjectName: input.payload.subjectName,
                    durationMinutes: input.payload.durationMinutes || 15,
                    completedAt: new Date().toISOString(),
                });
            }

            await updateMemory(input.userId, {
                lastTopic: input.payload.topic,
            });

            return {
                response,
                nextAction: "continue_learning",
                updatedState: { snapshot },
            };
        }

        case "practice": {
            const result = await scoreAnswer(input.payload);

            await updateMemory(input.userId, {
                lastScore: result.score,
                weakTopics: result.weakTopics,
            });

            return {
                response: result.feedback,
                nextAction: "adjust_difficulty",
                updatedState: { snapshot },
            };
        }

        case "exam": {
            // Track exam result for persistent memory
            if (input.payload.subject && input.payload.score !== undefined) {
                await trackExamResult({
                    userId: input.userId,
                    subject: input.payload.subject,
                    score: input.payload.score,
                    completedAt: new Date().toISOString(),
                });
            }

            return {
                response: "Exam mode activated. Good luck.",
                nextAction: "lock_learning_mode",
                updatedState: { snapshot },
            };
        }

        case "feedback": {
            await updateMemory(input.userId, {
                feedback: input.payload,
            });

            return {
                response: "Got it. I'm adjusting your learning path.",
                updatedState: { snapshot },
            };
        }

        default:
            return {
                response: "Unknown cortex action.",
                updatedState: { snapshot },
            };
    }
}