import { getMemory, updateMemory } from "./memory";
import { scoreAnswer } from "./scoring";
import { generateTutoringResponse } from "./tutor";
import { getCurriculumState } from "@/lib/curriculum";

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
        snapshot,
    };

    // 2. Route intent (SINGLE DECISION POINT)
    switch (input.type) {
        case "learn": {
            const response = await generateTutoringResponse(
                input.payload.topic,
                context
            );

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

        case "feedback": {
            await updateMemory(input.userId, {
                feedback: input.payload,
            });

            return {
                response: "Got it. I’m adjusting your learning path.",
                updatedState: { snapshot },
            };
        }

        case "exam": {
            return {
                response: "Exam mode activated. Good luck.",
                nextAction: "lock_learning_mode",
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