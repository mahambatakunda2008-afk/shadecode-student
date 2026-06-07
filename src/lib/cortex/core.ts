import { getMemory, updateMemory } from "./memory";
import { scoreAnswer } from "./tools/scoring";
import { generateTutoringResponse } from "./tools/tutor";

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
    const context = {
        level: memory.level,
        streak: memory.streak,
        weakTopics: memory.weakTopics,
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
            };
        }

        case "feedback": {
            await updateMemory(input.userId, {
                feedback: input.payload,
            });

            return {
                response: "Got it. I’m adjusting your learning path.",
            };
        }

        case "exam": {
            return {
                response: "Exam mode activated. Good luck.",
                nextAction: "lock_learning_mode",
            };
        }

        default:
            return {
                response: "Unknown cortex action.",
            };
    }
}