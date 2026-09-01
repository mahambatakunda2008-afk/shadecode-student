import type { LearningObservation } from "@/lib/cortex/learningState";
import type { LearningEvent } from "./learningEvents";

/**
 * Translate canonical product events into the small Cortex/SLS observation
 * contract. The canonical event stream remains authoritative; this is an
 * adapter only, so product surfaces do not need to know Cortex internals.
 */
export function learningEventToObservation(
  event: LearningEvent,
): LearningObservation | null {
  if (!event.topicId) return null;

  const correct = readBoolean(event.metadata.correct);
  const evidenceScore = readNumber(event.metadata.evidenceScore ?? event.metadata.percentage);
  const confidence = readNumber(event.metadata.confidence);
  const responseSeconds = readNumber(event.metadata.responseSeconds);
  const difficulty = readNumber(event.metadata.difficulty);

  switch (event.kind) {
    case "question_attempted":
      return {
        topicId: event.topicId,
        correct: correct ?? false,
        evidenceScore,
        confidence,
        responseSeconds,
        difficulty,
        observedAt: event.occurredAt,
      };

    case "lesson_completed":
    case "quiz_completed":
    case "exam_completed":
    case "project_stage_completed":
      return {
        topicId: event.topicId,
        correct: correct ?? true,
        evidenceScore,
        confidence,
        responseSeconds,
        difficulty,
        observedAt: event.occurredAt,
      };

    case "mistake_reviewed":
      return {
        topicId: event.topicId,
        correct: true,
        evidenceScore,
        confidence,
        responseSeconds,
        difficulty,
        observedAt: event.occurredAt,
      };

    default:
      return null;
  }
}

function readNumber(value: string | number | boolean | null | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readBoolean(value: string | number | boolean | null | undefined): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
}
